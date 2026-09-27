# babel-plugin-twl-macro

This package provides the legacy Babel macro adapter. New projects should use
the compiler and bundler integrations in `twl`.

Application code should usually import the macro from `twl/macro`:

```ts
import { cn } from 'twl/macro'

const className = cn`
  flex
  items-center
`
```

Static templates compile to merged string literals. Templates with expressions
become direct calls to the matching runtime function with separate arguments.

If you need the macro package directly, use `babel-plugin-twl-macro/cn`.
