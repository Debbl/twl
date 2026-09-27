import { cn, cn as merge, type cn as CnTag } from 'twl/macro'

// Keep ordinary cn exports while removing the compiled macro import.
export const result = cn`flex  items-center`
export const merged = merge('p-2', 'p-4')

export type Value = typeof CnTag
