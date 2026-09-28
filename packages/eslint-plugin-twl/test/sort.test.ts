import { describe, expect, it } from 'vitest'
import { sortClasses } from '../src/sort'

describe('sortClasses', () => {
  it('puts unknown classes first, then sorts by order', () => {
    expect(
      sortClasses(
        [
          { value: 'p-4', order: 3n },
          { value: 'custom', order: null },
          { value: 'flex', order: 1n },
          { value: 'other', order: null },
        ],
        { preserveDuplicates: false },
      ),
    ).toEqual(['custom', 'other', 'flex', 'p-4'])
  })

  it('drops repeated known classes unless told to keep them', () => {
    const classes = [
      { value: 'p-4', order: 2n },
      { value: 'x', order: null },
      { value: 'p-4', order: 2n },
      { value: 'x', order: null },
    ]
    expect(sortClasses(classes, { preserveDuplicates: false })).toEqual([
      'x',
      'x',
      'p-4',
    ])
    expect(sortClasses(classes, { preserveDuplicates: true })).toEqual([
      'x',
      'x',
      'p-4',
      'p-4',
    ])
  })
})
