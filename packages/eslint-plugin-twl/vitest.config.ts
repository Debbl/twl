import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // Parity tests run against the compiler's own normalization, from source.
      'twl/compiler': fileURLToPath(
        new URL('../twl/src/compiler/index.ts', import.meta.url),
      ),
    },
  },
})
