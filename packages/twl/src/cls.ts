import { clsx } from 'cnfast'
import { normalizeClassNameParts } from './normalize'
import type { ClassValue } from 'cnfast'

export function cls(
  strings: TemplateStringsArray,
  ...expressions: ClassValue[]
) {
  const classNamesList = strings.reduce((prev, current, currentIndex) => {
    const expression = expressions[currentIndex] || ''
    prev.push(current, clsx(expression))
    return prev
  }, [] as string[])

  return normalizeClassNameParts(classNamesList)
}
