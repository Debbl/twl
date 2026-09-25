import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // Fixtures import the macro entry; in tests it resolves to the runtime,
      // which is what an uncompiled build gets too.
      'twl/macro': fileURLToPath(new URL('src/macro.ts', import.meta.url)),
      'twl': fileURLToPath(new URL('src/index.ts', import.meta.url)),
      '~': fileURLToPath(new URL('src', import.meta.url)),
    },
  },
})
