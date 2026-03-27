export function normalizeClassNameParts(parts: string[]) {
  const lineCommentPattern = /\/\/.*((\r?\n)|$)/g

  let result = parts.join(' ')

  if (result.includes('//')) {
    result = result.replace(lineCommentPattern, '')
  }

  return result.replace(/\s+/g, ' ').trim()
}
