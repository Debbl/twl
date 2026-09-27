import { type cn as CnTag, cn as merge } from 'twl/runtime'

// Keep ordinary cn exports while removing the compiled macro import.
export const result = "flex items-center"
export const merged = merge('p-2', 'p-4')

export type Value = typeof CnTag
