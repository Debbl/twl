# swc-plugin-twl-macro

An experimental SWC plugin that transforms `cls` templates imported from `twl/macro`.

## Usage

`.swcrc`

```json
{
  "jsc": {
    "experimental": {
      "plugins": [["swc-plugin-twl-macro", {}]]
    }
  }
}
```

`next.config.ts`

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    swcPlugins: [['swc-plugin-twl-macro', {}]],
  },
}

export default nextConfig
```

The plugin keeps the `twl/macro` import path, removes the import at compile time, and emits either a plain string literal or a plain template literal.

## Notes

- This follows the same package split as Lingui: `twl/macro` stays a thin typing/runtime entry, while the SWC transform lives in a separate package.
- SWC plugin compatibility depends on the host compiler version. Validate the plugin against the exact `@swc/core` or Next.js runtime you plan to ship.
