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
    text-sm  bg-sky-500
    font-bold
    text-lg
  `
  expect(result).toMatchInlineSnapshot(`"bg-sky-500 font-bold text-lg"`)
})

it('multiple lines with expressions', () => {
  const result = cn`
    text-sm              bg-sky-400
    font-bold ${'font-bold'}   ${'bg-sky-500'}
  `
  expect(result).toMatchInlineSnapshot(`"text-sm font-bold bg-sky-500"`)
})

it('multiple lines with comments', () => {
  const result = cn`
    // hello
    text-sm  bg-sky-500
    font-bold
    // world
    text-lg
  `
  expect(result).toMatchInlineSnapshot(`"bg-sky-500 font-bold text-lg"`)
})

it('keeps arbitrary values that contain //', () => {
  const result = cn`
    // background
    bg-[url(https://a.com/x.png)]
    underline
  `
  expect(result).toMatchInlineSnapshot(
    `"bg-[url(https://a.com/x.png)] underline"`,
  )
})
