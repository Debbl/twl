// The edit and the score in one place. Scene windows, the moments a scene acts
// on (a comment typed, two classes swapped, a slam) and the music are all
// derived from the same beat grid, so picture and sound cannot drift: the
// synth in scripts/score.ts renders these events, the scenes animate to them.
//
// 128 BPM, 4/4: a bar is 1.875 s and the film is exactly 8 bars (15 s).

export const BPM = 128
export const BEAT = 60 / BPM
export const BAR = BEAT * 4
export const BARS = 8
export const DURATION = BAR * BARS

/** Time of beat `beat` (0..3, fractions allowed) of bar `n` (0-based). */
export const at = (n: number, beat = 0) => (n * 4 + beat) * BEAT

// ---------------------------------------------------------------- the edit --

/** Scene windows, cut on downbeats. */
export const SCENES = [
  { id: 'mess', from: 0, to: 2, title: 'a className, as found' },
  { id: 'write', from: 2, to: 4, title: 'written as groups' },
  { id: 'sort', from: 4, to: 5, title: 'sorted inside each group' },
  { id: 'compile', from: 5, to: 6, title: 'compiled at build time' },
  { id: 'logo', from: 6, to: 8, title: 'twl' },
] as const

export type SceneId = (typeof SCENES)[number]['id']

/**
 * The mess: one real-world className, conflicts and all (p-2 and p-4 both
 * set padding). It types out a class at a time, faster and faster.
 */
export const MESS_CLASSES = [
  'flex',
  'items-center',
  'justify-between',
  'gap-2',
  'px-4',
  'py-2',
  'p-2',
  'rounded-lg',
  'border',
  'border-slate-200',
  'bg-white',
  'text-sm',
  'font-medium',
  'text-slate-900',
  'shadow-sm',
  'hover:bg-slate-50',
  'focus-visible:outline-none',
  'focus-visible:ring-2',
  'focus-visible:ring-sky-500',
  'disabled:pointer-events-none',
  'disabled:opacity-50',
  'md:px-6',
  'md:py-3',
  'dark:border-slate-800',
  'dark:bg-slate-950',
  'dark:text-slate-50',
  'dark:hover:bg-slate-900',
  'p-4',
  'transition-colors',
  'duration-150',
  'ease-out',
  'data-[state=open]:bg-slate-100',
  'aria-disabled:cursor-not-allowed',
] as const

/** Classes that fight over the same property: highlighted as the mess piles up. */
export const MESS_CONFLICTS: readonly string[] = ['p-2', 'p-4', 'px-4', 'py-2']

/** When class i of the mess appears: accelerating from the first beat to the end of bar 1. */
export const messAt = (i: number) =>
  at(0, 0.25) + (at(1, 3.75) - at(0, 0.25)) * (i / MESS_CLASSES.length) ** 0.62

/** The template the film follows. Each group's classes start unsorted. */
export const GROUPS = [
  {
    comment: '// layout',
    before: ['items-center', 'flex'],
    after: ['flex', 'items-center'],
  },
  { comment: '// spacing', before: ['p-4', 'm-2'], after: ['m-2', 'p-4'] },
  {
    comment: '// color',
    before: ['text-white', 'bg-sky-500'],
    after: ['bg-sky-500', 'text-white'],
  },
] as const

/** What twl compiles the sorted template to (checked against the compiler). */
export const COMPILED = 'flex items-center m-2 p-4 bg-sky-500 text-white'

/** When each comment line types in: one beat per group, on bar 2. */
export const TYPING = GROUPS.map((g, i) => ({
  start: at(2, i + 0.5),
  end: at(2, i + 1.25),
  chars: g.comment.length,
}))

/** Times each character of comment `line` lands. */
export function typedAt(line: number): number[] {
  const w = TYPING[line]
  if (!w) return []
  return Array.from(
    { length: w.chars },
    (_, i) => w.start + ((w.end - w.start) * i) / w.chars,
  )
}

/** Each group's classes drop in on the beat after its comment. */
export const CLASSES_IN = GROUPS.map((_, i) => at(3, i))

/** Sorting: one swap per group, on the first three beats of bar 4. */
export const SWAPS = GROUPS.map((_, i) => ({
  start: at(4, i),
  end: at(4, i + 0.5),
}))

/** Compiling, beat by beat through bar 5. */
export const COMPILE = {
  /** Comments are struck through and fall away. */
  strike: at(5, 0),
  /** Whitespace collapses: the classes close up into one line. */
  collapse: at(5, 1),
  /** The quotes land around the string. */
  quote: at(5, 2),
  /** The string shrinks to a bar; silence before the drop. */
  shrink: at(5, 3),
} as const

/** The logo lands on the downbeat of bar 6. */
export const LOGO = {
  impact: at(6),
  wordmark: at(6, 2),
  tagline: at(7),
  install: at(7, 2),
} as const

// ---------------------------------------------------------------- the music --

export type HitKind =
  | 'kick'
  | 'clap'
  | 'hat'
  | 'openHat'
  | 'tick'
  | 'blip'
  | 'whoosh'
  | 'impact'

export interface Hit {
  t: number
  kind: HitKind
  /** 0..1 */
  vel: number
  /** Frequency in Hz, for pitched hits. */
  hz?: number
  /** -1 (left) .. 1 (right) */
  pan?: number
}

