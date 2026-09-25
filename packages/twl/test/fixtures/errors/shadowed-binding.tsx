import { cls } from 'twl/macro'

export function render() {
  // A local binding of the same name makes some references in this file mean
  // something else, so the file is refused rather than guessed at.
  const cls = 'shadowed'
  return cls
}
