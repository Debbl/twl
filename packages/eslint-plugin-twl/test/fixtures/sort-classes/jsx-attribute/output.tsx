import { cn } from 'twl/macro'

export function Card({ active }: { active: boolean }) {
  return (
    <div
      className={cn`
        // layout
        flex items-center
        // spacing
        m-2 p-4
        ${active && 'ring-2'}
        text-sm font-bold
      `}
    />
  )
}
