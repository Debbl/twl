import { twMerge } from 'cn'
import { cls } from './cls'
import type { ClassValue } from 'cn'

export function tw(
  strings: TemplateStringsArray,
  ...expressions: ClassValue[]
) {
  return twMerge(cls(strings, ...expressions))
}
