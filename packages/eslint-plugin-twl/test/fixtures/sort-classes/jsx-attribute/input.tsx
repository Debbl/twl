import { cn } from 'twl/macro'

export function Card({ active }: { active: boolean }) {
  return (
    <div
      className={cn`
        // layout
        items-center flex
        // spacing
        p-4 m-2
        ${active && 'ring-2'}
        font-bold text-sm
      `}
    />
  )
}
