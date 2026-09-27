import { cn } from 'twl/macro'

// `//` inside an arbitrary value is a class name, not a comment.
export const result = cn`
  // background
  bg-[url(https://a.com/x.png)]
  content-['//']
  underline
`
