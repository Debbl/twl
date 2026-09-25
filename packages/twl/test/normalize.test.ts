import { describe, expect, it } from 'vitest'
import { normalizeClassNameParts } from '../src'

describe('whitespace', () => {
  it('collapses runs of spaces and newlines', () => {
    expect(
      normalizeClassNameParts(['\n  text-sm    bg-sky-500\n  font-bold\n  ']),
    ).toBe('text-sm bg-sky-500 font-bold')
  })

  it('joins parts with a space', () => {
    expect(normalizeClassNameParts(['flex', 'items-center'])).toBe(
      'flex items-center',
    )
  })

  it('returns an empty string for blank input', () => {
    expect(normalizeClassNameParts(['\n   \n'])).toBe('')
  })
})

describe('comments', () => {
  it('drops a comment line', () => {
    expect(normalizeClassNameParts(['\n// hello\ntext-sm\n'])).toBe('text-sm')
  })

  it('drops a trailing comment but keeps the classes before it', () => {
    expect(normalizeClassNameParts(['flex // center it\nitems-center'])).toBe(
      'flex items-center',
    )
  })

  it('drops a comment that runs to the end of the template', () => {
    expect(normalizeClassNameParts(['flex // center it'])).toBe('flex')
  })

  it('handles \\r\\n line endings', () => {
    expect(normalizeClassNameParts(['flex\r\n// note\r\nitems-center'])).toBe(
      'flex items-center',
    )
  })
})

describe('arbitrary values containing //', () => {
  it('keeps a url in an arbitrary value', () => {
    expect(
      normalizeClassNameParts(['bg-[url(https://a.com/x.png)] flex']),
    ).toBe('bg-[url(https://a.com/x.png)] flex')
  })

  it('keeps // inside an arbitrary content value', () => {
    expect(normalizeClassNameParts(["content-['//'] underline"])).toBe(
      "content-['//'] underline",
    )
  })

  it('only starts a comment at a token boundary', () => {
    expect(normalizeClassNameParts(['before:content-[//] flex'])).toBe(
      'before:content-[//] flex',
    )
  })
})
