import { cn } from 'twl/macro'

export function Button({ cn: className }: { cn: string }) {
  return <button className={cn`p-2 ${className}`} />
}
