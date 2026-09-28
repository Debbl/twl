import type { Rule, Scope } from 'eslint'
import type {
  Identifier,
  ImportDeclaration,
  ImportNamespaceSpecifier,
  Program,
  TaggedTemplateExpression,
} from 'estree'

/** The macro exports twl compiles. */
export type MacroName = 'cn' | 'clsx' | 'twMerge'

const MACRO_NAMES: readonly string[] = ['cn', 'clsx', 'twMerge']

/** Settings shared by every rule, read from `settings.twl`. */
export interface TwlSettings {
  /** Module specifiers exposing the macro API, as the compiler's `from`. */
  from: string[]
  /** Tailwind CSS entry stylesheet, resolved from the ESLint cwd. */
  stylesheet?: string
}

const DEFAULT_FROM = ['twl/macro']

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

export function readSettings(context: Rule.RuleContext): TwlSettings {
  const raw: unknown = context.settings.twl
  const settings =
    raw !== null && typeof raw === 'object'
      ? (raw as Record<string, unknown>)
      : {}

  return {
    from: isStringArray(settings.from) ? settings.from : DEFAULT_FROM,
    stylesheet:
      typeof settings.stylesheet === 'string' ? settings.stylesheet : undefined,
  }
}

export interface MacroImports {
  /** Local name to the macro it is bound to, aliases included. */
  locals: Map<string, MacroName>
  namespaces: ImportNamespaceSpecifier[]
}

/** `import type { cn }` and `import { type cn }` bind no value. */
function isTypeOnly(node: object) {
  return 'importKind' in node && node.importKind === 'type'
}

/**
 * The macro bindings a module imports. The import binding is what counts, so
 * `import { cn as c }` is found and a `cn` from another library is not.
 */
export function collectMacroImports(
  program: Program,
  from: readonly string[],
): MacroImports {
  const locals = new Map<string, MacroName>()
  const namespaces: ImportNamespaceSpecifier[] = []

  for (const statement of program.body) {
    if (statement.type !== 'ImportDeclaration') continue
    if (!from.includes(String(statement.source.value))) continue
    if (isTypeOnly(statement)) continue

    for (const specifier of statement.specifiers) {
      if (specifier.type === 'ImportNamespaceSpecifier') {
        namespaces.push(specifier)
        continue
      }
      if (specifier.type !== 'ImportSpecifier' || isTypeOnly(specifier)) {
        continue
      }

      const imported =
        specifier.imported.type === 'Identifier'
          ? specifier.imported.name
          : String(specifier.imported.value)
      if (MACRO_NAMES.includes(imported)) {
        locals.set(specifier.local.name, imported as MacroName)
      }
    }
  }

  return { locals, namespaces }
}

function findVariable(scope: Scope.Scope | null, name: string) {
  for (let current = scope; current !== null; current = current.upper) {
    const variable = current.set.get(name)
    if (variable !== undefined) return variable
  }
  return undefined
}

/** Whether a variable is the import binding of a macro module. */
export function isMacroImportBinding(
  variable: Scope.Variable,
  from: readonly string[],
) {
  return variable.defs.some(
    (def) =>
      def.type === 'ImportBinding' &&
      from.includes(String((def.parent as ImportDeclaration).source.value)),
  )
}

/**
 * The macro a tagged template is compiled with, if any. The tag must resolve
 * to the import itself: a shadowing local is not the macro.
 */
export function macroOf(
  context: Rule.RuleContext,
  node: TaggedTemplateExpression,
  imports: MacroImports,
  from: readonly string[],
): MacroName | undefined {
  if (node.tag.type !== 'Identifier') return undefined

  const tag: Identifier = node.tag
  const macro = imports.locals.get(tag.name)
  if (macro === undefined) return undefined

  const variable = findVariable(context.sourceCode.getScope(node), tag.name)
  return variable !== undefined && isMacroImportBinding(variable, from)
    ? macro
    : undefined
}
