# babel-plugin-twl-macro

This package contains the compile-time implementation behind `twl/macro`.

Application code should usually import the macro from `twl/macro`:

```ts
import { cls } from 'twl/macro'

const className = cls`
  flex
  items-center
`
```

Static templates compile to string literals. Templates with expressions compile
to normal template literals while keeping the expressions in place.

If you need the macro package directly, use `babel-plugin-twl-macro/macro`.
