import * as original from 'cn'
import { expect, it } from 'vitest'
import * as twl from '../src'
import { cn } from '../src'
import * as runtime from '../src/runtime'
import type { ClassValue } from '../src'

it('exports only the three runtime APIs', () => {
  expect(Object.keys(twl).sort()).toEqual(['clsx', 'cn', 'twMerge'])
})

it('merges commented templates with cn-compatible interpolations', () => {
  const value: ClassValue = ['p-4', { hidden: false, block: true }, null]
  expect(cn`
    // Base classes
    p-2 flex
    ${value}
    // Final overrides
    p-6
  `).toBe('block p-6')
})

it('has no runtime exports in the compiler-only entry', async () => {
  const declarations = await import('../src/macro')
  expect(Object.keys(declarations)).toEqual([])
})

it('re-exports cn functions directly from the compiled runtime entry', () => {
  expect(Object.keys(runtime).sort()).toEqual(['clsx', 'cn', 'twMerge'])
  expect(runtime.cn).toBe(original.cn)
  expect(runtime.clsx).toBe(original.clsx)
  expect(runtime.twMerge).toBe(original.twMerge)
})
