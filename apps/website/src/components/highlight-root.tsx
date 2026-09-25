'use client'

import { highlightAll } from 'microlighter'
import { useEffect, useRef } from 'react'
import 'microlighter/themes/github.css'
import type { ReactNode } from 'react'

/**
 * Highlights every code block underneath it, in one pass.
 *
 * `CSS.highlights` is a global registry keyed by category, and each
 * `highlightAll` call replaces the entry for every category it produces - so
 * two roots highlighted separately leave only the last one coloured. One root
 * around all the blocks is the whole fix.
 */
export function HighlightRoot({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // CSS Custom Highlight API: it colours ranges of the existing text rather
    // than wrapping every token in a span, so the markup stays exactly what
    // the build emitted.
    if (ref.current) void highlightAll({ root: ref.current })
  }, [])

  return (
    <div ref={ref} data-syntax-theme='github' className='contents'>
      {children}
    </div>
  )
}
