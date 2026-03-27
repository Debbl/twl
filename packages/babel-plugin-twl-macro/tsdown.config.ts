import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/macro.ts'],
  format: ['esm', 'cjs'],
  outDir: 'dist',
  sourcemap: true,
  dts: true,
  clean: true,
})
