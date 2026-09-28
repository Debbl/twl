import { collectMacroImports, macroOf, readSettings } from '../macro'
import { scanTemplate } from '../tokenize'
import type { Rule } from 'eslint'
import type { MacroImports } from '../macro'

/** A `//` comment runs to the end of the line, taking any interpolation with it. */
export const noInterpolationInComment: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow interpolations inside `//` comments of twl templates.',
      recommended: true,
    },
    schema: [],
    messages: {
      commented:
        'This interpolation sits inside a `//` comment, so it would be dropped. Move it out of the comment.',
    },
  },
  create(context) {
    const { from } = readSettings(context)
    let imports: MacroImports | undefined

    return {
      Program(program) {
        imports = collectMacroImports(program, from)
      },
      TaggedTemplateExpression(node) {
        if (imports === undefined || imports.locals.size === 0) return
        if (macroOf(context, node, imports, from) === undefined) return

        const { quasis, expressions } = node.quasi
        // The runtime reads cooked text, so that is what decides the comments.
        const parts = quasis.map(
          (quasi) => quasi.value.cooked ?? quasi.value.raw,
        )

        for (const index of scanTemplate(parts).commented) {
          const expression = expressions[index]
          if (expression === undefined) continue
          context.report({ node: expression, messageId: 'commented' })
        }
      },
    }
  },
}
