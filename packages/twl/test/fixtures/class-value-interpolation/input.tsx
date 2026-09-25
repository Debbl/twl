import { cls } from 'twl/macro'

const state = { 'bg-red-500': true, 'hidden': false }
const extra = ['p-2', 'm-1']
const missing = undefined

// The runtime passes each of these through `clsx`; so must the output.
export const result = cls`flex ${state} ${extra} ${missing}`
