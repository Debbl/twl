// The twl logo, as geometry. Everything the brand ships is generated from this
// file: the SVGs and PNGs in assets/logo/, the favicon and Open Graph card, the
// docs nav, and the video's logo scene.
//
// Mark: `//` over a bar - a commented group, and the one string it compiles to.
// Wordmark: monoline t, w, l; the w is four slashes at the mark's angle.

export const INK = '#0B0C10'
export const BONE = '#EEF0F4'
export const SIGNAL = '#38BDF8'
export const TILE = '#0B0C10'

/** Every slash leans 18 degrees from vertical, in the mark and in the w. */
export const LEAN = Math.tan((18 * Math.PI) / 180)
/** One stroke weight for mark and wordmark, so they sit together. */
export const WEIGHT = 11

const f = (n: number) => Number(n.toFixed(2))

export type Point = readonly [x: number, y: number]

/** One stroke of the logo: a polyline, or a line ending in a quarter bend. */
export interface Stroke {
  points: readonly Point[]
  /** Control point of a quadratic bend between the last two points. */
  bend?: Point
  role: 'signal' | 'fg'
}

/** The mark in a 120-unit square: two slashes and the bar. */
export function markStrokes(): Stroke[] {
  const slash = (x: number, y: number, h: number): Point[] => [
    [x, y],
    [f(x + LEAN * h), y - h],
  ]
  return [
    { points: slash(41, 74, 46), role: 'signal' },
    { points: slash(61, 74, 46), role: 'signal' },
    {
      points: [
        [36, 91],
        [84, 91],
      ],
      role: 'fg',
    },
  ]
}

/** The wordmark: x-height 30..80, ascenders from 6, baseline 80. */
export function wordmarkStrokes(): { strokes: Stroke[]; right: number } {
  const x = 30
  const b = 80
  const d = LEAN * (b - x)
  const w0 = 52
  const step = d * 1.02
  const lx = f(w0 + 2 * d + 2 * step + 17)
  return {
    right: lx + 12 + WEIGHT / 2,
    strokes: [
      // t stem and crossbar
      {
        points: [
          [20, 10],
          [20, 68],
          [32, b],
        ],
        bend: [20, b],
        role: 'fg',
      },
      {
        points: [
          [9, x],
          [34, x],
        ],
        role: 'fg',
      },
      // w: four slashes, the signal colour when it stands alone
      {
        points: [
          [w0, x],
          [f(w0 + d), b],
          [f(w0 + d + step), x],
          [f(w0 + 2 * d + step), b],
          [f(w0 + 2 * d + 2 * step), x],
        ],
        role: 'signal',
      },
      // l
      {
        points: [
          [lx, 6],
          [lx, 68],
          [f(lx + 12), b],
        ],
        bend: [lx, b],
        role: 'fg',
      },
    ],
  }
}

function pathD(s: Stroke) {
  const pts = s.points
  if (s.bend) {
    const head = pts
      .slice(0, -1)
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`)
    const [ex, ey] = pts[pts.length - 1]!
    return `${head.join(' ')} Q${s.bend[0]} ${s.bend[1]} ${ex} ${ey}`
  }
  return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ')
}

const strokeAttrs = (color: string) =>
  `fill="none" stroke="${color}" stroke-width="${WEIGHT}" stroke-linecap="round" stroke-linejoin="round"`

const paths = (strokes: Stroke[], fg: string, accent: string) =>
  strokes
    .map(
      (s) =>
        `<path d="${pathD(s)}" ${strokeAttrs(s.role === 'signal' ? accent : fg)}/>`,
    )
    .join('')

const svg = (viewBox: string, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>\n`

interface Colors {
  fg?: string
  accent?: string
}

/** The mark alone, in a 120 square. `fg` is the bar: bone on dark, ink on light. */
export function mark({ fg = BONE, accent = SIGNAL }: Colors = {}) {
  return svg('0 0 120 120', paths(markStrokes(), fg, accent))
}

/** The mark on a rounded tile: the app icon and favicon. */
export function icon({
  fg = BONE,
  accent = SIGNAL,
  tile = TILE,
}: Colors & { tile?: string } = {}) {
  return svg(
    '0 0 120 120',
    `<rect width="120" height="120" rx="27" fill="${tile}"/>${paths(markStrokes(), fg, accent)}`,
  )
}

/** The wordmark alone, tightly framed. The w takes the signal colour. */
export function wordmark({ fg = BONE, accent = SIGNAL }: Colors = {}) {
  const { strokes, right } = wordmarkStrokes()
  const left = 9 - WEIGHT / 2
  return svg(
    `${f(left - 2)} ${f(6 - WEIGHT / 2 - 2)} ${f(right - left + 4)} ${f(80 + WEIGHT - 6 + 4)}`,
    paths(strokes, fg, accent),
  )
}

/** Lockup layout: the mark's bar (y 91) moves onto the wordmark's baseline (y 80). */
export function lockupLayout() {
  const { right } = wordmarkStrokes()
  // The mark's strokes span x 30.5..89.5 with their caps.
  const markDx = 2 - 30.5
  const wordDx = markDx + 89.5 + 24 - (9 - WEIGHT / 2)
  return {
    viewBox: `0 ${f(6 - WEIGHT / 2 - 2)} ${f(wordDx + right + 2)} ${f(80 + WEIGHT - 6 + 4)}`,
    markDx: f(markDx),
    markDy: -11,
    wordDx: f(wordDx),
  }
}

/**
 * Mark and wordmark side by side: one weight throughout, the w in `fg` so the
 * signal colour belongs to the mark.
 */
export function lockup({ fg = BONE, accent = SIGNAL }: Colors = {}) {
  const l = lockupLayout()
  const words = wordmarkStrokes().strokes.map((s) => ({
    ...s,
    role: 'fg' as const,
  }))
  return svg(
    l.viewBox,
    `<g transform="translate(${l.markDx} ${l.markDy})">${paths(markStrokes(), fg, accent)}</g><g transform="translate(${l.wordDx} 0)">${paths(words, fg, fg)}</g>`,
  )
}

/** The lockup as path data, for code that draws it itself (the docs nav). */
export function lockupData() {
  const l = lockupLayout()
  const [slashA, slashB, bar] = markStrokes().map(pathD)
  return {
    viewBox: l.viewBox,
    mark: `translate(${l.markDx} ${l.markDy})`,
    word: `translate(${l.wordDx} 0)`,
    weight: WEIGHT,
    signal: SIGNAL,
    slashes: [slashA!, slashB!],
    bar: bar!,
    letters: wordmarkStrokes().strokes.map(pathD),
  }
}
