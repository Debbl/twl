// Small math and animation helpers. Every visual is a pure function of time
// (or seeded), so any frame renders the same in the preview and the export.

export const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
export const fract = (x: number) => x - Math.floor(x)
export const TAU = Math.PI * 2

export type Ease = (t: number) => number

export const ease = {
  linear: (t: number) => t,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  inCubic: (t: number) => t * t * t,
  outCubic: (t: number) => 1 - (1 - t) ** 3,
  inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  inOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2,
  outQuart: (t: number) => 1 - (1 - t) ** 4,
  inOutQuart: (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2),
  inExpo: (t: number) => (t <= 0 ? 0 : 2 ** (10 * t - 10)),
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
  inOutExpo: (t: number) =>
    t <= 0
      ? 0
      : t >= 1
        ? 1
        : t < 0.5
          ? 2 ** (20 * t - 10) / 2
          : (2 - 2 ** (-20 * t + 10)) / 2,
  outBack: (t: number) => {
    const s = 1.70158
    return 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2
  },
} satisfies Record<string, Ease>

/** Clamped, eased progress of x through [a, b]. */
export const prog = (x: number, a: number, b: number, fn: Ease = ease.linear) =>
  fn(clamp((x - a) / (b - a)))

/** 1 at t0, halving every `hl` seconds after it; 0 before. */
export const pulse = (t: number, t0: number, hl = 0.12) =>
  t < t0 ? 0 : 0.5 ** ((t - t0) / hl)

/** Damped spring response to a step at time 0: 0 -> 1 with overshoot. */
export const springStep = (t: number, freq = 4, damping = 0.35) => {
  if (t <= 0) return 0
  const w = TAU * freq
  return (
    1 -
    Math.exp(-damping * w * t) *
      Math.cos(w * Math.sqrt(1 - damping * damping) * t)
  )
}

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * The 60 fps frame nearest t. Constant over a frame's motion-blur shutter, so
 * per-frame flicker shows one state per frame instead of blending two.
 */
export const frameIdx = (t: number) => Math.round(t * 60)

/** Stateless hash of numbers to [0, 1). */
export function hash(...xs: number[]) {
  let h = 2166136261 >>> 0
  for (const x of xs) {
    h ^= Math.floor(x * 1000003) | 0
    h = Math.imul(h, 16777619)
    h ^= h >>> 13
    h = Math.imul(h, 0x5bd1e995)
    h ^= h >>> 15
  }
  return (h >>> 0) / 4294967296
}

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
export function noise1(x: number, seed = 0) {
  const i = Math.floor(x)
  return lerp(hash(i, seed) * 2 - 1, hash(i + 1, seed) * 2 - 1, fade(x - i))
}

export type Key = [time: number, value: number, easeFn?: Ease]
/** Piecewise interpolation through keyframes; key i's ease shapes the segment ending at it. */
export function keys(t: number, ks: readonly Key[]): number {
  const first = ks[0]
  if (first === undefined) return 0
  if (t <= first[0]) return first[1]
  for (let i = 1; i < ks.length; i++) {
    const k = ks[i]!
    if (t <= k[0]) {
      const p = ks[i - 1]!
      return lerp(
        p[1],
        k[1],
        (k[2] ?? ease.inOutCubic)((t - p[0]) / (k[0] - p[0])),
      )
    }
  }
  return ks[ks.length - 1]![1]
}

/** sRGB hex to linear RGB, for GL uniforms. */
export function hexToLinear(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.replace('#', ''), 16)
  const lin = (v: number) => {
    const s = v / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return [lin((n >> 16) & 255), lin((n >> 8) & 255), lin(n & 255)]
}
