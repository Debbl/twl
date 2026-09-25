import { twMerge } from 'cn'
import MagicString from 'magic-string'
import { parseSync } from 'oxc-parser'
import {
  declaredNames,
  isNonReferencePosition,
  resolveMacroBindings,
} from './bindings'
import { compileTemplate } from './emit'
import { isProvablyString } from './expressions'
import { lineAt, walk } from './walk'
import type { StaticImport } from './bindings'
import type { Node, TransformOptions, TransformResult } from './types'

const DEFAULT_FROM = ['twl/macro']
const EXPORT_NAMES = ['cls', 'tw'] as const
const RUNTIME_MODULE = 'twl'

/**
 * Local names the injected runtime helpers are bound to. Deliberately not
 * spellable by hand, so injecting them can never shadow or collide with the
 * module's own names - including its own `clsx` import, if it has one.
 */
const CLSX_LOCAL = '__twl_clsx'
const TW_MERGE_LOCAL = '__twl_twMerge'

const LANGS = {
  js: 'js',
  jsx: 'jsx',
  mjs: 'js',
  cjs: 'js',
  ts: 'ts',
  tsx: 'tsx',
  mts: 'ts',
  cts: 'ts',
} as const

function langOf(filename: string) {
  const extension = filename.split('?')[0]?.split('.').pop() ?? ''
  return LANGS[extension as keyof typeof LANGS] ?? 'tsx'
}

/** End offset of the directive prologue, which nothing may be inserted before. */
function directivePrologueEnd(body: Node[]) {
  let end = 0

  for (const statement of body) {
    if (
      statement.type !== 'ExpressionStatement' ||
      typeof statement.directive !== 'string'
    ) {
      break
    }

    end = statement.end as number
  }

  return end
}

function fail(code: string, filename: string, offset: number, message: string) {
  return new Error(`${filename}:${lineAt(code, offset)} ${message}`)
}

/**
 * Rewrites every `cls` and `tw` tagged template to the class string it would
 * have produced at runtime, and drops the macro import.
 *
 * Returns `null` when the file has nothing to compile, so callers can hand
 * back the original source untouched.
 */
