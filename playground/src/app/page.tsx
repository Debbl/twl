import * as motion from 'motion/react-m'
import { cls } from 'twl/macro'
import { ThemeSwitcher } from '~/components/theme-switcher'
import Counter from './components/counter'

export default function Home() {
  const accentClassName = 'bg-blue-600'

  return (
    <main
      className={cls`
        flex
        h-full
        flex-col
        items-center
        justify-center
        gap-y-4
      `}
    >
      <motion.div
        className={cls`
          size-16
          rounded-md
          border
          ${accentClassName}
        `}
        whileHover={{ scale: 1.1, rotate: '360deg' }}
      />
      <Counter />

      <ThemeSwitcher />
    </main>
  )
}
