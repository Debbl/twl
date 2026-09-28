# oxlint-plugin-twl

[Oxlint](https://oxc.rs/docs/guide/usage/linter/js-plugins.html) JS plugin for
[twl](https://github.com/Debbl/twl) class name templates. It runs the rules of
[`eslint-plugin-twl`](https://github.com/Debbl/twl/tree/main/packages/eslint-plugin-twl), unchanged.

```sh
pnpm add -D oxlint-plugin-twl
```

```ts
// oxlint.config.ts
import { defineConfig } from 'oxlint'
import twl from 'oxlint-plugin-twl'

export default defineConfig({
  extends: [twl.configs.recommended],
  settings: { twl: { stylesheet: './src/app.css' } },
})
```

In `.oxlintrc.json`, list the plugin and the rules yourself:

```json
{
  "jsPlugins": ["oxlint-plugin-twl"],
  "settings": { "twl": { "stylesheet": "./src/app.css" } },
  "rules": {
    "twl/sort-classes": "warn",
    "twl/no-interpolation-in-comment": "error",
    "twl/no-namespace-import": "error",
    "twl/no-shadowed-macro": "error"
  }
}
```

`twl/sort-classes` needs `settings.twl.stylesheet`, a Tailwind CSS v4 entry
file, and `@tailwindcss/node` installed. Oxlint's JS plugin support is alpha;
this plugin is tested against Oxlint 1.85 and later.

See the [docs](https://github.com/Debbl/twl/tree/main/apps/website/content/docs/lint), one page per rule.
