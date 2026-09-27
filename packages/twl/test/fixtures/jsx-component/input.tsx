import { cn } from 'twl/macro'

export function Card({ className }: { className?: string }) {
  return (
    <div
      className={cn`
        // surface
        relative flex flex-col
        rounded-lg border
        ${className}
      `}
    />
  )
}
