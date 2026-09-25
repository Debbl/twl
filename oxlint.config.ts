import { oxlint } from '@debbl/oxc-config'
import { defineConfig } from 'oxlint'

export default defineConfig({
  extends: [oxlint({ react: true })],
  ignorePatterns: [
    // Next.js rewrites this on every build.
    '**/next-env.d.ts',
    // Compiler test fixtures: inputs are standalone snippets and outputs are
    // emitted code, written by `vitest run -u` - not ours to lint.
    '**/test/fixtures/**',
  ],
  rules: {
    // Every `.sort()` here runs on an array the same expression just built -
    // `readdirSync(...).filter(...).sort()` - so there is no original to
    // protect and `toSorted()` would only add a copy.
    'unicorn/no-array-sort': 'off',
  },
  overrides: [
    {
      // The Next.js rules only mean anything where Next actually runs.
      files: ['apps/website/**', 'playground/nextjs/**'],
      plugins: ['nextjs'],
      rules: {
        // Next's own file conventions export `metadata` and `viewport`
        // alongside the component, which is what the `next` variant allows.
        'react/only-export-components': oxlint({ next: true }).rules![
          'react/only-export-components'
        ],
      },
    },
    {
      // A webpack loader is called with a `this` the bundler supplies; that is
      // the whole interface, and Turbopack accepts no other shape.
      files: ['**/integrations/next/loader.ts'],
      rules: {
        'oxc/no-this-in-exported-function': 'off',
      },
    },
    {
      files: ['**/test/**'],
      rules: {
        // Tests embed source snippets and expected compiled output; `${name}`
        // in a regular string is the fixture text, not a missed template.
        'no-template-curly-in-string': 'off',
        // The compiler suites are table-driven: one case per fixture on disk,
        // so the title is the directory name rather than a literal.
        'vitest/valid-title': 'off',
        // A fixture that exports no value has nothing to compare, and one
        // without interpolation is held to a stricter assertion than one with.
        'vitest/no-conditional-expect': 'off',
      },
    },
  ],
})
