import {
  clsx as originalClsx,
  cn as originalCn,
  twMerge as originalTwMerge,
} from 'cn'
import { describe, expect, it } from 'vitest'
import { clsx, cn, twMerge } from '../src'
import { transform } from '../src/compiler'

it('preserves ordinary function calls', () => {
  const values = ['p-2', { 'p-4': true, 'hidden': false }, ['flex', null]]
  expect(cn(...values)).toBe(originalCn(...values))
  expect(clsx(...values)).toBe(originalClsx(...values))
  expect(twMerge('p-2', ['p-4', false])).toBe(
    originalTwMerge('p-2', ['p-4', false]),
  )
  expect(cn()).toBe('')
  expect(clsx()).toBe('')
  expect(twMerge()).toBe('')
})

it('keeps the three template contracts distinct', () => {
  expect(cn`p-2 ${['p-4', { block: true }]}`).toBe('p-4 block')
  expect(clsx`p-2 ${['p-4', { block: true }]}`).toBe('p-2 p-4 block')
  expect(twMerge`p-2 ${['p-4', false]}`).toBe('p-4')
  // @ts-expect-error twMerge accepts strings and nested arrays, not objects.
  const invalid = () => twMerge`p-2 ${{ 'p-4': true }}`
  expect(invalid).toBeTypeOf('function')
})

describe.each(['cn', 'clsx', 'twMerge'] as const)('%s compilation', (name) => {
  it('redirects ordinary calls even without tagged templates', () => {
    const result = transform(
      `import { ${name} } from 'twl/macro'\nexport const result = ${name}('p-2', 'p-4')`,
      'test.ts',
    )
    expect(result?.code).toContain(`import { ${name} } from 'twl/runtime'`)
    expect(result?.code).not.toContain('twl/macro')
  })

  it('redirects exported runtime references', () => {
    const result = transform(
      `import { ${name} } from 'twl/macro'\nexport { ${name} }`,
      'test.ts',
    )
    expect(result?.code).toContain(`import { ${name} } from 'twl/runtime'`)
  })

  it('strips comments and resolves static work', () => {
    const result = transform(
      `import { ${name} as tag } from 'twl/macro'\nexport const result = tag\`\n// spacing\np-2 p-4\``,
      'test.ts',
    )
    expect(result?.code).toBe(
      `export const result = ${JSON.stringify(name === 'clsx' ? 'p-2 p-4' : 'p-4')}`,
    )
  })

  it('uses the appropriate dynamic helpers', () => {
    const result = transform(
      `import { ${name} } from 'twl/macro'\nexport const result = ${name}\`p-2 \${value}\``,
      'test.ts',
    )
    expect(result?.code).toContain(`__twl_${name}("p-2", value)`)
    expect(result?.code).not.toContain('`')
    expect(result?.code).not.toContain('__twl_twJoin')
  })

  it('preserves sequence expressions as a single argument', () => {
    const result = transform(
      `import { ${name} } from 'twl/macro'\nexport const result = ${name}\`p-2 \${(effect(), value)}\``,
      'test.ts',
    )
    expect(result?.code).toContain(`__twl_${name}("p-2", (effect(), value))`)
  })

  it('preserves ordinary calls beside compiled templates', () => {
    const source = `import { ${name} as tag } from 'twl/macro'\nexport const a = tag('p-2', 'p-4')\nexport const b = tag\`p-2 p-4\``
    const result = transform(source, 'test.ts')
    expect(result?.code).toContain(`import { ${name} as tag } from 'twl/runtime'`)
    expect(result?.code).toContain("tag('p-2', 'p-4')")
    expect(result?.code).not.toContain('tag`')
  })
})
