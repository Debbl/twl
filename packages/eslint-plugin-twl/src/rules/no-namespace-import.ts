import { collectMacroImports, readSettings } from '../macro'
import type { Rule } from 'eslint'

/** The compiler resolves macros by name, so a namespace import cannot be compiled. */
export const noNamespaceImport: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow namespace imports of the twl macro module.',
      recommended: true,
    },
    schema: [],
    messages: {
      namespace:
        "`import * as {{name}} from '{{request}}'` cannot be compiled. Import `cn`, `clsx`, or `twMerge` by name instead.",
    },
  },
  create(context) {
    const { from } = readSettings(context)

    return {
      Program(program) {
        for (const specifier of collectMacroImports(program, from).namespaces) {
          const declaration = context.sourceCode.getAncestors(specifier).at(-1)
          context.report({
            node: specifier,
            messageId: 'namespace',
            data: {
              name: specifier.local.name,
              request:
                declaration?.type === 'ImportDeclaration'
                  ? String(declaration.source.value)
                  : '',
            },
          })
        }
      },
    }
  },
}
