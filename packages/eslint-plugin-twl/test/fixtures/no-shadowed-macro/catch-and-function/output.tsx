import { cn } from 'twl/macro'

try {
  run()
} catch (cn) {
  report(cn)
}

export class X {
  m() {
    function cn() {}
    return cn
  }
}
