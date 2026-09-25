import { cls } from 'twl/macro'

const active = true
const size = 'lg'

// Every interpolation here is provably a string, so none of them needs `clsx`.
export const result = cls`
  // base
  inline-flex items-center
  ${active ? 'ring-2' : ''}
  ${size === 'lg' ? `h-10 px-4` : 'h-8 px-3'}
  ${'gap-2'}
`
