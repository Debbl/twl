import { noInterpolationInComment } from './rules/no-interpolation-in-comment'
import { noNamespaceImport } from './rules/no-namespace-import'
import { noShadowedMacro } from './rules/no-shadowed-macro'
import { sortClassesRule } from './rules/sort-classes'
import type { ESLint, Linter, Rule } from 'eslint'

const rules = {
  'no-interpolation-in-comment': noInterpolationInComment,
  'no-namespace-import': noNamespaceImport,
  'no-shadowed-macro': noShadowedMacro,
  'sort-classes': sortClassesRule,
} satisfies Record<string, Rule.RuleModule>

const plugin = {
  meta: { name: 'eslint-plugin-twl' },
  rules,
  configs: {} as { recommended: Linter.Config },
} satisfies ESLint.Plugin

plugin.configs.recommended = {
  name: 'twl/recommended',
  plugins: { twl: plugin },
  rules: {
    'twl/no-interpolation-in-comment': 'error',
    'twl/no-namespace-import': 'error',
    'twl/no-shadowed-macro': 'error',
    'twl/sort-classes': 'warn',
  },
}

export default plugin
