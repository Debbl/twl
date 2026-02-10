import { clsx } from 'clsx'
import { buildClassNamesList, normalizeClassNames } from './utils'
import type { ClassValue } from 'clsx'

export function cls(
  strings: TemplateStringsArray,
  ...expressions: ClassValue[]
) {
  const classNamesList = buildClassNamesList(
    strings,
    expressions.map((expression) => clsx(expression)),
  )

  return normalizeClassNames(classNamesList)
}
