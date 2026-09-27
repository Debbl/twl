import { createRequire } from 'node:module'
import path from 'node:path'
import { transformSync } from '@babel/core'
import macrosPlugin from 'babel-plugin-macros'
import { describe, expect, it } from 'vitest'
import twlMacroPlugin from '../src/macro'

const macroSource = 'twl/macro'
const macroPath = path.resolve(__dirname, '../src/macro.ts')
const nodeRequire = createRequire(import.meta.url)

function normalizeCode(code: string | null | undefined) {
  return code?.replace(/\s+/g, ' ').trim()
}

function transform(code: string, filename = 'fixture.ts') {
  const importExpression = `import { cn } from '${macroSource}';\n`
  const result = transformSync(importExpression + code, {
    filename: path.resolve(__dirname, filename),
    plugins: [
      [
        macrosPlugin,
        {
          require(resolvedPath: string) {
            if (resolvedPath === macroPath) {
              return twlMacroPlugin
            }

            return nodeRequire(resolvedPath)
          },
          resolvePath(source: string) {
            if (source === macroSource) {
              return macroPath
            }

            return nodeRequire.resolve(source)
          },
        },
      ],
    ],
    parserOpts: {
      plugins: ['jsx', 'typescript'],
    },
    babelrc: false,
    configFile: false,
    presets: [],
  })

  return result?.code
}

describe('twl macro', () => {
  it('redirects ordinary calls to the runtime entry', () => {
    const output = transform("const result = cn('p-2', 'p-4')")
    expect(output).toContain('from "twl/runtime"')
    expect(output).toContain("_cn('p-2', 'p-4')")
    expect(output).not.toContain('twl/macro')
  })

  it('transforms static cn templates to string literals', () => {
    const input = `
      const result = cn\`flex items-center\`;
    `

    const output = transform(input)

    expect(output).not.toContain("import { cn } from 'twl/macro'")
    expect(normalizeCode(output)).toMatchInlineSnapshot(
      `"const result = "flex items-center";"`,
    )
  })

  it('transforms dynamic cn templates to template literals', () => {
    const input = `
      const result = cn\`flex \${className}\`;
    `

    const output = transform(input)

    expect(normalizeCode(output)).toMatchInlineSnapshot(
      `"import { cn as _cn } from "twl/runtime"; const result = _cn("flex", className);"`,
    )
  })

  it('normalizes multiline templates and strips comments', () => {
    const input = `
      const result = cn\`
        flex
        // center the content
        items-center
        \${className}
      \`;
    `

    const output = transform(input)

    expect(normalizeCode(output)).toMatchInlineSnapshot(
      `"import { cn as _cn } from "twl/runtime"; const result = _cn("flex items-center", className);"`,
    )
  })

  it('keeps spaces around adjacent expressions', () => {
    const input = `
      const result = cn\`flex\${className}items-center\`;
    `

    const output = transform(input)

    expect(normalizeCode(output)).toMatchInlineSnapshot(
      `"import { cn as _cn } from "twl/runtime"; const result = _cn("flex", className, "items-center");"`,
    )
  })

  it('transforms macro inside tsx components used like the playground', () => {
    const input = `
      type HomeProps = {
        className: string
      }

      export default function Home({ className }: HomeProps) {
        return (
          <main
            className={cn\`
              flex
              items-center
              justify-center
              \${className}
            \`}
          >
            <div className={cn\`size-16 rounded-md border bg-blue-600\`} />
          </main>
        )
      }
    `

    const output = transform(input, 'playground-page.tsx')
    const normalizedOutput = normalizeCode(output)

    expect(output).not.toContain("import { cn } from 'twl/macro'")
    expect(normalizedOutput).toContain(
      // eslint-disable-next-line no-template-curly-in-string
      'className={_cn("flex items-center justify-center", className)}',
    )
    expect(normalizedOutput).toContain(
      'className={"size-16 rounded-md border bg-blue-600"}',
    )
  })

  it('keeps arbitrary values that contain //', () => {
    const input = `
      const result = cn\`
        // background
        bg-[url(https://a.com/x.png)]
        underline
      \`;
    `

    const output = transform(input)

    expect(normalizeCode(output)).toMatchInlineSnapshot(
      `"const result = "bg-[url(https://a.com/x.png)] underline";"`,
    )
  })
})
