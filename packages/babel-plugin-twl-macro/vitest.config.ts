import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      twl: fileURLToPath(new URL('../twl/src/index.ts', import.meta.url)),
    },
  },
})
