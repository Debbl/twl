# eslint-plugin-twl

ESLint rules for [twl](https://github.com/Debbl/twl) class name templates. For
Oxlint, use [`oxlint-plugin-twl`](https://github.com/Debbl/twl/tree/main/packages/oxlint-plugin-twl).

```sh
pnpm add -D eslint-plugin-twl
```

```js
// eslint.config.js
import twl from 'eslint-plugin-twl'

export default [
  twl.configs.recommended,
  { settings: { twl: { stylesheet: './src/app.css' } } },
]
```

| Rule                              | Recommended | Fixable |
| --------------------------------- | ----------- | ------- |
| `twl/sort-classes`                | warn        | yes     |
| `twl/no-interpolation-in-comment` | error       |         |
| `twl/no-namespace-import`         | error       |         |
| `twl/no-shadowed-macro`           | error       |         |

`twl/sort-classes` sorts by Tailwind's order within each group: a `//` comment,
an interpolation, or a blank line starts a new group, and whitespace stays in
place. It needs `settings.twl.stylesheet`, a Tailwind CSS v4 entry file, and
`@tailwindcss/node` installed.

`settings.twl.from` (default `['twl/macro']`) lists the macro modules, as the
compiler's `from` option.

See the [docs](https://github.com/Debbl/twl/tree/main/apps/website/content/docs/lint), one page per rule.
