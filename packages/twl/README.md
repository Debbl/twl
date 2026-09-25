# twl

Write long Tailwind class names across several lines, with comments, and pay
nothing for it at runtime.

```tsx
import { cls } from 'twl/macro'

const button = (
  <button
    className={cls`
      // layout
      inline-flex shrink-0 items-center justify-center gap-2
      whitespace-nowrap rounded-md
      // interaction
      cursor-pointer transition-[color,box-shadow] outline-none
      disabled:pointer-events-none disabled:opacity-50
      ${variant}
    `}
  />
)
```

With a bundler plugin configured, that compiles to the string you would have
written by hand:

```tsx
const button = (
  <button
    className={`inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md cursor-pointer transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:opacity-50 ${__twl_clsx(variant)}`}
  />
)
```

Without one it still works - the runtime does the same folding on every render,
which for a template this size costs about 1.2 µs a call and ships the
newlines and comments to the browser. The plugin is what makes the way you want
to write class names free.

## Install

```sh
pnpm add twl
```

## Runtime

```ts
import { cls, cn, tw } from 'twl'

cls`flex  items-center` // 'flex items-center'
tw`p-2 p-4` // 'p-4', conflicts merged
cn('p-2', isActive && 'bg-blue-600') // clsx + tailwind-merge
```

`cls` folds whitespace and strips `//` line comments. A `//` only starts a
comment at a token boundary, so `bg-[url(https://a.com/x.png)]` and
`content-['//']` are left alone. Interpolations go through `clsx`, so objects,
arrays and nullish values behave as you would expect.

`tw` is `cls` plus `tailwind-merge`.

## Compiler

Import from `twl/macro` instead of `twl`, then configure the plugin for your
bundler. Every `cls` and `tw` template compiles to a literal; a `tw` template
with no interpolation has its merge done at build time too, so nothing of
tailwind-merge is left to run.

```ts
// vite.config.ts
import twl from 'twl/vite'

export default { plugins: [twl()] }
```

Also available: `twl/rollup`, `twl/rolldown`, `twl/webpack`, `twl/rspack`,
`twl/esbuild`, `twl/farm`, and `twl/unplugin` for the raw factory.

### Next.js

Turbopack has no plugin API and only accepts webpack-shaped loaders, so it gets
its own integration. `withTwl()` registers the same loader on Turbopack and
webpack alike.

```ts
// next.config.ts
import { withTwl } from 'twl/next'

export default withTwl()({ reactCompiler: true })
```

### Options

| Option    | Default             |                                                                                                                                         |
| --------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `from`    | `['twl/macro']`     | Module specifiers whose `cls` and `tw` compile away. Add `'twl'` to compile the runtime entry too, at the price of the guarantee below. |
| `include` | `/\.[cm]?[jt]sx?$/` | Files to compile. Not read by `twl/next`, which matches by its own rule.                                                                |
| `exclude` | `/node_modules/`    | Dependencies ship compiled code already.                                                                                                |

Importing from `twl/macro` is a promise that the template will be compiled, so
the compiler is strict about it: a reference that is not a template tag, a
local binding that shadows the import, or a namespace import is a build error
rather than something that quietly reaches the runtime.

## What it does not do

An interpolation is not re-normalized once it has a value, so one that
evaluates to nothing leaves behind the space that separated it. The class list
is the same, which is all the DOM and Tailwind read, but the string differs:

```ts
cls`flex ${maybeEmpty} p-2` // runtime:  'flex p-2'
// compiled: `flex ${__twl_clsx(maybeEmpty)} p-2`  ->  'flex  p-2'
```

`prettier-plugin-tailwindcss` sorts class names inside any template literal in
a `className`, which flattens these templates and scatters their comments. The
two are not currently compatible; `// prettier-ignore` on the attribute is the
escape hatch.

## Credits

- https://github.com/yunsii/tagged-classnames-free
