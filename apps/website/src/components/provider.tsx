'use client'

import { localizePathname } from 'best-i18n/locale-url'
import { i18nProvider } from 'fumadocs-ui/i18n'
import { RootProvider } from 'fumadocs-ui/provider/next'
import { usePathname, useRouter } from 'next/navigation'
import { i18nConfig } from '~/lib/i18n'
import { translations } from '~/lib/layout.shared'
import type { ReactNode } from 'react'

export function Provider({
  locale,
  children,
}: {
  locale: string
  children: ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <RootProvider
      i18n={{
        ...i18nProvider(translations, locale),
        // The default handler swaps the first path segment, but the base
        // locale has no segment - localizePathname knows both spellings.
        onLocaleChange: (next) =>
          router.push(localizePathname(pathname, next, i18nConfig)),
      }}
    >
      {children}
    </RootProvider>
  )
}
