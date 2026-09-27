export interface TransformOptions {
  /**
   * Modules exposing the cn, clsx, and twMerge macro API.
   * Add custom re-export modules here when needed. The `twl` entry provides
   * runtime implementations; `twl/macro` has declarations only.
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
