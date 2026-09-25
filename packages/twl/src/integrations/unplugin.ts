import { createUnplugin } from 'unplugin'
import { transform } from '../compiler'
import type { UnpluginFactory } from 'unplugin'
import type { TransformOptions } from '../compiler'

export interface TwlPluginOptions extends TransformOptions {
  /**
   * Files to compile.
   *
   * @default /\.[cm]?[jt]sx?$/
   */
  include?: RegExp
  /**
   * Files to leave alone. Dependencies are skipped by default: a published
   * package ships compiled code already.
   *
   * @default /node_modules/
   */
  exclude?: RegExp
}

const factory: UnpluginFactory<TwlPluginOptions | undefined> = (
  options = {},
) => {
  const include = options.include ?? /\.[cm]?[jt]sx?$/
  const exclude = options.exclude ?? /node_modules/

  return {
    name: 'twl',
    enforce: 'pre',

    transformInclude(id) {
      const filename = id.split('?')[0] ?? id
      return include.test(filename) && !exclude.test(filename)
    },

    transform(code, id) {
      const result = transform(code, id, options)
      if (result === null) return null

      return { code: result.code, map: result.map }
    },
  }
}

export const unplugin = /* #__PURE__ */ createUnplugin(factory)

export default unplugin
