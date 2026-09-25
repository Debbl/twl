import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { TransformOptions } from '../../compiler'

/** The part of a webpack config this appends a rule to. */
interface WebpackConfig {
  module: { rules: unknown[] }
}

/**
 * The slice of a Next config this touches.
 *
 * Only ever reached through a cast, never as a constraint: every Next version
 * types `turbopack.rules` and `webpack` a little differently, and a constraint
 * precise enough to describe them would reject the config of the next release
 * - or of any other `with*` wrapper it is composed with.
 */
interface NextConfigParts {
  turbopack?: { rules?: Record<string, unknown> }
  webpack?: ((config: WebpackConfig, context: unknown) => WebpackConfig) | null
}

/**
 * Turbopack and webpack both resolve a loader by module path. Pointing at the
 * built file next to this one keeps that independent of how the consumer's
 * resolver treats our `exports` map; the package specifier is the fallback for
 * running straight from source.
 */
function resolveLoader() {
  const here = path.dirname(fileURLToPath(import.meta.url))

  for (const name of ['next-loader.mjs', 'next-loader.cjs', 'loader.ts']) {
    const candidate = path.join(here, name)
    if (existsSync(candidate)) return candidate
  }

  return 'twl/next/loader'
}

/**
 * Turbopack caches a loader's output against the file's content and the
 * loader's options, and neither of those changes when the loader itself does.
 * Upgrading this package would otherwise keep serving transforms produced by
 * the version you replaced - silently, and only for files you had not touched.
 * Threading the version through the options is what makes an upgrade a miss.
 */
function packageVersion() {
  let dir = path.dirname(fileURLToPath(import.meta.url))

  for (let up = 0; up < 5; up++) {
    const manifest = path.join(dir, 'package.json')
    if (existsSync(manifest)) {
      try {
        return (
          (JSON.parse(readFileSync(manifest, 'utf8')) as { version?: string })
            .version ?? '0'
        )
      } catch {
        return '0'
      }
    }
    dir = path.dirname(dir)
  }

  return '0'
}

/**
 * Turbopack rejects loader options it cannot serialize, and an optional field
 * left as `undefined` is enough to trip it.
 */
function serializable<T extends object>(options: T) {
  return Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined),
  ) as T
}

// Turbopack and webpack disagree about how to spell "not node_modules": a glob
// plus a built-in condition on one side, a test/exclude pair on the other.
// Keep the two extension sets identical, or a file compiles under one bundler
// and reaches the runtime under the other.
const TURBOPACK_GLOB = '*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'
const WEBPACK_TEST = /\.[cm]?[jt]sx?$/

interface TurbopackRule {
  condition?: unknown
  loaders?: unknown[]
}

/**
 * Adds this loader to the rule for source files, keeping whatever is already
 * registered under the same glob.
 *
 * Every macro-style Next plugin matches the same set of extensions, so two of
 * them end up writing the same key. Replacing the entry would drop the other
 * plugin's loader with nothing to show for it - the build succeeds and that
 * plugin silently stops running.
 */
function turbopackRule(existing: unknown, use: unknown): TurbopackRule {
  const rule = (existing ?? {}) as TurbopackRule

  return {
    // `foreign` is Turbopack's name for node_modules and its own internals;
    // compiling those is pure cost.
    condition: rule.condition ?? { not: 'foreign' },
    loaders: [...(rule.loaders ?? []), use],
  }
}

/**
 * Wires the twl compiler into a Next.js build, under Turbopack and webpack
 * alike.
 *
 * Next.js is the one bundler this cannot reach through unplugin: Turbopack has
 * no plugin API and only accepts webpack-shaped loaders registered in the
 * config, so it gets its own integration.
 *
 * @example
 *   // next.config.ts
 *   import { withTwl } from 'twl/next'
 *
 *   export default withTwl()({ reactCompiler: true })
 */
export function withTwl(options: TransformOptions = {}) {
  const use = {
    loader: resolveLoader(),
    options: { ...serializable(options), version: packageVersion() },
  }

  // The caller's own config type is handed straight back, so a chain of
  // `with*` wrappers composes without any of them widening the result.
  return <T extends object>(config: T = {} as T): T => {
    const current = config as NextConfigParts

    return {
      ...config,

      turbopack: {
        ...current.turbopack,
        rules: {
          ...current.turbopack?.rules,
          [TURBOPACK_GLOB]: turbopackRule(
            current.turbopack?.rules?.[TURBOPACK_GLOB],
            use,
          ),
        },
      },

      webpack(webpackConfig: WebpackConfig, webpackContext: unknown) {
        const merged =
          current.webpack?.(webpackConfig, webpackContext) ?? webpackConfig

        merged.module.rules.push({
          test: WEBPACK_TEST,
          exclude: /node_modules/,
          use: [use],
        })

        return merged
      },
    } as T
  }
}

export type { TwlLoaderOptions } from './loader'
