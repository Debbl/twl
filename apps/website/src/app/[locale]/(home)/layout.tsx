import { HomeLayout } from 'fumadocs-ui/layouts/home'
import { baseOptions } from '~/lib/layout.shared'
import type { ReactNode } from 'react'

// The same nav the docs get, so moving between them does not move the header.
export default async function Layout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return <HomeLayout {...baseOptions(locale)}>{children}</HomeLayout>
}
