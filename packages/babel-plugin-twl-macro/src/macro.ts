import * as t from '@babel/types'
import { createMacro } from 'babel-plugin-macros'
import { normalizeClassNameParts } from 'twl/compiler'
import { twMerge as runtimeTwMerge } from 'twl/runtime'
import type { MacroParams } from 'babel-plugin-macros'

const placeholderPattern = /__TWL_EXPR_(\d+)__/g

function getPlaceholder(index: number) {
  return `__TWL_EXPR_${index}__`
}

function toExpression(expression: t.Expression | t.TSType) {
  if (t.isExpression(expression)) {
    return expression
  }

  throw new Error('The macro only supports JavaScript expressions.')
}

function normalizeTemplateLiteral(quasi: t.TemplateLiteral) {
  const parts: string[] = []

  for (const [index, templateElement] of quasi.quasis.entries()) {
    if (
      templateElement.value.cooked === null ||
      templateElement.value.cooked === undefined
    ) {
      throw new Error('Invalid escape in macro template.')
    }
    parts.push(templateElement.value.cooked)

    if (index < quasi.expressions.length) {
      parts.push(getPlaceholder(index))
    }
  }

  return normalizeClassNameParts(parts)
}

function buildArguments(
  normalized: string,
  expressions: readonly (t.Expression | t.TSType)[],
) {
  const args: t.Expression[] = []
  let cursor = 0
  let kept = 0
  for (const match of normalized.matchAll(placeholderPattern)) {
    const text = normalized.slice(cursor, match.index).trim()
    if (text) args.push(t.stringLiteral(text))
    args.push(toExpression(expressions[Number(match[1])]))
    cursor = match.index + match[0].length
    kept++
  }
  const tail = normalized.slice(cursor).trim()
  if (tail) args.push(t.stringLiteral(tail))
  if (kept !== expressions.length)
    throw new Error('Interpolation inside a comment cannot be compiled.')
  return args
}

function twlMacro({ references }: MacroParams) {
  for (const name of ['cn', 'clsx', 'twMerge'] as const) {
    const macroReferences = references[name] || []

    macroReferences.forEach((referencePath) => {
      if (
        referencePath.parentPath &&
        referencePath.parentPath.isTaggedTemplateExpression()
      ) {
        const taggedTemplate = referencePath.parentPath

        const templateExpression =
          taggedTemplate.node as t.TaggedTemplateExpression
        const quasi = templateExpression.quasi

        const normalized = normalizeTemplateLiteral(quasi)
        if (quasi.expressions.length === 0) {
          taggedTemplate.replaceWith(
            t.stringLiteral(
              name === 'clsx' ? normalized : runtimeTwMerge(normalized),
            ),
          )
        } else {
          const args = buildArguments(normalized, quasi.expressions)
          const program = referencePath.findParent((path) => path.isProgram())
          if (!program?.isProgram())
            throw new Error('Cannot find the macro program.')
          const runtime = program.scope.generateUidIdentifier(name)
          program.unshiftContainer(
            'body',
            t.importDeclaration(
              [t.importSpecifier(runtime, t.identifier(name))],
              t.stringLiteral('twl/runtime'),
            ),
          )
          taggedTemplate.replaceWith(t.callExpression(runtime, args))
        }
      } else {
        const program = referencePath.findParent((path) => path.isProgram())
        if (!program?.isProgram())
          throw new Error('Cannot find the macro program.')
        const runtime = program.scope.generateUidIdentifier(name)
        program.unshiftContainer(
          'body',
          t.importDeclaration(
            [t.importSpecifier(runtime, t.identifier(name))],
            t.stringLiteral('twl/runtime'),
          ),
        )
        referencePath.replaceWith(runtime)
      }
    })
  }
}

const twlMacroPlugin = createMacro(twlMacro)

export const cn = twlMacroPlugin as unknown as typeof import('twl/macro').cn
export const clsx = twlMacroPlugin as unknown as typeof import('twl/macro').clsx
export const twMerge =
  twlMacroPlugin as unknown as typeof import('twl/macro').twMerge

export default twlMacroPlugin