export interface Chord {
  t: number
  /** Bass root, Hz. */
  root: number
  /** Pad voicing, Hz. */
  notes: readonly number[]
}

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12)

/** One chord per bar: Am Am F C G F C C. */
export const CHORDS: readonly Chord[] = [
  { t: at(0), root: midi(33), notes: [midi(57), midi(60), midi(64)] },
  { t: at(1), root: midi(33), notes: [midi(57), midi(60), midi(64), midi(69)] },
  { t: at(2), root: midi(29), notes: [midi(53), midi(57), midi(60), midi(65)] },
  { t: at(3), root: midi(36), notes: [midi(55), midi(60), midi(64), midi(67)] },
  { t: at(4), root: midi(31), notes: [midi(55), midi(59), midi(62), midi(67)] },
  { t: at(5), root: midi(29), notes: [midi(53), midi(57), midi(60), midi(65)] },
  {
    t: at(6),
    root: midi(36),
    notes: [midi(48), midi(55), midi(60), midi(64), midi(67)],
  },
  {
    t: at(7),
    root: midi(36),
    notes: [midi(48), midi(55), midi(60), midi(64), midi(72)],
  },
]

function buildHits(): Hit[] {
  const hits: Hit[] = []
  const add = (
    t: number,
    kind: HitKind,
    vel: number,
    extra: Partial<Hit> = {},
  ) => hits.push({ t, kind, vel, ...extra })

  // Intro: a kick on each downbeat, sparse hats.
  add(at(0), 'kick', 0.9)
  add(at(1), 'kick', 0.9)
  add(at(1, 2), 'kick', 0.6)
  for (let b = 0; b < 8; b++)
    add(at(0, b + 0.5), 'hat', 0.25 + (b % 2) * 0.1, { pan: 0.3 })

  // Bars 2-4: four on the floor, claps on 2 and 4, eighth hats.
  for (let n = 2; n <= 4; n++) {
    for (let b = 0; b < 4; b++) add(at(n, b), 'kick', b === 0 ? 1 : 0.85)
    add(at(n, 1), 'clap', 0.8)
    add(at(n, 3), 'clap', 0.8)
    for (let b = 0; b < 8; b++)
      add(at(n, b / 2), 'hat', b % 2 ? 0.45 : 0.22, { pan: 0.25 })
    add(at(n, 3.5), 'openHat', 0.35, { pan: -0.2 })
  }

  // Bar 5, compiling: three kicks, a clap roll into silence on beat 4.
  for (let b = 0; b < 3; b++) add(at(5, b), 'kick', 0.95)
  add(at(5, 1), 'clap', 0.8)
  for (let i = 0; i < 8; i++) add(at(5, 2 + i / 8), 'clap', 0.25 + i * 0.07)
  add(COMPILE.strike, 'whoosh', 0.5, { pan: -0.4 })
  add(COMPILE.collapse, 'whoosh', 0.6, { pan: 0.4 })
  add(COMPILE.quote, 'blip', 0.55, { hz: midi(81) })

  // Bars 6-7, the logo: the impact, then a half-time pulse under the chord.
  add(LOGO.impact, 'impact', 1)
  add(LOGO.impact, 'kick', 1)
  add(at(6, 2), 'kick', 0.55)
  add(at(7), 'kick', 0.7)
  add(at(7, 2), 'kick', 0.45)
  for (let b = 0; b < 8; b++) add(at(6, b + 0.5), 'hat', 0.12, { pan: 0.3 })
  // a rising arpeggio as the wordmark writes
  const arp = [72, 76, 79, 84, 79, 84, 88, 91]
  arp.forEach((n, i) =>
    add(LOGO.wordmark + (i * BEAT) / 2, 'blip', 0.28 - i * 0.015, {
      hz: midi(n),
      pan: i % 2 ? 0.35 : -0.35,
    }),
  )

  // Picture-driven sounds: the mess typing out, the comments typing, a blip per swap.
  MESS_CLASSES.forEach((c, i) =>
    add(
      messAt(i),
      'tick',
      (MESS_CONFLICTS.includes(c) ? 0.7 : 0.4) + ((i * 5) % 3) * 0.05,
      { pan: ((i * 11) % 9) / 9 - 0.45 },
    ),
  )
  TYPING.forEach((_, line) =>
    typedAt(line).forEach((t, i) =>
      add(t, 'tick', 0.35 + ((i * 7) % 5) * 0.05, {
        pan: ((i * 13) % 7) / 7 - 0.5,
      }),
    ),
  )
  CLASSES_IN.forEach((t) => add(t, 'blip', 0.35, { hz: midi(76) }))
  SWAPS.forEach((s, i) => {
    add(s.start, 'whoosh', 0.3, { pan: i - 1 })
    add(s.end, 'blip', 0.5, { hz: midi([79, 83, 86][i] ?? 79) })
  })

  return hits.sort((a, b) => a.t - b.t)
}

export const HITS: readonly Hit[] = buildHits()

/** A riser under bar 5, cut dead on the last beat. */
export const RISER = { start: at(5), end: COMPILE.shrink }

/** Everything but the drums is silent from the shrink until the logo lands. */
export const GAP = { start: COMPILE.shrink + 0.03, end: LOGO.impact }
