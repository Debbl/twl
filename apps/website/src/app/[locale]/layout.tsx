import { t } from 'best-i18n/macro'
import { setRequestLocale } from 'best-i18n/next/server'
import { LocaleProvider } from 'best-i18n/react'
import { cls } from 'twl/macro'
import { Provider } from '~/components/provider'
import { LOCALES, i18nConfig } from '~/lib/i18n'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)

  return {
    title: 'twl',
    description: t`Write long Tailwind class names across several lines, with comments, and pay nothing for it at runtime.`,
  }
}

// Only the prefixed locales. English is served unprefixed by `(unprefixed)`,
// which is generated from this tree at config load - asking for it here too
// would build every page twice.
export function generateStaticParams() {
  return LOCALES.filter((locale) => locale !== i18nConfig.baseLocale).map(
    (locale) => ({ locale }),
  )
}

export const dynamicParams = false

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={cls`
          // surface
          min-h-dvh bg-white text-neutral-900
          dark:bg-neutral-950 dark:text-neutral-100
          // type
          font-sans antialiased
        `}
      >
        <LocaleProvider locale={locale} config={i18nConfig}>
          <Provider locale={locale}>{children}</Provider>
        </LocaleProvider>
      </body>
    </html>
  )
}
