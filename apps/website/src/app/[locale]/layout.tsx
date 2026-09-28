import { t } from 'best-i18n/macro'
import { setRequestLocale } from 'best-i18n/next/server'
import { LocaleProvider } from 'best-i18n/react'
import { cn } from 'twl/macro'
import { Provider } from '~/components/provider'
import { LOCALES, i18nConfig } from '~/lib/i18n'
import { appName, siteUrl } from '~/lib/shared'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  setRequestLocale(locale)

  // Declared here rather than as app/opengraph-image.png: the file convention
  // drops its .alt.txt in the static export, and a file would override this.
  const image = {
    url: '/og-image.png',
    width: 1200,
    height: 630,
    alt: t`twl: the cn API, compiled. A commented cn template and the plain string it compiles to.`,
  }

  return {
    metadataBase: new URL(siteUrl),
    title: appName,
    description: t`The cn API with macro compilation for commented Tailwind classes and conflict merging.`,
    openGraph: { type: 'website', siteName: appName, images: [image] },
    twitter: { card: 'summary_large_image', images: [image] },
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
        className={cn`
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
