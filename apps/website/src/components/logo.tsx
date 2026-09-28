import { lockup } from '~/lib/logo.generated'
import { appName } from '~/lib/shared'

/**
 * The twl lockup, drawn inline so the bar and letters take `currentColor`
 * and follow the theme; the slashes keep the signal colour.
 */
export function Logo({ className }: { className?: string }) {
  const stroke = {
    fill: 'none',
    strokeWidth: lockup.weight,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const

  return (
    <svg
      viewBox={lockup.viewBox}
      className={className}
      role='img'
      aria-label={appName}
    >
      <g transform={lockup.mark}>
        {lockup.slashes.map((d) => (
          <path key={d} d={d} stroke={lockup.signal} {...stroke} />
        ))}
        <path d={lockup.bar} stroke='currentColor' {...stroke} />
      </g>
      <g transform={lockup.word}>
        {lockup.letters.map((d) => (
          <path key={d} d={d} stroke='currentColor' {...stroke} />
        ))}
      </g>
    </svg>
  )
}
