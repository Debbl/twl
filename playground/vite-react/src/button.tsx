import { tw } from 'twl/macro'
import type { ReactNode } from 'react'

interface ButtonProps {
  variant: 'primary' | 'ghost'
  onClick: () => void
  children: ReactNode
}

export function Button({ variant, onClick, children }: ButtonProps) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={tw`
        // layout
        inline-flex h-9 shrink-0 items-center justify-center gap-2
        rounded-md px-4 text-sm font-medium
        // interaction
        cursor-pointer transition-colors outline-none
        focus-visible:ring-2 focus-visible:ring-blue-500
        // the variant wins over the base colours, which is what tw is for
        bg-neutral-200 text-neutral-900
        ${variant === 'primary' ? 'bg-blue-600 text-white' : 'bg-transparent'}
      `}
    >
      {children}
    </button>
  )
}
