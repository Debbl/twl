import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'cls/macro': 'src/macro/cls.ts',
    'tw/macro': 'src/macro/tw.ts',
  },
  exports: true,
  dts: { sourcemap: true },
  sourcemap: true,
})
