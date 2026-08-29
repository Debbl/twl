import { twMerge } from 'cnfast'
import { cls } from './cls'
import type { ClassValue } from 'cnfast'

export function tw(
  strings: TemplateStringsArray,
  ...expressions: ClassValue[]
) {
  return twMerge(cls(strings, ...expressions))
}
