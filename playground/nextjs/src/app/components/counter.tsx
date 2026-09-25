'use client'
import { PartyPopper } from 'lucide-react'
import { useState } from 'react'
import { cls } from 'twl/macro'
import { Button } from '~/components/ui/button'

export default function Counter() {
  const [count, setCount] = useState(0)
  const labelClassName = count > 0 ? 'text-blue-600' : 'text-zinc-700'

  return (
    <Button type='button' variant='outline' onClick={() => setCount(count + 1)}>
      <span
        className={cls`
          inline-flex
          items-center
          gap-2
          ${labelClassName}
        `}
      >
        <PartyPopper />
        Hi {count}
      </span>
    </Button>
  )
}
