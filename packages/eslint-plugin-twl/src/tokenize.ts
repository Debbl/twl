/** A class name in one static part of a template, by offset into that part. */
export interface ClassToken {
  part: number
  start: number
  end: number
  value: string
}

export interface ScannedTemplate {
  /**
   * Class names in source order, split into groups. A group never spans a
   * `//` comment, an interpolation, or a blank line, so reordering inside a
   * group can never move a class past something the author placed there.
   */
  groups: ClassToken[][]
  /** Indices of interpolations that sit inside a `//` comment. */
  commented: number[]
}

/** Whitespace that may separate class names inside a template. */
function isWhitespace(code: number) {
  return (
    code === 32 || // space
    code === 10 || // \n
    code === 9 || // \t
    code === 13 || // \r
    code === 12 || // \f
    code === 11 // \v
  )
}

function isBlankLine(gap: string) {
  return gap.indexOf('\n') !== gap.lastIndexOf('\n')
}

/**
 * Scans the static parts of a class name template the way twl's
 * `normalizeClassNameParts` reads them: an interpolation is a token boundary,
 * and a comment only starts at a token boundary and runs to the end of the
 * line - across interpolations, which it then swallows.
 */
export function scanTemplate(parts: readonly string[]): ScannedTemplate {
  const groups: ClassToken[][] = []
  const commented: number[] = []
  let group: ClassToken[] = []
  let inComment = false

  const closeGroup = () => {
    if (group.length > 0) groups.push(group)
    group = []
  }

  for (const [part, text] of parts.entries()) {
    const length = text.length
    let index = 0

    if (inComment) {
      const newline = text.indexOf('\n')
      if (newline === -1) {
        index = length
      } else {
        index = newline
        inComment = false
      }
    }

    while (index < length) {
      const gapStart = index
      while (index < length && isWhitespace(text.charCodeAt(index))) index++
      if (isBlankLine(text.slice(gapStart, index))) closeGroup()
      if (index >= length) break

      // A token opening with `//` comments out the rest of the line.
      if (text.charCodeAt(index) === 47 && text.charCodeAt(index + 1) === 47) {
        closeGroup()
        while (index < length && text.charCodeAt(index) !== 10) index++
        if (index >= length) inComment = true
        continue
      }

      const start = index
      while (index < length && !isWhitespace(text.charCodeAt(index))) index++
      group.push({ part, start, end: index, value: text.slice(start, index) })
    }

    closeGroup()
    if (part < parts.length - 1 && inComment) commented.push(part)
  }

  return { groups, commented }
}
