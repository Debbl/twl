import { cn } from 'twl'

// With `twl` listed in `from`, the runtime entry compiles too. `cn` is not a
// macro, so its import has to survive.
export const result = "flex items-center"
export const merged = cn('p-2', 'p-4')
