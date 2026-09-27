import {
  clsx as runtimeClsx,
  cn as runtimeCn,
  twJoin,
  twMerge as runtimeTwMerge,
} from 'cn'
import { normalizeClassNameParts } from './normalize'
import type { ClassNameValue, ClassValue } from 'cn'

function isTemplate(value: unknown): value is TemplateStringsArray {
  return Array.isArray(value) && Object.hasOwn(value, 'raw')
}

function normalizeTemplate(
  strings: TemplateStringsArray,
  expressions: readonly unknown[],
  join: (value: unknown) => string,
): string {
  const parts: string[] = []
  for (const [index, text] of strings.entries()) {
    parts.push(text)
    if (index < expressions.length) parts.push(join(expressions[index]))
  }
  return normalizeClassNameParts(parts)
}

/** The cn API with commented template support and compile-time merging. */
export function cn(
  strings: TemplateStringsArray,
  ...expressions: ClassValue[]
): string
export function cn(...inputs: ClassValue[]): string
export function cn(...inputs: unknown[]): string {
  const [first, ...rest] = inputs
  return isTemplate(first)
    ? runtimeTwMerge(
        normalizeTemplate(first, rest, (value) =>
          runtimeClsx(value as ClassValue),
        ),
      )
    : runtimeCn(...(inputs as ClassValue[]))
}

/** Join class values without resolving Tailwind conflicts. */
export function clsx(
  strings: TemplateStringsArray,
  ...expressions: ClassValue[]
): string
export function clsx(...inputs: ClassValue[]): string
export function clsx(...inputs: unknown[]): string {
  const [first, ...rest] = inputs
  return isTemplate(first)
    ? normalizeTemplate(first, rest, (value) =>
        runtimeClsx(value as ClassValue),
      )
    : runtimeClsx(...(inputs as ClassValue[]))
}

/** Merge strings and nested arrays, preserving the twMerge argument contract. */
export function twMerge(
  strings: TemplateStringsArray,
  ...expressions: ClassNameValue[]
): string
export function twMerge(...inputs: ClassNameValue[]): string
export function twMerge(...inputs: unknown[]): string {
  const [first, ...rest] = inputs
  return isTemplate(first)
    ? runtimeTwMerge(
        normalizeTemplate(first, rest, (value) =>
          twJoin(value as ClassNameValue),
        ),
      )
    : runtimeTwMerge(...(inputs as ClassNameValue[]))
}
