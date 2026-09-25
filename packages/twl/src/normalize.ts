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

/**
 * Joins the parts of a class name template into a single class string,
 * dropping `//` line comments and collapsing whitespace.
 *
 * A comment only starts at a token boundary, so arbitrary values that
 * contain `//` are left alone: `bg-[url(https://a.com/x.png)]` and
 * `content-['//']` are class names, not comments.
 */
export function normalizeClassNameParts(parts: string[]) {
  const raw = parts.join(' ')

  // Nothing to strip: collapsing whitespace is all that is left, and the
  // regex does that faster than scanning the string by hand.
  if (!raw.includes('//')) {
    return raw.replace(/\s+/g, ' ').trim()
  }

  const length = raw.length
  let result = ''
  let index = 0

  while (index < length) {
    while (index < length && isWhitespace(raw.charCodeAt(index))) index++
    if (index >= length) break

    // A token opening with `//` comments out the rest of the line.
    if (raw.charCodeAt(index) === 47 && raw.charCodeAt(index + 1) === 47) {
      while (index < length && raw.charCodeAt(index) !== 10) index++
      continue
    }

    const start = index
    while (index < length && !isWhitespace(raw.charCodeAt(index))) index++
    const token = raw.slice(start, index)
    result = result === '' ? token : `${result} ${token}`
  }

  return result
}
