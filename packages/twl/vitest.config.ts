import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      'twl/runtime': fileURLToPath(new URL('src/runtime.ts', import.meta.url)),
      // Execute input fixtures against the explicit runtime entry for parity.
      // The actual macro module has declarations only.
      'twl/macro': fileURLToPath(new URL('src/index.ts', import.meta.url)),
      'twl': fileURLToPath(new URL('src/index.ts', import.meta.url)),
      '~': fileURLToPath(new URL('src', import.meta.url)),
    },
  },
})
