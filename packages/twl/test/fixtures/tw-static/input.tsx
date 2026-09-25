import { tw } from 'twl/macro'

// No interpolation, so the merge itself happens at build time and nothing of
// tailwind-merge is left to run.
export const result = tw`
  // spacing, last one wins
  px-2 py-1 px-4
  // colour, last one wins
  bg-blue-600 bg-red-600
  flex items-center
`
