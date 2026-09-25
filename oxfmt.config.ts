import { oxfmt } from '@debbl/oxc-config'

export default oxfmt({
  ignorePatterns: [
    // Compiler test fixtures: inputs are standalone snippets and outputs are
    // emitted code, written by `vitest run -u` - not ours to format.
    '**/test/fixtures/**',
  ],
})
