import { cls } from 'twl/macro'
import { bestI18nUrl, repoUrl } from '~/lib/shared'
import type { ReactNode } from 'react'

const className = cls`
  underline underline-offset-4
  hover:text-neutral-900 dark:hover:text-neutral-100
`

/**
 * Named components rather than two bare `<a>`s, because `<Trans>` tokenises an
 * element by its tag and falls back to a number once that tag is taken - so
 * two links would read as `<a>` and `<1>`. A number is positional: insert an
 * element before it and every translation points at the wrong one. A name
 * cannot drift, and it tells the translator which link they are moving.
 */
export function TwlRepo({ children }: { children: ReactNode }) {
  return (
    <a href={repoUrl} rel='noreferrer noopener' className={className}>
      {children}
    </a>
  )
}

export function BestI18nRepo({ children }: { children: ReactNode }) {
  return (
    <a href={bestI18nUrl} rel='noreferrer noopener' className={className}>
      {children}
    </a>
  )
}
