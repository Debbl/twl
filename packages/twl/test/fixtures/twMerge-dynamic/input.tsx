import { twMerge } from 'twl/macro'
const extra = ['p-4', [false, 'block']] as const
export const result = twMerge`
// layout
flex p-2 ${extra}
`
