import { defineConfig } from 'tsdown'

// `eslint-plugin-twl` stays external: its bundle locates the sorting worker
// next to itself, so it has to be loaded from its own package.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: 'dist',
  sourcemap: true,
  dts: true,
  clean: true,
})
