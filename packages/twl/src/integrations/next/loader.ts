import { transform } from '../../compiler'
import type { TransformOptions } from '../../compiler'

/**
 * Everything the loader needs, and nothing that cannot survive a round trip
 * through JSON: Turbopack serializes loader options, so a RegExp or a function
 * would arrive as an empty object.
 */
export interface TwlLoaderOptions extends TransformOptions {
  /**
   * This package's version, added by `withTwl`. Never read - it is here so
   * that upgrading the package changes the loader options, which is the only
   * thing that invalidates Turbopack's cache of a file it already transformed.
   */
  version?: string
}

interface LoaderContext {
  resourcePath: string
  getOptions: () => TwlLoaderOptions
  async: () => (error: Error | null, code?: string, map?: unknown) => void
  cacheable?: (flag: boolean) => void
}

/**
 * Webpack-shaped loader, which is also the only shape Turbopack accepts.
 *
 * Turbopack has no plugin API, so unlike every other bundler it cannot be
 * driven through unplugin - this is what the Next.js integration registers on
 * both bundlers instead.
 */
export default function twlLoader(this: LoaderContext, source: string) {
  const callback = this.async()
  this.cacheable?.(true)

  let result
  try {
    result = transform(source, this.resourcePath, this.getOptions())
  } catch (error) {
    callback(error as Error)
    return
  }

  if (result === null) {
    callback(null, source)
    return
  }

  callback(null, result.code, result.map)
}
