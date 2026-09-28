import { defineConfig } from 'tsdown'

// The worker is its own entry: synckit starts it from a file path, next to
// the bundled `index.mjs`.
export default defineConfig({
  entry: ['src/index.ts', 'src/worker.ts'],
  format: ['esm'],
  outDir: 'dist',
  sourcemap: true,
  dts: true,
  clean: true,
})
