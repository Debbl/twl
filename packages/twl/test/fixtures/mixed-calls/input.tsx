import { cn } from 'twl/macro'

// Ordinary calls keep their import when templates compile away.
export const result = cn`
  // layout
  flex  items-center
`
export const merged = cn('p-2', 'p-4')
