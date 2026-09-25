import { clsx as __twl_clsx } from 'twl';

const state = { 'bg-red-500': true, 'hidden': false }
const extra = ['p-2', 'm-1']
const missing = undefined

// The runtime passes each of these through `clsx`; so must the output.
export const result = `flex ${__twl_clsx(state)} ${__twl_clsx(extra)} ${__twl_clsx(missing)}`
