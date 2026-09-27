import { cn } from 'twl/macro'

// Invalid escapes cannot be compiled and must not survive as macro imports.
export const result = cn`\unicode`
