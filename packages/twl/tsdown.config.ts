import { copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: { sourcemap: true },
  outDir: 'dist',
  sourcemap: true,
  clean: true,
  hooks: {
    'build:done': async () => {
      const root = import.meta.dirname
      await mkdir(path.resolve(root, 'dist/macro'), { recursive: true })
      await copyFile(
        path.resolve(root, 'macro/index.cjs'),
        path.resolve(root, 'dist/macro/index.cjs'),
      )
      await copyFile(
        path.resolve(root, 'macro/index.d.ts'),
        path.resolve(root, 'dist/macro/index.d.ts'),
      )
    },
  },
})
