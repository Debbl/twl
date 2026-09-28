import eslintPlugin from 'eslint-plugin-twl'
import type { OxlintConfig } from 'oxlint'

/**
 * The rules are the ESLint plugin's own objects: Oxlint runs ESLint rules
 * through its JS plugin API, so there is one implementation for both linters.
 */
type RuleName =
  | 'no-interpolation-in-comment'
  | 'no-namespace-import'
  | 'no-shadowed-macro'
  | 'sort-classes'

// Typed without ESLint's types, which Oxlint users need not have installed.
const plugin: {
  meta: { name: string }
  rules: Readonly<Record<RuleName, object>>
  configs: { recommended: OxlintConfig }
} = {
  meta: { name: 'oxlint-plugin-twl' },
  rules: eslintPlugin.rules,
  configs: {
    recommended: {
      jsPlugins: ['oxlint-plugin-twl'],
      rules: {
        'twl/no-interpolation-in-comment': 'error',
        'twl/no-namespace-import': 'error',
        'twl/no-shadowed-macro': 'error',
        'twl/sort-classes': 'warn',
      },
    },
  },
}

export default plugin
