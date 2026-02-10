import { buildClassNamesList, normalizeClassNames } from '../utils'
import type { MacroParams } from 'babel-plugin-macros'

interface MacroTaggedTemplatePath {
  isTaggedTemplateExpression?: () => boolean
  replaceWithSourceString: (source: string) => void
  node: {
    quasi: {
      quasis: Array<{ value: { raw: string } }>
      expressions: unknown[]
    }
  }
}

interface MacroReferencePath {
  parentPath?: MacroTaggedTemplatePath | null
  buildCodeFrameError?: (message: string) => Error
}

function getStaticExpressionValue(node: unknown) {
  if (!node || typeof node !== 'object') return null

  const typedNode = node as {
    type?: string
    value?: unknown
    expressions?: unknown[]
    quasis?: Array<{ value: { raw: string } }>
  }

  if (
    typedNode.type === 'StringLiteral' &&
    typeof typedNode.value === 'string'
  ) {
    return typedNode.value
  }

  if (
    typedNode.type === 'TemplateLiteral' &&
    Array.isArray(typedNode.expressions) &&
    typedNode.expressions.length === 0 &&
    Array.isArray(typedNode.quasis)
  ) {
    return typedNode.quasis.map((q) => q.value.raw).join('')
  }

  return null
}

function throwMacroError(path: MacroReferencePath, message: string): never {
  if (path?.buildCodeFrameError) {
    throw path.buildCodeFrameError(message)
  }
  throw new Error(message)
}

export function clsMacro({ references }: MacroParams) {
  const clsReferences = Object.values(references).flat() as MacroReferencePath[]

  clsReferences.forEach((referencePath) => {
    const taggedTemplate = referencePath.parentPath
    if (!taggedTemplate || !taggedTemplate.isTaggedTemplateExpression?.()) {
      throwMacroError(
        referencePath,
        'twl cls macro can only be used as a tagged template.',
      )
    }

    const { quasi } = taggedTemplate.node
    const expressions: string[] = []

    for (const expression of quasi.expressions) {
      if (!expression) {
        expressions.push('')
        continue
      }

      const expressionValue = getStaticExpressionValue(expression)
      if (expressionValue == null) {
        throwMacroError(
          referencePath,
          'twl cls macro only supports string literal expressions.',
        )
      }

      expressions.push(expressionValue)
    }

    const classNamesList = buildClassNamesList(
      quasi.quasis.map((q) => q.value.raw),
      expressions,
    )
    const result = normalizeClassNames(classNamesList)
    taggedTemplate.replaceWithSourceString(JSON.stringify(result))
  })
}
