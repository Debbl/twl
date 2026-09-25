'use client'

import { ScrollArea } from '@base-ui/react/scroll-area'
import { cls } from 'twl/macro'

/**
 * A code sample that scrolls sideways rather than wrapping.
 *
 * The scrollbar is an overlay that fades in on hover or while scrolling, so a
 * sample that happens to fit is not framed by a permanent grey bar - and a
 * sample that does not fit still says so the moment you reach for it. Native
 * overflow would either take layout space or hide the affordance entirely,
 * depending on the platform.
 *
 * Highlighting is applied once by `HighlightRoot`, not here.
 */
export function CodeBlock({
  label,
  children,
}: {
  label: string
  children: string
}) {
  return (
    <div
      className={cls`
        // card
        flex min-w-0 flex-col overflow-hidden rounded-lg border
        border-neutral-200 dark:border-neutral-800
      `}
    >
      <div
        className={cls`
          // label strip
          border-b px-4 py-2 text-xs font-medium
          border-neutral-200 bg-neutral-50 text-neutral-500
          dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400
        `}
      >
        {label}
      </div>

      {/* `flex-1` so the shorter sample's pane still fills its card:
          the two are the same height, and the code is top-aligned in both.
          `min-h-0` lets that pane shrink instead of forcing the card open. */}
      <ScrollArea.Root
        className={cls`min-h-0 min-w-0 flex-1 bg-(--syntax-background)`}
      >
        <ScrollArea.Viewport
          className={cls`
            max-w-full overscroll-x-contain
            focus-visible:outline-2 focus-visible:-outline-offset-2
            focus-visible:outline-blue-500
          `}
        >
          <ScrollArea.Content>
            {/* `w-max` lets the longest line set the width, which is what
                gives the viewport something to scroll. */}
            <pre className={cls`w-max min-w-full p-4 text-[12px]/relaxed`}>
              <code className='language-tsx'>{children}</code>
            </pre>
          </ScrollArea.Content>
        </ScrollArea.Viewport>

        <ScrollArea.Scrollbar
          orientation='horizontal'
          className={cls`
            // overlay: no layout space, visible only when it is useful
            m-1 flex h-1.5 touch-none select-none
            rounded-full opacity-0 transition-opacity delay-200
            data-hovering:opacity-100 data-hovering:delay-0
            data-scrolling:opacity-100 data-scrolling:delay-0
          `}
        >
          <ScrollArea.Thumb
            className={cls`
              rounded-full bg-neutral-400/60
              dark:bg-neutral-500/60
            `}
          />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  )
}
