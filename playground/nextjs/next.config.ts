import bundleAnalyzer from '@next/bundle-analyzer'
import { createAutoImport } from 'next-auto-import'
import { withTwl } from 'twl/next'
import type { NextConfig } from 'next'

const withBundleAnalyzer = bundleAnalyzer({
  // eslint-disable-next-line n/prefer-global/process
  enabled: process.env.ANALYZE === 'true',
})

const withAutoImport = createAutoImport({
  imports: [
    'react',
    {
      twl: ['cn'],
    },
    {
      from: 'motion/react-m',
      imports: [['*', 'motion']],
    },
  ],
})

const nextConfig: NextConfig = {
  reactCompiler: true,
}

// `scripts/bench-size.mjs` builds this app twice, once with the compiler off,
// to weigh what compiling the class name templates away is worth.
// eslint-disable-next-line n/prefer-global/process
const withCompiler = process.env.TWL_COMPILE === '0' ? [] : [withTwl()]

export default [withBundleAnalyzer, withAutoImport, ...withCompiler].reduce(
  (config, withFn) => withFn(config),
  nextConfig,
)
