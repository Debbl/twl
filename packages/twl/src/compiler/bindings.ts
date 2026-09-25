import type { Node } from './types'

/** The macro exports this compiler knows how to fold away. */
export type MacroName = 'cls' | 'tw'

export interface MacroBindings {
  /** Local name to the macro it is bound to, aliases included. */
  locals: Map<string, MacroName>
  /** Import declarations to strip, and which specifiers of them. */
  imports: MacroImport[]
  /** Namespace imports of the macro module, which cannot be resolved. */
  namespaces: Array<{ name: string; start: number; request: string }>
}

export interface MacroImport {
  start: number
  end: number
  /** Local names imported from the macro module that are not the macro. */
  kept: string[]
  /** Source text of the module specifier, quotes included. */
  request: string
}

interface StaticImportEntry {
  importName: { kind: string; name?: string | null }
  localName: { value: string }
  isType: boolean
}

export interface StaticImport {
  start: number
  end: number
  moduleRequest: { value: string; start: number; end: number }
  entries: StaticImportEntry[]
}

/**
 * Resolves which local identifiers really refer to the macro export.
 *
 * Matching on the name alone would both miss `import { cls as c }` and rewrite
 * an unrelated `cls` from another library, so the import binding is what
 * counts.
 */
export function resolveMacroBindings(options: {
  code: string
  staticImports: StaticImport[]
  from: string[]
  exportNames: readonly MacroName[]
}): MacroBindings {
  const { code, staticImports, from, exportNames } = options
  const locals = new Map<string, MacroName>()
  const imports: MacroImport[] = []
  const namespaces: MacroBindings['namespaces'] = []

  for (const declaration of staticImports) {
    if (!from.includes(declaration.moduleRequest.value)) continue

    const kept: string[] = []
    let hasMacro = false

    for (const entry of declaration.entries) {
      if (entry.importName.kind === 'NamespaceObject') {
        namespaces.push({
          name: entry.localName.value,
          start: declaration.start,
          request: declaration.moduleRequest.value,
        })
        continue
      }

      const imported = entry.importName.name as MacroName | undefined

      if (
        !entry.isType &&
        imported !== undefined &&
        exportNames.includes(imported)
      ) {
        locals.set(entry.localName.value, imported)
        hasMacro = true
        continue
      }

      kept.push(entry.localName.value)
    }

    if (hasMacro) {
      imports.push({
        start: declaration.start,
        end: declaration.end,
        kept,
        request: code.slice(
          declaration.moduleRequest.start,
          declaration.moduleRequest.end,
        ),
      })
    }
  }

  return { locals, imports, namespaces }
}

/**
 * Positions where an identifier is a name rather than a value reference, so
 * `foo.cls` or `{ cls: 1 }` is not mistaken for macro usage.
 */
export function isNonReferencePosition(parent: Node | undefined, node: Node) {
  if (parent === undefined) return false

  switch (parent.type) {
    case 'MemberExpression':
    case 'JSXMemberExpression':
      return parent.property === node && parent.computed !== true
    case 'Property':
      return parent.key === node && parent.computed !== true
    case 'ImportSpecifier':
    case 'ImportDefaultSpecifier':
    case 'ImportNamespaceSpecifier':
    case 'ExportSpecifier':
      return true
    case 'PropertyDefinition':
    case 'MethodDefinition':
      return parent.key === node
    case 'LabeledStatement':
    case 'BreakStatement':
    case 'ContinueStatement':
      return parent.label === node
    default:
      return false
  }
}

/** Every name a binding pattern introduces. */
export function collectPatternNames(pattern: unknown, out: string[]) {
  if (pattern === null || typeof pattern !== 'object') return

  const node = pattern as Node

  switch (node.type) {
    case 'Identifier':
      out.push(node.name as string)
      break
    case 'ObjectPattern':
      for (const property of node.properties as Node[]) {
        collectPatternNames(
          property.type === 'RestElement' ? property.argument : property.value,
          out,
        )
      }
      break
    case 'ArrayPattern':
      for (const element of node.elements as unknown[]) {
        collectPatternNames(element, out)
      }
      break
    case 'AssignmentPattern':
      collectPatternNames(node.left, out)
      break
    case 'RestElement':
      collectPatternNames(node.argument, out)
      break
    default:
      break
  }
}

/** Names a node declares, so a local binding shadowing the macro is caught. */
export function declaredNames(node: Node) {
  const names: string[] = []

  switch (node.type) {
    case 'VariableDeclarator':
      collectPatternNames(node.id, names)
      break
    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
      if (node.id) collectPatternNames(node.id, names)
      for (const param of node.params as unknown[]) {
        collectPatternNames(param, names)
      }
      break
    case 'ClassDeclaration':
    case 'ClassExpression':
      if (node.id) collectPatternNames(node.id, names)
      break
    case 'CatchClause':
      if (node.param) collectPatternNames(node.param, names)
      break
    default:
      break
  }

  return names
}
