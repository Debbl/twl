import { cn as __twl_cn } from 'twl/runtime';

export function Card({ className }: { className?: string }) {
  return (
    <div
      className={__twl_cn("relative flex flex-col rounded-lg border", className)}
    />
  )
}
