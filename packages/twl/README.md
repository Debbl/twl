# twl

The `cn` API with macro compilation. No extra function names to learn.

## Install

```sh
pnpm add twl
```

## Runtime API

`twl` exposes the `cn` API. Its `cn`, `clsx`, and `twMerge` functions also
support commented templates. `ClassValue` and `ClassNameValue` are available as types.

```ts
import { cn, clsx, twMerge } from 'twl'
import type { ClassValue } from 'twl'

cn('p-2', { 'p-4': true }) // 'p-4'
clsx('p-2', { 'p-4': true }) // 'p-2 p-4'
twMerge('p-2', ['p-4']) // 'p-4'
```

## Compiled runtime

`twl/runtime` directly re-exports `cn`, `clsx`, and `twMerge` from `cn`, without
template handling. The compiler emits imports from this entry.

```ts
import { cn as __twl_cn } from 'twl/runtime'

const className = __twl_cn('flex items-center', variant)
```

## Macro API

Import the same names from `twl/macro` to enable commented templates and
build-time compilation. Ordinary function calls keep their original behavior.

```ts
import { cn, clsx, twMerge } from 'twl/macro'

cn`
  // spacing
  p-2 p-4
` // 'p-4'
clsx`p-2 p-4` // 'p-2 p-4'
twMerge`p-2 p-4` // 'p-4'

cn`flex ${['p-2', { 'p-4': true }]}` // 'flex p-4'
twMerge`p-2 ${['p-4', false]}` // 'p-4'
cn('p-2', { 'p-4': true }) // ordinary calls still work
```

All three template tags collapse whitespace and strip `//` line comments.
Comments only start at token boundaries, so `bg-[url(https://a.com/x.png)]`
and `content-['//']` are preserved.

| Macro     | Interpolations                                        | Tailwind conflicts |
| --------- | ----------------------------------------------------- | ------------------ |
| `cn`      | `ClassValue`, including objects and arrays            | Merged             |
| `clsx`    | `ClassValue`, including objects and arrays            | Preserved          |
| `twMerge` | `ClassNameValue`, including strings and nested arrays | Merged             |

The macro entry contains only type declarations for `cn`, `clsx`, and
`twMerge`. Compiled code imports `twl/runtime`, which directly re-exports `cn`, `clsx`,
and `twMerge` from `cn`. The `twl` entry provides template support.
The macro entry requires the compiler plugin. To run without compilation,
import from `twl` instead.
There are no `cls`, `tw`, or standalone `macro` function exports.

## Compiler

```ts
// vite.config.ts
import twl from 'twl/vite'

export default { plugins: [twl()] }
```

Static templates compile to string literals: `cn` and `twMerge` also resolve
conflicts at build time. Dynamic templates become direct calls to the matching `cn`, `clsx`, or
`twMerge` function, with normalized static strings and original expressions
as separate arguments. No template literal is emitted.
Ordinary function calls are redirected to `twl/runtime`, which re-exports the original functions from `cn`.

Also available: `twl/rollup`, `twl/rolldown`, `twl/webpack`, `twl/rspack`,
`twl/esbuild`, `twl/farm`, and `twl/unplugin`.

### Next.js

```ts
// next.config.ts
import { withTwl } from 'twl/next'

export default withTwl()({ reactCompiler: true })
```

`withTwl()` registers the loader on both Turbopack and webpack.

### Options

| Option    | Default             | Purpose                                                                       |
| --------- | ------------------- | ----------------------------------------------------------------------------- |
| `from`    | `['twl/macro']`     | Module specifiers exposing the macro API, including custom re-export modules. |
| `include` | `/\.[cm]?[jt]sx?$/` | Files to compile. Next.js uses its own loader rule.                           |
| `exclude` | `/node_modules/`    | Skip dependencies.                                                            |

The compiler rejects namespace imports, local bindings that shadow macro
imports, and interpolations inside comments. Diagnostics include file and line.

## Limitations

`prettier-plugin-tailwindcss` can reorder comments inside class templates.
Use `// prettier-ignore` on the attribute when needed.

## Credits

- https://github.com/yunsii/tagged-classnames-free
