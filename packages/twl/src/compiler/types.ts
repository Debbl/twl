export interface TransformOptions {
  /**
   * Module specifiers whose `cls` and `tw` exports are compiled away.
   *
   * Only `twl/macro` by default, so importing from `twl` keeps the runtime.
   * Add `'twl'` to compile the runtime entry too and have one import path for
   * everything - at the price of the guarantee: a `cls` that comes from
   * `twl/macro` is compiled or the build fails, and that is the whole point of
   * the second entry.
   *
   * Whatever is listed here is also the text this looks for before parsing a
   * file at all, so a short or common specifier costs parses.
   *
   * @default ['twl/macro']
   */
  from?: string[]
}

export interface TransformResult {
  code: string
  map: {
    version: number
    sources: string[]
    names: string[]
    mappings: string
  }
}

/** A minimal structural view of the oxc AST, which is plain ESTree JSON. */
export type Node = Record<string, unknown> & { type: string }
