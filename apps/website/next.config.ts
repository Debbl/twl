import { fileURLToPath } from 'node:url'
import { withUnprefixedLocale } from '@best-i18n/next-unprefixed-locale'
import { createI18nPlugin } from 'best-i18n/next'
import { createMDX } from 'fumadocs-mdx/next'
import { withTwl } from 'twl/next'
import { i18nConfig } from './src/lib/i18n'
import type { NextConfig } from 'next'

// The docs are built with the things they document, which is the cheapest
// integration test there is: a page that renders wrong is a bug you see.
const withMDX = createMDX()

const withI18n = createI18nPlugin({
  ...i18nConfig,
  messagesDir: fileURLToPath(new URL('./messages', import.meta.url)),
})

// English is served unprefixed - /docs beside /zh/docs - and a static export
// has no proxy to strip the prefix, so the files have to exist. This mirrors
// `app/[locale]` into `app/(unprefixed)` with English pinned, regenerated on
// every config load and gitignored.
//
// Used standalone rather than through `createI18nPlugin`'s `plugins` hook:
// the published best-i18n does not strip that option before handing the rest
// to the Turbopack loader, and a function is not serializable.
const withUnprefixed = withUnprefixedLocale({
  defaultLocale: i18nConfig.baseLocale,
})

const nextConfig: NextConfig = {
  // Static export: the site is assets, so it is served by Workers' asset
  // handler with no server behind it. See `wrangler.jsonc`.
  output: 'export',
  reactStrictMode: true,
}

/**
 * Applied in order: `withMDX` first so the rest see the config it produces,
 * and `withTwl` last so it finds the rule `withI18n` wrote under the same
 * Turbopack glob and adds to it rather than replacing it.
 *
 * Annotated with one shared signature on purpose - each wrapper is generic or
 * optional-argument in its own way, and a union of those signatures is not
 * callable.
 */
const plugins: Array<(config: NextConfig) => NextConfig> = [
  withMDX,
  withUnprefixed,
  withI18n,
  withTwl(),
]

export default plugins.reduce((config, withFn) => withFn(config), nextConfig)
