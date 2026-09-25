import { defineConfig } from 'tsdown'

// Named entries rather than a file list: the source is laid out by concern
// (runtime, compiler, integrations) while the published subpaths stay flat, so
// moving a file never renames a public entry point.
export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'macro': 'src/macro.ts',
    'compiler': 'src/compiler/index.ts',
    'unplugin': 'src/integrations/unplugin.ts',
    'vite': 'src/integrations/vite.ts',
    'rollup': 'src/integrations/rollup.ts',
    'rolldown': 'src/integrations/rolldown.ts',
    'webpack': 'src/integrations/webpack.ts',
    'rspack': 'src/integrations/rspack.ts',
    'esbuild': 'src/integrations/esbuild.ts',
    'farm': 'src/integrations/farm.ts',
    'next': 'src/integrations/next/index.ts',
    'next-loader': 'src/integrations/next/loader.ts',
  },
  format: ['esm', 'cjs'],
  dts: { sourcemap: true },
  outDir: 'dist',
  sourcemap: true,
  clean: true,
})
