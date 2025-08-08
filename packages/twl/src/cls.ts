import { clsx } from 'clsx'
import type { ClassValue } from 'clsx'

function normalizeStrings(strings: string[]) {
  const lineCommentPattern = /\/\/.*((\r?\n)|$)/g

  let result = strings.join(' ')

  if (result.includes('//')) {
    result = result.replace(lineCommentPattern, '')
  }

  return result.replace(/\s+/g, ' ').trim()
}

export function cls(
  strings: TemplateStringsArray,
  ...expressions: ClassValue[]
) {
  const classNamesList = strings.reduce((prev, current, currentIndex) => {
    const expression = expressions[currentIndex] || ''
    prev.push(current, clsx(expression))
    return prev
  }, [] as string[])

  return normalizeStrings(classNamesList)
}
