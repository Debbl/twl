import * as t from '@babel/types'
import { createMacro } from 'babel-plugin-macros'
import { normalizeClassNameParts } from 'twl'
import type { MacroParams } from 'babel-plugin-macros'

const placeholderPattern = /__TWL_EXPR_(\d+)__/g

function getPlaceholder(index: number) {
  return `__TWL_EXPR_${index}__`
}

function toExpression(expression: t.Expression | t.TSType) {
  if (t.isExpression(expression)) {
    return expression
  }

  throw new Error('cls macro only supports JavaScript expressions.')
}

function createTemplateElement(value: string, tail: boolean) {
  return t.templateElement({ raw: value, cooked: value }, tail)
}

function normalizeTemplateLiteral(quasi: t.TemplateLiteral) {
  const parts: string[] = []

  for (const [index, templateElement] of quasi.quasis.entries()) {
    parts.push(templateElement.value.raw)

    if (index < quasi.expressions.length) {
      parts.push(getPlaceholder(index))
    }
  }

  return normalizeClassNameParts(parts)
}

function buildReplacement(
  normalized: string,
  expressions: readonly (t.Expression | t.TSType)[],
) {
  const templateExpressions: t.Expression[] = []
  const templateQuasis: string[] = []
  let cursor = 0

  for (const match of normalized.matchAll(placeholderPattern)) {
    const [placeholder, indexValue] = match
    const matchIndex = match.index ?? 0
    const expressionIndex = Number(indexValue)

    templateQuasis.push(normalized.slice(cursor, matchIndex))
    templateExpressions.push(toExpression(expressions[expressionIndex]))
    cursor = matchIndex + placeholder.length
  }

  if (templateExpressions.length === 0) {
    return t.stringLiteral(normalized)
  }

  templateQuasis.push(normalized.slice(cursor))

  return t.templateLiteral(
    templateQuasis.map((value, index) =>
      createTemplateElement(value, index === templateQuasis.length - 1),
    ),
    templateExpressions,
  )
}

function twlMacro({ references }: MacroParams) {
  const clsReferences = references.cls || []

  clsReferences.forEach((referencePath) => {
    if (
      referencePath.parentPath &&
      referencePath.parentPath.isTaggedTemplateExpression()
    ) {
      const taggedTemplate = referencePath.parentPath

      const templateExpression =
        taggedTemplate.node as t.TaggedTemplateExpression
      const quasi = templateExpression.quasi

      const normalized = normalizeTemplateLiteral(quasi)
      const replacement = buildReplacement(normalized, quasi.expressions)

      taggedTemplate.replaceWith(replacement)
    }
  })
}

const clsMacro = createMacro(twlMacro)

export const cls = clsMacro as unknown as typeof import('twl').cls

export default clsMacro
