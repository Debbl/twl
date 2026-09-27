import { useState } from 'react'
import { cn } from 'twl/macro'
import { Button } from './button'

export function App() {
  const [count, setCount] = useState(0)

  return (
    <main
      className={cn`
        // layout
        flex min-h-dvh flex-col items-center justify-center gap-6
        // surface
        bg-neutral-50 text-neutral-900
        dark:bg-neutral-950 dark:text-neutral-50
      `}
    >
      <h1 className={cn`text-2xl font-semibold tracking-tight`}>twl · vite</h1>

      <Button
        variant={count % 2 === 0 ? 'primary' : 'ghost'}
        onClick={() => setCount(count + 1)}
      >
        clicked {count} times
      </Button>

      <p
        className={cn`
          // Every class name on this page was folded at build time.
          max-w-prose text-center text-sm text-neutral-500
        `}
      >
        View source on the built bundle: no template literals, no twl runtime.
      </p>
    </main>
  )
}
