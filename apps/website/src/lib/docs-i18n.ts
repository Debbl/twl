import { defineI18n } from 'fumadocs-core/i18n'
import { i18nConfig } from './i18n'

// Locale routing for the docs content. The UI strings on the landing page go
// through best-i18n instead - see `lib/i18n.ts`, which this mirrors so the two
// never disagree about which locales exist.
export const docsI18n = defineI18n({
  defaultLanguage: i18nConfig.baseLocale,
  languages: [...i18nConfig.locales],
  // English lives at the root: /docs, with /zh/docs beside it. `[locale]` is
  // the only tree written by hand; @best-i18n/next-unprefixed-locale mirrors
  // it into `(unprefixed)` with English pinned - see next.config.ts.
  hideLocale: 'default-locale',
})
