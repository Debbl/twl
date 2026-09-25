# twl

Write long Tailwind class names across several lines, with comments, and pay
nothing for it at runtime. See [packages/twl](packages/twl) for the docs.

## Layout

```
packages/twl           the runtime, the compiler, and every bundler integration
packages/babel-*       the superseded Babel macro
apps/website           docs, built with twl and best-i18n
playground/nextjs      Next.js + Turbopack, through twl/next
playground/vite-react  Vite + React, through twl/vite
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

- https://github.com/yunsii/tagged-classnames-free
