import { resolve } from 'node:path'
import { collectMacroImports, macroOf, readSettings } from '../macro'
import { getClassOrder } from '../order'
import { sortClasses } from '../sort'
import { scanTemplate } from '../tokenize'
import type { Rule } from 'eslint'
import type { TemplateElement } from 'estree'
import type { MacroImports } from '../macro'
import type { ClassToken } from '../tokenize'

interface Group {
  tokens: ClassToken[]
  /** Source text of the template part the tokens index into. */
  text: string
  /** Offset of that text in the file. */
  offset: number
}

let warnedMissingStylesheet = false
let warnedLoadFailure = false

/** Offset of a quasi's raw text, past the opening '`' or '}'. */
function rawOffset(text: string, quasi: TemplateElement) {
  const offset = (quasi.range?.[0] ?? -1) + 1
  const { raw } = quasi.value
  return offset > 0 && text.startsWith(raw, offset) ? offset : undefined
}

/**
 * Rebuilds a group with its classes in the new order, keeping every gap
 * where it was so line breaks and indentation survive. Dropped duplicates
 * take the trailing gaps with them.
 */
function rebuild(group: Group, sorted: string[]) {
  let result = ''
  for (const [index, value] of sorted.entries()) {
    if (index > 0) {
      const previous = group.tokens[index - 1]!
      const next = group.tokens[index]!
      result += group.text.slice(previous.end, next.start)
    }
    result += value
  }
  return result
}

/**
 * Sorts classes in twl templates by Tailwind's order, within each group: a
 * `//` comment, an interpolation, or a blank line starts a new group, and no
 * class ever moves past one.
 */
export const sortClassesRule: Rule.RuleModule = {
  meta: {
    type: 'layout',
    fixable: 'code',
    docs: {
      description:
        'Sort Tailwind classes in twl templates, within each comment group.',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: { preserveDuplicates: { type: 'boolean' } },
        additionalProperties: false,
      },
    ],
    messages: {
      unsorted: 'These classes are not in Tailwind order.',
    },
  },
  create(context) {
    const { from, stylesheet } = readSettings(context)
    const [options] = context.options as Array<
      { preserveDuplicates?: boolean } | undefined
    >
    const preserveDuplicates = options?.preserveDuplicates ?? false
    const { text } = context.sourceCode
    const groups: Group[] = []
    let imports: MacroImports | undefined

    return {
      'Program': (program) => {
        imports = collectMacroImports(program, from)
      },
      'TaggedTemplateExpression': (node) => {
        if (imports === undefined || imports.locals.size === 0) return
        if (macroOf(context, node, imports, from) === undefined) return

        const { quasis } = node.quasi
        // Escapes make raw and cooked text disagree; leave those alone.
        if (quasis.some((quasi) => quasi.value.raw.includes('\\'))) return

        const offsets = quasis.map((quasi) => rawOffset(text, quasi))
        if (offsets.includes(undefined)) return

        const parts = quasis.map((quasi) => quasi.value.raw)
        for (const tokens of scanTemplate(parts).groups) {
          const part = tokens[0]!.part
          groups.push({ tokens, text: parts[part]!, offset: offsets[part]! })
        }
      },
      'Program:exit': () => {
        if (groups.length === 0) return

        if (stylesheet === undefined) {
          if (!warnedMissingStylesheet) {
            warnedMissingStylesheet = true
            console.warn(
              '[eslint-plugin-twl] `twl/sort-classes` needs `settings.twl.stylesheet`, the Tailwind CSS entry file. Skipping.',
            )
          }
          return
        }

        const classes = [
          ...new Set(
            groups.flatMap(({ tokens }) => tokens.map((t) => t.value)),
          ),
        ]
        let orders: Array<bigint | null>
        try {
          orders = getClassOrder(resolve(context.cwd, stylesheet), classes)
        } catch (error) {
          if (!warnedLoadFailure) {
            warnedLoadFailure = true
            console.warn(
              `[eslint-plugin-twl] could not load the Tailwind design system for \`twl/sort-classes\`: ${String(error)}`,
            )
          }
          return
        }
        const orderOf = new Map(
          classes.map((value, index) => [value, orders[index] ?? null]),
        )

        for (const group of groups) {
          const current = group.tokens.map((token) => token.value)
          const sorted = sortClasses(
            current.map((value) => ({
              value,
              order: orderOf.get(value) ?? null,
            })),
            { preserveDuplicates },
          )
          if (sorted.join(' ') === current.join(' ')) continue

          const first = group.tokens[0]!
          const last = group.tokens.at(-1)!
          const range: [number, number] = [
            group.offset + first.start,
            group.offset + last.end,
          ]

          context.report({
            loc: {
              start: context.sourceCode.getLocFromIndex(range[0]),
              end: context.sourceCode.getLocFromIndex(range[1]),
            },
            messageId: 'unsorted',
            fix: (fixer) =>
              fixer.replaceTextRange(range, rebuild(group, sorted)),
          })
        }
      },
    }
  },
}
