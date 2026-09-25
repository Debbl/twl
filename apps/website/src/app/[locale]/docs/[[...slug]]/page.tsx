import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/layouts/docs/page'
import { createRelativeLink } from 'fumadocs-ui/mdx'
import { notFound } from 'next/navigation'
import { getMDXComponents } from '~/components/mdx'
import { source } from '~/lib/source'
import type { Metadata } from 'next'

// One locale at a time, handed down from the layout above: `[locale]` asks for
// each prefixed locale, and the generated `(unprefixed)` twin asks for English
// and drops the `locale` key itself.
export function generateStaticParams({
  params,
}: {
  params: { locale: string }
}) {
  return source
    .generateParams()
    .filter((param) => param.lang === params.locale)
    .map(({ slug }) => ({ slug }))
}

export const dynamicParams = false

export async function generateMetadata(props: {
  params: Promise<{ locale: string; slug?: string[] }>
}): Promise<Metadata> {
  const { locale, slug } = await props.params
  const page = source.getPage(slug, locale)
  if (!page) notFound()

  return { title: page.data.title, description: page.data.description }
}

export default async function Page(props: {
  params: Promise<{ locale: string; slug?: string[] }>
}) {
  const { locale, slug } = await props.params
  const page = source.getPage(slug, locale)
  if (!page) notFound()

  const MDX = page.data.body

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  )
}
