import { tw } from 'twl/macro'

const override = 'px-8'

// The merge cannot happen until the interpolation has a value, so the call
// stays - but the template around it is already folded.
export const result = tw`
  // base
  px-2 py-1
  flex items-center
  ${override}
`
