import { cls, tw } from 'twl/macro'

const active = true

const surface = cls`
  // layout
  flex items-center justify-center
  gap-2 rounded-lg border p-4
  ${active ? 'ring-2' : ''}
`

const button = tw`
  // the merge here has no interpolation, so it happens at build time
  px-2 py-1 px-4
  bg-blue-600 bg-red-600
`

document.querySelector('#root')!.innerHTML =
  `<div class="${surface}"><button class="${button}">hi</button></div>`
