import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { withTwl } from '../src/integrations/next'
import twlLoader from '../src/integrations/next/loader'
import vite from '../src/integrations/vite'

const SOURCE =
  "import { cls } from 'twl/macro'\nexport const a = cls`flex  items-center`\n"

interface NextConfigParts {
  turbopack?: { rules?: Record<string, unknown> }
  webpack?:
    | ((
        config: { module: { rules: unknown[] } },
        context: unknown,
      ) => {
        module: { rules: unknown[] }
      })
    | null
  [key: string]: unknown
}

describe('unplugin', () => {
  it('compiles through the vite plugin', async () => {
    const plugin = vite({}) as {
      transform: unknown
      transformInclude?: (id: string) => boolean
    }

    const hook = plugin.transform as
      | ((code: string, id: string) => Promise<{ code: string } | null>)
      | {
          handler: (
            code: string,
            id: string,
          ) => Promise<{ code: string } | null>
        }

    const run = typeof hook === 'function' ? hook : hook.handler
    const result = await run.call({} as never, SOURCE, '/app/a.tsx')

    expect(result?.code.trim()).toBe('export const a = "flex items-center"')
  })

  it('honours the from option', async () => {
    const plugin = vite({ from: ['twl/macro', 'twl'] }) as {
      transform: unknown
    }
    const hook = plugin.transform as
      | ((code: string, id: string) => Promise<{ code: string } | null>)
      | {
          handler: (
            code: string,
            id: string,
          ) => Promise<{ code: string } | null>
        }
    const run = typeof hook === 'function' ? hook : hook.handler
    const result = await run.call(
      {} as never,
      "import { cls } from 'twl'\nexport const a = cls`flex  items-center`\n",
      '/app/a.tsx',
    )

    expect(result?.code.trim()).toBe('export const a = "flex items-center"')
  })

  it('leaves dependencies alone', async () => {
    const plugin = vite({}) as { transformInclude?: (id: string) => boolean }

    expect(plugin.transformInclude?.('/app/a.tsx')).toBe(true)
    expect(plugin.transformInclude?.('/app/node_modules/x/a.js')).toBe(false)
    expect(plugin.transformInclude?.('/app/styles.css')).toBe(false)
  })
})

function run(source: string, resourcePath = '/app/a.tsx') {
  return new Promise<{ error: Error | null; code?: string }>((resolve) => {
    const context = {
      resourcePath,
      getOptions: () => ({}),
      cacheable: () => {},
      async: () => (error: Error | null, code?: string) =>
        resolve({ error, code }),
    }

    twlLoader.call(context, source)
  })
}
describe('next loader', () => {
  it('compiles a file that uses the macro', async () => {
    const { error, code } = await run(SOURCE)

    expect(error).toBeNull()
    expect(code?.trim()).toBe('export const a = "flex items-center"')
  })

  it('hands back untouched source when there is nothing to do', async () => {
    const { error, code } = await run('export const a = 1\n')

    expect(error).toBeNull()
    expect(code).toBe('export const a = 1\n')
  })

  it('reports a compile error instead of throwing', async () => {
    const { error } = await run(
      "import { cls } from 'twl/macro'\nexport const a = cls\n",
    )

    expect(error?.message).toMatch(/can only be used as a template tag/)
  })
})

describe('withTwl', () => {
  it('registers the loader on turbopack and webpack', () => {
    const config: NextConfigParts = withTwl()({ reactCompiler: true })

    const rules = config.turbopack?.rules as Record<
      string,
      { condition: unknown; loaders: Array<{ loader: string }> }
    >
    const rule = rules['*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}']

    expect(rule?.condition).toEqual({ not: 'foreign' })
    expect(rule?.loaders).toHaveLength(1)
    expect(config.reactCompiler).toBe(true)

    const webpackConfig = { module: { rules: [] as unknown[] } }
    config.webpack?.(webpackConfig, {})

    expect(webpackConfig.module.rules).toHaveLength(1)
  })

  it('resolves a loader path that exists, or the package specifier', () => {
    const rules = withTwl()({} as NextConfigParts).turbopack?.rules as Record<
      string,
      { loaders: Array<{ loader: string; options: { version?: string } }> }
    >
    const { loader, options } =
      rules['*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}']!.loaders[0]!

    expect(loader === 'twl/next/loader' || existsSync(loader)).toBe(true)
    // Turbopack caches against the options, so the version has to travel.
    expect(options.version).toMatch(/^\d+\./)
  })

  it('adds to a rule another plugin already registered', () => {
    const glob = '*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'
    const config: NextConfigParts = withTwl()({
      turbopack: {
        rules: {
          [glob]: { condition: { not: 'foreign' }, loaders: ['other-loader'] },
        },
      },
    })

    const rules = config.turbopack?.rules as Record<
      string,
      { loaders: unknown[] }
    >
    const rule = rules[glob]!

    // Replacing the entry would drop the other plugin with no error to show.
    expect(rule.loaders).toHaveLength(2)
    expect(rule.loaders[0]).toBe('other-loader')
  })

  it('keeps an existing webpack config and turbopack rules', () => {
    const config: NextConfigParts = withTwl()({
      turbopack: { rules: { '*.svg': { loaders: ['svg-loader'] } } },
      webpack: (webpackConfig: { module: { rules: unknown[] } }) =>
        webpackConfig,
    })

    expect(config.turbopack?.rules?.['*.svg']).toEqual({
      loaders: ['svg-loader'],
    })

    const webpackConfig = { module: { rules: [] as unknown[] } }
    config.webpack?.(webpackConfig, {})

    expect(webpackConfig.module.rules).toHaveLength(1)
  })

  it('passes compiler options through to the loader', () => {
    const rules = withTwl({ from: ['twl/macro', 'twl'] })({} as NextConfigParts)
      .turbopack?.rules as Record<
      string,
      { loaders: Array<{ options: Record<string, unknown> }> }
    >
    const { options } = rules['*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}']!.loaders[0]!

    expect(options.from).toEqual(['twl/macro', 'twl'])
  })

  it('drops options turbopack could not serialize', () => {
    const rules = withTwl({ from: undefined })({} as NextConfigParts).turbopack
      ?.rules as Record<
      string,
      { loaders: Array<{ options: Record<string, unknown> }> }
    >
    const { options } = rules['*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}']!.loaders[0]!

    expect('from' in options).toBe(false)
    expect(JSON.stringify(options)).toBeTypeOf('string')
  })
})
