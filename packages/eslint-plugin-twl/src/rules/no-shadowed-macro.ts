import {
  collectMacroImports,
  isMacroImportBinding,
  readSettings,
} from '../macro'
import type { Rule } from 'eslint'

/** Declarations that bind a value, which is what the compiler refuses to shadow. */
const VALUE_DEFINITIONS = new Set([
  'Variable',
  'FunctionName',
  'ClassName',
  'Parameter',
  'CatchClause',
])

/**
 * A local binding named like an imported macro makes some references in the
 * file mean something else, so the compiler refuses the whole file.
 */
export const noShadowedMacro: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow local bindings that shadow an imported twl macro.',
      recommended: true,
    },
    schema: [],
    messages: {
      shadowed:
        '`{{name}}` shadows the `{{macro}}` macro imported from twl, so this file cannot be compiled. Rename the local binding.',
    },
  },
  create(context) {
    const { from } = readSettings(context)

    return {
      'Program:exit': (program) => {
        const { locals } = collectMacroImports(program, from)
        if (locals.size === 0) return

        for (const scope of context.sourceCode.scopeManager.scopes) {
          for (const variable of scope.variables) {
            const macro = locals.get(variable.name)
            if (macro === undefined || isMacroImportBinding(variable, from)) {
              continue
            }

            for (const def of variable.defs) {
              if (!VALUE_DEFINITIONS.has(def.type)) continue
              context.report({
                node: def.name,
                messageId: 'shadowed',
                data: { name: variable.name, macro },
              })
            }
          }
        }
      },
    }
  },
}
