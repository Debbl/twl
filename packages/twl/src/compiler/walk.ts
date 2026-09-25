import type { Node } from './types'

/**
 * Depth-first walk over the oxc AST, which is plain ESTree-shaped JSON.
 *
 * The parent is passed along because an identifier only means "a reference to
 * the macro" in some positions, and that can only be told from above.
 */
export function walk(
  node: unknown,
  visit: (node: Node, parent?: Node) => void,
  parent?: Node,
) {
  if (node === null || typeof node !== 'object') return

  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit, parent)
    return
  }

  const record = node as Record<string, unknown>
  const isNode = typeof record.type === 'string'
  if (isNode) visit(record as Node, parent)

  for (const key of Object.keys(record)) {
    if (key !== 'type') {
      walk(record[key], visit, isNode ? (record as Node) : parent)
    }
  }
}

/** 1-based line number of a byte offset, for error messages. */
export function lineAt(code: string, offset: number) {
  let line = 1
  for (let index = 0; index < offset && index < code.length; index++) {
    if (code[index] === '\n') line++
  }
  return line
}
