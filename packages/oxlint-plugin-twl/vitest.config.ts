import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // Test the rules from source, so no build is needed first.
      'eslint-plugin-twl': fileURLToPath(
        new URL('../eslint-plugin-twl/src/index.ts', import.meta.url),
      ),
    },
  },
})
