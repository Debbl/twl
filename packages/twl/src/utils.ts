export function buildClassNamesList(
  strings: ReadonlyArray<string>,
  expressions: ReadonlyArray<string>,
) {
  const classNamesList: string[] = []

  for (let i = 0; i < strings.length; i += 1) {
    classNamesList.push(strings[i])
    const expression = expressions[i]
    if (expression) {
      classNamesList.push(expression)
    }
  }

  return classNamesList
}

export function normalizeClassNames(strings: string[]) {
  const lineCommentPattern = /\/\/.*((\r?\n)|$)/g

  let result = strings.join(' ')

  if (result.includes('//')) {
    result = result.replace(lineCommentPattern, '')
  }

  return result.replace(/\s+/g, ' ').trim()
}
