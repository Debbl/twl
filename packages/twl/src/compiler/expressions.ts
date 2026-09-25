import type { Node } from './types'

/**
 * Whether an expression is certainly a string already.
 *
 * The runtime passes every interpolation through `clsx`, so an object, an
 * array or `undefined` becomes a class list rather than `"[object Object]"`.
 * The compiled output has to do the same - but wrapping a value that is
 * already a string would be a call for nothing, and class name code is full
 * of `${active ? 'ring-2' : ''}`, so those are worth recognizing.
 *
 * Only syntax is consulted, never types: a compiler that trusted a `string`
 * annotation would be wrong for every `as` cast and every `any`.
 */
export function isProvablyString(node: Node): boolean {
  switch (node.type) {
    case 'Literal':
      return typeof node.value === 'string'

    // An untagged template always evaluates to a string, whatever it holds.
    case 'TemplateLiteral':
      return true

    case 'ConditionalExpression':
      return (
        isProvablyString(node.consequent as Node) &&
        isProvablyString(node.alternate as Node)
      )

    // `+` yields a string as soon as one side is one.
    case 'BinaryExpression':
      return (
        node.operator === '+' &&
        (isProvablyString(node.left as Node) ||
          isProvablyString(node.right as Node))
      )

    case 'ParenthesizedExpression':
      return isProvablyString(node.expression as Node)

    // `a && 'b'` is `false` when `a` is, which `clsx` drops and string
    // interpolation would print. Not provable, so it is wrapped.
    default:
      return false
  }
}
