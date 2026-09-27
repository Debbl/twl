import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      'twl/runtime': fileURLToPath(
        new URL('../twl/src/runtime.ts', import.meta.url),
      ),
      'twl/compiler': fileURLToPath(
        new URL('../twl/src/compiler/index.ts', import.meta.url),
      ),
      'twl': fileURLToPath(new URL('../twl/src/index.ts', import.meta.url)),
    },
  },
})
