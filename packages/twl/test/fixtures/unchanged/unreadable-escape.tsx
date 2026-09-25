import { cls } from 'twl/macro'

// `cooked` is null for this escape, so the runtime cannot read it either and
// the compiler leaves the template alone.
export const result = cls`\unicode`
