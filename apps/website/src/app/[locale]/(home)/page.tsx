'use client'

import { useLocale } from 'best-i18n/react'
import { Trans, useI18n } from 'best-i18n/react/macro'
import Link from 'next/link'
import { cn } from 'twl/macro'
import { CodeBlock } from '~/components/code-block'
import { HighlightRoot } from '~/components/highlight-root'
import { BestI18nRepo, TwlRepo } from '~/components/repo-link'
import { localePath } from '~/lib/i18n'
import { docsRoute } from '~/lib/shared'

const SOURCE = `import { cn } from 'twl/macro'

const button = (
  <button
    className={cn\`
      // layout
      inline-flex items-center gap-2 rounded-md
      // interaction
      cursor-pointer disabled:opacity-50
      \${variant}
    \`}
  />
)`

// Emitted by the compiler for the source above, wrapped by hand only where a
// line would otherwise run off the pane.
const COMPILED = `import { cn as __twl_cn } from 'twl/runtime'

const button = (
  <button
    className={__twl_cn(
      'inline-flex items-center gap-2 rounded-md',
      'cursor-pointer disabled:opacity-50',
      variant,
    )}
  />
)`

export default function HomePage() {
  const t = useI18n()
  const locale = useLocale()

  const features = [
    {
      title: t`Newlines and comments`,
      body: t`Group class names the way you think about them, annotate the groups, and let the compiler fold it all into one string.`,
    },
    {
      title: t`Static templates compile away`,
      body: t`A static template becomes a string literal. A static macro template has its tailwind-merge resolved at build time too.`,
    },
    {
      title: t`Compiler-only entry`,
      body: t`The macro entry contains declarations only. The compiler removes it and imports runtime helpers from twl/runtime.`,
    },
    {
      title: t`Every bundler`,
      body: t`Vite, Rollup, Rolldown, webpack, Rspack, esbuild and Farm through unplugin — and Turbopack through its own loader.`,
    },
  ]

  return (
    <main
      className={cn`
        // layout
        mx-auto flex max-w-4xl flex-col items-center gap-14
        px-6 py-16 text-center sm:py-24
      `}
    >
      <header className={cn`flex w-full flex-col items-center gap-5`}>
        <h1 className={cn`text-4xl font-semibold tracking-tight`}>twl</h1>

        <p
          className={cn`
            max-w-xl text-balance text-base/relaxed
            text-neutral-600 dark:text-neutral-400
          `}
        >
          {t`The cn API with macro compilation for commented Tailwind classes and conflict merging.`}
        </p>

        <div className={cn`flex gap-3`}>
          <Link
            href={localePath(docsRoute, locale)}
            className={cn`
              rounded-full px-5 py-2 text-sm font-medium
              bg-neutral-900 text-white
              dark:bg-neutral-100 dark:text-neutral-900
            `}
          >
            {t`Get started`}
          </Link>
        </div>
      </header>

      {/* Both blocks under one root: the highlight registry is global and a
          second pass would replace the first block's ranges. */}
      <HighlightRoot>
        <div className={cn`grid w-full gap-4 text-left md:grid-cols-2`}>
          <CodeBlock label={t`What you write`}>{SOURCE}</CodeBlock>
          <CodeBlock label={t`What ships`}>{COMPILED}</CodeBlock>
        </div>
      </HighlightRoot>

      <div className={cn`grid w-full gap-4 text-left sm:grid-cols-2`}>
        {features.map((feature) => (
          <div
            key={feature.title}
            className={cn`
              rounded-lg border p-4
              border-neutral-200 dark:border-neutral-800
            `}
          >
            <h2 className={cn`mb-1 font-medium`}>{feature.title}</h2>
            <p
              className={cn`
                text-sm/relaxed text-neutral-600 dark:text-neutral-400
              `}
            >
              {feature.body}
            </p>
          </div>
        ))}
      </div>

      <footer
        className={cn`
          w-full border-t pt-8 text-sm
          border-neutral-200 text-neutral-500
          dark:border-neutral-800 dark:text-neutral-400
        `}
      >
        {/* `Trans` keeps the sentence one translatable unit: the links sit
            inside the message rather than being glued on at either end, so a
            translator can move them where the grammar wants them. */}
        <Trans>
          This page is built with <TwlRepo>twl</TwlRepo> and{' '}
          <BestI18nRepo>best-i18n</BestI18nRepo>. Every class name on it was
          folded at build time, and every string above was inlined for this
          locale.
        </Trans>
      </footer>
    </main>
  )
}
