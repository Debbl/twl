import { defineI18nConfig } from 'best-i18n/next/config'

// The site dogfoods best-i18n for its own strings, the same way it dogfoods
// twl for its class names: the docs are built with the things they document.
export const i18nConfig = defineI18nConfig({
  locales: ['en', 'zh'],
  baseLocale: 'en',
})

export const LOCALES = i18nConfig.locales

/**
 * A path under a locale. The base locale is served unprefixed, so it is the
 * one case with no segment to add - see `next.config.ts`.
 */
export function localePath(path: string, locale: string) {
  return locale === i18nConfig.baseLocale ? path : `/${locale}${path}`
}
