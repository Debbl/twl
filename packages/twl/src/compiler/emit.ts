import { normalizeClassNameParts } from '../normalize'

/** NUL, which cannot appear in a class name, so a placeholder never collides. */
const MARK = '\u{0}'

/**
 * Stands in for an interpolation while the template is normalized as one
 * string, which is what the runtime does.
 */
function placeholder(index: number) {
  return `${MARK}${index}${MARK}`
}

const PLACEHOLDER_PATTERN = new RegExp(`${MARK}(\\d+)${MARK}`, 'g')

export interface Interpolation {
  /** Source text of the expression, kept verbatim. */
  text: string
}

export interface CompiledTemplate {
  /** The literal to emit in place of the tagged template. */
  code: string
  /**
   * The class string itself, when the template has no interpolation left and
   * is therefore fully known at build time.
   */
  constant?: string
  /** Indices of interpolations that normalization dropped. */
  dropped: number[]
}

/**
 * Compiles one class name template to the literal it would produce at runtime.
 *
 * Normalization runs over the *cooked* text, because that is what the runtime
 * receives in its `TemplateStringsArray`. The result is escaped on the way
 * out, so a backslash or a backtick survives the round trip.
 */
export function compileTemplate(options: {
  cooked: string[]
  expressions: Interpolation[]
  /** Runtime function used for dynamic templates. */
  runtimeLocal: string
}): CompiledTemplate {
  const { cooked, expressions, runtimeLocal } = options

  const parts: string[] = []
  for (const [index, text] of cooked.entries()) {
    parts.push(text)
    if (index < expressions.length) parts.push(placeholder(index))
  }

  const normalized = normalizeClassNameParts(parts)

  const quasis: string[] = []
  const kept: number[] = []
  let cursor = 0

  for (const match of normalized.matchAll(PLACEHOLDER_PATTERN)) {
    quasis.push(normalized.slice(cursor, match.index))
    kept.push(Number(match[1]))
    cursor = match.index + match[0].length
  }

  const dropped = expressions
    .map((_, index) => index)
    .filter((index) => !kept.includes(index))

  // Nothing interpolated survives, so the whole template is a constant.
  if (kept.length === 0) {
    return {
      code: JSON.stringify(normalized),
      constant: normalized,
      dropped,
    }
  }

  quasis.push(normalized.slice(cursor))

  const args: string[] = []
  for (const [index, quasi] of quasis.entries()) {
    const text = quasi.trim()
    if (text) args.push(JSON.stringify(text))
    const expression = kept[index]
    if (expression !== undefined) args.push(expressions[expression]!.text)
  }

  return { code: `${runtimeLocal}(${args.join(', ')})`, dropped }
}