export function transform(
  code: string,
  filename: string,
  options: TransformOptions = {},
): TransformResult | null {
  const from = options.from ?? DEFAULT_FROM

  // A macro has to be imported to be used, so a file that never names the
  // module cannot contain one. This is worth doing before anything else: it
  // settles most files in a fraction of a microsecond, where parsing them
  // would cost a hundred.
  if (!from.some((specifier) => code.includes(specifier))) return null

  const parsed = parseSync(filename, code, {
    sourceType: 'module',
    lang: langOf(filename),
  })

  const { locals, imports, namespaces } = resolveMacroBindings({
    code,
    staticImports: parsed.module.staticImports as unknown as StaticImport[],
    from,
    exportNames: EXPORT_NAMES,
  })

  const [namespace] = namespaces
  if (namespace !== undefined) {
    throw fail(
      code,
      filename,
      namespace.start,
      `\`import * as ${namespace.name} from '${namespace.request}'\` cannot be compiled. Import \`cls\` or \`tw\` by name instead.`,
    )
  }

  if (locals.size === 0) return null

  const source = new MagicString(code)
  const templates: Array<{ start: number; end: number; code: string }> = []
  let usesClsx = false
  let usesTwMerge = false
  let shadow: { name: string; start: number } | undefined
  let misuse: { name: string; start: number } | undefined

  walk(parsed.program, (node, parent) => {
    // A local binding of the same name would make some references in this file
    // mean something else. Rather than guess which, refuse the file.
    for (const name of declaredNames(node)) {
      if (locals.has(name) && shadow === undefined) {
        shadow = { name, start: node.start as number }
      }
    }

    if (node.type === 'TaggedTemplateExpression') {
      const tag = node.tag as Node
      if (tag.type !== 'Identifier') return
      const macro = locals.get(tag.name as string)
      if (macro === undefined) return

      const quasi = node.quasi as Node
      const quasis = quasi.quasis as Node[]
      const expressions = quasi.expressions as Node[]

      const cooked = quasis.map(
        (element) => (element.value as { cooked: string | null }).cooked,
      )
      // `cooked` is null only for an escape the runtime could not read either.
      if (cooked.includes(null)) return

      const compiled = compileTemplate({
        cooked: cooked as string[],
        expressions: expressions.map((expression) => ({
          text: code.slice(
            expression.start as number,
            expression.end as number,
          ),
          isString: isProvablyString(expression),
        })),
        clsxLocal: CLSX_LOCAL,
      })

      if (compiled.dropped.length > 0) {
        const first = expressions[compiled.dropped[0]!]!
        throw fail(
          code,
          filename,
          first.start as number,
          'this interpolation sits inside a `//` comment, so it would be dropped. Move it out of the comment.',
        )
      }

      usesClsx ||= compiled.usesClsx

      let replacement = compiled.code

      if (macro === 'tw') {
        if (compiled.constant === undefined) {
          // Nothing to merge until the interpolations have values.
          usesTwMerge = true
          replacement = `${TW_MERGE_LOCAL}(${replacement})`
        } else {
          // `tw` is wired to one fixed `twMerge`, with no configuration a user
          // could change, so merging now is the same as merging at runtime.
          replacement = JSON.stringify(twMerge(compiled.constant))
        }
      }

      templates.push({
        start: node.start as number,
        end: node.end as number,
        code: replacement,
      })
      return
    }

    // Everything else that names the macro: the import is about to be removed,
    // so a surviving reference would become a ReferenceError at runtime.
    if (
      node.type === 'Identifier' &&
      locals.has(node.name as string) &&
      !isNonReferencePosition(parent, node) &&
      parent?.type !== 'TaggedTemplateExpression' &&
      parent?.type !== 'ImportSpecifier' &&
      misuse === undefined
    ) {
      misuse = { name: node.name as string, start: node.start as number }
    }
  })

  if (shadow !== undefined) {
    throw fail(
      code,
      filename,
      shadow.start,
      `\`${shadow.name}\` is declared here but is also imported from ${from[0]}. Rename one of them.`,
    )
  }

  if (misuse !== undefined) {
    throw fail(
      code,
      filename,
      misuse.start,
      `\`${misuse.name}\` can only be used as a template tag, as in \`${misuse.name}\`…\`\`.`,
    )
  }

  if (templates.length === 0) return null

  for (const template of templates) {
    source.overwrite(template.start, template.end, template.code)
  }

  for (const declaration of imports) {
    if (declaration.kept.length === 0) {
      const end =
        code[declaration.end] === '\n' ? declaration.end + 1 : declaration.end
      source.remove(declaration.start, end)
      continue
    }

    // The module may also carry values the file really uses; keep those.
    source.overwrite(
      declaration.start,
      declaration.end,
      `import { ${declaration.kept.join(', ')} } from ${declaration.request}`,
    )
  }

  const helpers = [
    ...(usesClsx ? [`clsx as ${CLSX_LOCAL}`] : []),
    ...(usesTwMerge ? [`twMerge as ${TW_MERGE_LOCAL}`] : []),
  ]

  if (helpers.length > 0) {
    const statement = `import { ${helpers.join(', ')} } from '${RUNTIME_MODULE}';`
    const directiveEnd = directivePrologueEnd(
      parsed.program.body as unknown as Node[],
    )

    // A `'use client'` directive only counts while nothing precedes it, so an
    // injected import has to land after the prologue rather than at the top.
    if (directiveEnd === 0) {
      source.prepend(`${statement}\n`)
    } else {
      source.appendLeft(directiveEnd, `\n${statement}`)
    }
  }

  return {
    code: source.toString(),
    map: source.generateMap({ hires: true, source: filename }),
  }
}
