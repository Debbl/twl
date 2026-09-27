import { expect, it } from 'vitest'
import { cn } from '../src'

it('basic', () => {
  const result = cn`text-sm`
  expect(result).toMatchInlineSnapshot(`"text-sm"`)
})

it('basic with expressions', () => {
  const result = cn`text-sm ${'font-bold'}   ${'bg-sky-500'}`
  expect(result).toMatchInlineSnapshot(`"text-sm font-bold bg-sky-500"`)
})

it('multiple lines', () => {
  const result = cn`
    text-sm              bg-sky-500
    font-bold
  `
  expect(result).toMatchInlineSnapshot(`"text-sm bg-sky-500 font-bold"`)
})

it('multiple lines with expressions', () => {
  const result = cn`
    text-sm              bg-sky-500
    font-bold ${'font-bold'}   ${'bg-sky-500'}
  `
  expect(result).toMatchInlineSnapshot(`"text-sm font-bold bg-sky-500"`)
})

it('multiple lines with comments', () => {
  const result = cn`
    // hello
    text-sm              bg-sky-500
    // world
    font-bold
  `
  expect(result).toMatchInlineSnapshot(`"text-sm bg-sky-500 font-bold"`)
})

it('adds spaces around adjacent expressions', () => {
  const result = cn`flex${'items-center'}justify-center`
  expect(result).toMatchInlineSnapshot(`"flex items-center justify-center"`)
})

it('keeps arbitrary values that contain //', () => {
  const result = cn`
    // background
    bg-[url(https://a.com/x.png)]
    ${"content-['//']"}
    underline
  `
  expect(result).toMatchInlineSnapshot(
    `"bg-[url(https://a.com/x.png)] content-['//'] underline"`,
  )
})
