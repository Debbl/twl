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
  findParent?: (predicate: (path: any) => boolean) => any
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

function ensureTwMergeImport(programPath: any, babel: MacroParams['babel']) {
  const t = babel.types
  const bodyPaths = programPath?.get?.('body') ?? []

  for (const bodyPath of bodyPaths) {
    if (!bodyPath?.isImportDeclaration?.()) continue
    if (bodyPath.node.source.value !== 'tailwind-merge') continue

    for (const specifier of bodyPath.node.specifiers ?? []) {
      if (
        t.isImportSpecifier(specifier) &&
        t.isIdentifier(specifier.imported) &&
        specifier.imported.name === 'twMerge'
      ) {
        return specifier.local.name
      }
    }
  }

  let localName = 'twMerge'
  if (programPath?.scope?.hasBinding?.(localName)) {
    let index = 1
    while (programPath.scope.hasBinding(`${localName}${index}`)) {
      index += 1
    }
    localName = `${localName}${index}`
  }

  const importDeclaration = t.importDeclaration(
    [t.importSpecifier(t.identifier(localName), t.identifier('twMerge'))],
    t.stringLiteral('tailwind-merge'),
  )

  programPath?.unshiftContainer?.('body', importDeclaration)
  return localName
}

export function twMacro({ references, babel }: MacroParams) {
  const twReferences = Object.values(references).flat() as MacroReferencePath[]

  if (twReferences.length === 0) return

  const programPath = twReferences[0]?.findParent?.((path) =>
    path.isProgram?.(),
  )
  const twMergeLocalName = ensureTwMergeImport(programPath, babel)

  twReferences.forEach((referencePath) => {
    const taggedTemplate = referencePath.parentPath
    if (!taggedTemplate || !taggedTemplate.isTaggedTemplateExpression?.()) {
      throwMacroError(
        referencePath,
        'twl tw macro can only be used as a tagged template.',
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
          'twl tw macro only supports string literal expressions.',
        )
      }

      expressions.push(expressionValue)
    }

    const classNamesList = buildClassNamesList(
      quasi.quasis.map((q) => q.value.raw),
      expressions,
    )
    const result = normalizeClassNames(classNamesList)
    taggedTemplate.replaceWithSourceString(
      `${twMergeLocalName}(${JSON.stringify(result)})`,
    )
  })
}
