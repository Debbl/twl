import { cls } from 'twl/macro'

export function Card({ className }: { className?: string }) {
  return (
    <div
      className={cls`
        // surface
        relative flex flex-col
        rounded-lg border
        ${className}
      `}
    />
  )
}
