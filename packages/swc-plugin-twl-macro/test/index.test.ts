import path from 'node:path'
import { transformSync } from '@swc/core'
import { describe, expect, it } from 'vitest'

const wasmPath = path.resolve(
  __dirname,
  '../target/wasm32-wasip1/release/swc_plugin_twl_macro.wasm',
)

function normalizeCode(code: string | undefined) {
  return code?.replace(/\s+/g, ' ').trim()
}

function transform(code: string, filename = 'fixture.ts') {
  return transformSync(code, {
    filename: path.resolve(__dirname, filename),
    jsc: {
      target: 'es2022',
      parser: {
        syntax: 'typescript',
        tsx: filename.endsWith('.tsx'),
      },
      experimental: {
        plugins: [[wasmPath, {}]],
      },
    },
    module: {
      type: 'es6',
    },
  }).code
}

describe('swc-plugin-twl-macro', () => {
  it('transforms static cls templates to string literals', () => {
    const output = transform(`
      import { cls } from 'twl/macro'

      const result = cls\`flex items-center\`
    `)

    expect(output).not.toContain("import { cls } from 'twl/macro'")
    expect(normalizeCode(output)).toContain('const result = "flex items-center";')
  })

  it('transforms dynamic cls templates to template literals', () => {
    const output = transform(`
      import { cls } from 'twl/macro'

      const result = cls\`flex \${className}\`
    `)

    expect(normalizeCode(output)).toContain('const result = `flex ${className}`;')
  })

  it('normalizes multiline templates and strips comments', () => {
    const output = transform(`
      import { cls } from 'twl/macro'

      const result = cls\`
        flex
        // center the content
        items-center
        \${className}
      \`
    `)

    expect(normalizeCode(output)).toContain(
      'const result = `flex items-center ${className}`;',
    )
  })

  it('keeps spaces around adjacent expressions', () => {
    const output = transform(`
      import { cls } from 'twl/macro'

      const result = cls\`flex\${className}items-center\`
    `)

    expect(normalizeCode(output)).toContain(
      'const result = `flex ${className} items-center`;',
    )
  })

  it('transforms cls inside tsx components', () => {
    const output = transform(
      `
        import { cls } from 'twl/macro'

        type HomeProps = {
          className: string
        }

        export default function Home({ className }: HomeProps) {
          return (
            <main
              className={cls\`
                flex
                items-center
                justify-center
                \${className}
              \`}
            >
              <div className={cls\`size-16 rounded-md border bg-blue-600\`} />
            </main>
          )
        }
      `,
      'playground-page.tsx',
    )

    const normalizedOutput = normalizeCode(output)

    expect(output).not.toContain("import { cls } from 'twl/macro'")
    expect(normalizedOutput).toContain(
      'className: `flex items-center justify-center ${className}`',
    )
    expect(normalizedOutput).toContain(
      'className: "size-16 rounded-md border bg-blue-600"',
    )
  })
})
