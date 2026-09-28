import { normalizeClassNameParts } from 'twl/compiler'
import { describe, expect, it } from 'vitest'
import { scanTemplate } from '../src/tokenize'

function groupsOf(parts: string[]) {
  return scanTemplate(parts).groups.map((group) =>
    group.map((token) => token.value),
  )
}

/** What the compiler keeps of a template, with `$n` for interpolation n. */
function viaScan(parts: string[]) {
  const { groups, commented } = scanTemplate(parts)
  const out: string[] = []
  for (const [part] of parts.entries()) {
    for (const group of groups) {
      if (group[0]!.part === part) out.push(...group.map((t) => t.value))
    }
    if (part < parts.length - 1 && !commented.includes(part)) {
      out.push(`$${part}`)
    }
  }
  return out.join(' ')
}

function viaCompiler(parts: string[]) {
  const withPlaceholders = parts.flatMap((part, index) =>
    index < parts.length - 1 ? [part, `$${index}`] : [part],
  )
  return normalizeClassNameParts(withPlaceholders)
}

describe('scanTemplate', () => {
  it('splits groups at comments', () => {
    expect(
      groupsOf([
        `
        // layout
        items-center flex
        // spacing
        p-4 m-2
      `,
      ]),
    ).toEqual([
      ['items-center', 'flex'],
      ['p-4', 'm-2'],
    ])
  })

  it('splits groups at trailing comments', () => {
    expect(groupsOf(['p-4 m-2 // note\n flex block'])).toEqual([
      ['p-4', 'm-2'],
      ['flex', 'block'],
    ])
  })

  it('splits groups at blank lines, not at single line breaks', () => {
    expect(groupsOf(['p-4\n  m-2\n\n  flex\n  \n  block'])).toEqual([
      ['p-4', 'm-2'],
      ['flex'],
      ['block'],
    ])
  })

  it('splits groups at interpolations', () => {
    expect(groupsOf(['p-4 m-2 ', ' flex block'])).toEqual([
      ['p-4', 'm-2'],
      ['flex', 'block'],
    ])
  })

  it('only starts a comment at a token boundary', () => {
    expect(
      groupsOf(["bg-[url(https://a.com/x.png)] content-['//'] p-2"]),
    ).toEqual([['bg-[url(https://a.com/x.png)]', "content-['//']", 'p-2']])
  })

  it('finds interpolations swallowed by a comment', () => {
    const { commented, groups } = scanTemplate([
      'p-2 // off ',
      ' still off ',
      '\n flex ',
      '',
    ])
    expect(commented).toEqual([0, 1])
    expect(groups.map((g) => g.map((t) => t.value))).toEqual([
      ['p-2'],
      ['flex'],
    ])
  })

  it.each([
    [['p-2 p-4']],
    [['\n // a\n p-2 // b\n p-4 ']],
    [['p-2 // x ', ' y\n p-4 ', '']],
    [['// all ', '', '']],
    [['a//b c', '//d', ' e\nf']],
    [["content-['//'] ", '// ', '\n', '']],
    [['p-2\n\n\n p-4 ', ' ', ' //']],
  ])('agrees with the compiler on %j', (parts) => {
    expect(viaScan(parts)).toBe(viaCompiler(parts))
  })
})
