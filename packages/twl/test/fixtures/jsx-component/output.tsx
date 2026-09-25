import { clsx as __twl_clsx } from 'twl';

export function Card({ className }: { className?: string }) {
  return (
    <div
      className={`relative flex flex-col rounded-lg border ${__twl_clsx(className)}`}
    />
  )
}
