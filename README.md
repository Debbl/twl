<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo/lockup.svg">
    <img alt="twl" src="assets/logo/lockup-light.svg" height="72">
  </picture>
</h1>

The `cn` API with macro compilation for `cn`, `clsx`, and `twMerge`.
See [packages/twl](packages/twl) for the docs.

## Layout

```
packages/twl                the runtime, the compiler, and every bundler integration
packages/eslint-plugin-twl  class sorting and compiler checks for ESLint
packages/oxlint-plugin-twl  the same rules for Oxlint
packages/babel-*            the superseded Babel macro
apps/website                docs, built with twl and best-i18n
apps/promo                  the 15-second promo video, in Three.js
playground/nextjs           Next.js + Turbopack, through twl/next
playground/vite-react       Vite + React, through twl/vite
```

## Tasks

```sh
pnpm build            # every package
pnpm test
pnpm typecheck
pnpm lint             # oxlint
pnpm format           # oxfmt

pnpm play             # pick a playground, then run its `dev`
pnpm play nextjs build

pnpm spike            # bundle a fixture with the compiler on and off, assert on the bundles
pnpm bench            # weigh what the playground ships either way
pnpm bench -- --write # record a new scripts/bench-baseline.json
```

## Credits

- https://github.com/shadcn-ui/cn
- https://github.com/yunsii/tagged-classnames-free
