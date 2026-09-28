import { BONE, INK, SIGNAL } from '../brand/logo.ts'
import { hexToLinear } from './util.ts'

// Ink, bone and one signal colour, the logo's palette. Only the signal glows;
// type stays crisp. See docs/TREATMENT.md.
export const HEX = {
  ink: INK,
  ink2: '#14161C',
  graphite: '#4A5061',
  ash: '#98A0B3',
  bone: BONE,
  signal: SIGNAL,
} as const

export type PaletteKey = keyof typeof HEX

/** Linear RGB triplets for GL. */
export const LIN = Object.fromEntries(
  Object.entries(HEX).map(([k, v]) => [k, hexToLinear(v)]),
) as Record<PaletteKey, [number, number, number]>

/** CSS rgba() for Canvas2D. */
export function rgba(key: PaletteKey, a = 1): string {
  const n = Number.parseInt(HEX[key].replace('#', ''), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}
