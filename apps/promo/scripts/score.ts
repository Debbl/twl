// Renders the soundtrack from src/score.ts to public/audio/score.wav: drums,
// bass and pad synthesised offline, sample by sample, from the same events the
// scenes animate to. Deterministic: the same score always writes the same file.
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { BAR, BEAT, CHORDS, DURATION, GAP, HITS, RISER } from '../src/score.ts'
import type { Hit } from '../src/score.ts'

const RATE = 48000
const N = Math.ceil(DURATION * RATE)

/** A stereo bus. */
class Bus {
  l = new Float32Array(N)
  r = new Float32Array(N)
  /** Add a mono signal `fn(t)` (t in s from `start`) for `dur` seconds, panned. */
  add(start: number, dur: number, pan: number, fn: (t: number) => number) {
    const i0 = Math.max(0, Math.round(start * RATE))
    const i1 = Math.min(N, Math.round((start + dur) * RATE))
    const gl = Math.cos(((pan + 1) * Math.PI) / 4)
    const gr = Math.sin(((pan + 1) * Math.PI) / 4)
    for (let i = i0; i < i1; i++) {
      const v = fn(i / RATE - start)
      this.l[i]! += v * gl
      this.r[i]! += v * gr
    }
  }
}

// Seeded noise, so the file is the same every run.
let seed = 12345
const noise = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0
  return seed / 2147483648 - 1
}

const drums = new Bus()
const tonal = new Bus()
const send = new Bus()

function kick(h: Hit) {
  let phase = 0
  drums.add(h.t, 0.5, 0, (t) => {
    phase += (2 * Math.PI * (44 + 120 * Math.exp(-t * 30))) / RATE
    const click = t < 0.004 ? noise() * (1 - t / 0.004) * 0.4 : 0
    return (Math.sin(phase) * Math.exp(-t * 7.5) + click) * h.vel * 0.95
  })
}

function clap(h: Hit) {
  let lp = 0
  const burst = () => {
    const n = noise()
    lp += (n - lp) * 0.35
    return n - lp
  }
  const env = (t: number) =>
    [0, 0.011, 0.022].reduce(
      (a, o) => a + (t >= o ? Math.exp(-(t - o) * (o < 0.02 ? 90 : 16)) : 0),
      0,
    )
  drums.add(h.t, 0.35, -0.1, (t) => burst() * env(t) * h.vel * 0.35)
  send.add(h.t, 0.35, 0, (t) => burst() * env(t) * h.vel * 0.12)
}

function hat(h: Hit, open: boolean) {
  let lp = 0
  drums.add(h.t, open ? 0.35 : 0.08, h.pan ?? 0, (t) => {
    const n = noise()
    lp += (n - lp) * 0.6
    return (n - lp) * Math.exp(-t * (open ? 11 : 70)) * h.vel * 0.3
  })
}

function tick(h: Hit) {
  drums.add(h.t, 0.03, h.pan ?? 0, (t) => {
    const n = noise() * Math.exp(-t * 900)
    return (
      (n * 0.5 + Math.sin(2 * Math.PI * 3100 * t) * Math.exp(-t * 260) * 0.35) *
      h.vel *
      0.8
    )
  })
}

function blip(h: Hit) {
  const hz = h.hz ?? 880
  const tone = (t: number) =>
    (Math.sin(2 * Math.PI * hz * t) +
      0.3 * Math.sin(2 * Math.PI * hz * 2 * t)) *
    Math.exp(-t * 9) *
    (1 - Math.exp(-t * 400))
  tonal.add(h.t, 0.7, h.pan ?? 0, (t) => tone(t) * h.vel * 0.22)
  send.add(h.t, 0.7, 0, (t) => tone(t) * h.vel * 0.12)
  // a dotted-eighth echo
  tonal.add(
    h.t + BEAT * 0.75,
    0.7,
    -(h.pan ?? 0),
    (t) => tone(t) * h.vel * 0.07,
  )
}

function whoosh(h: Hit) {
  let lp = 0
  const dur = BEAT * 0.9
  drums.add(h.t - dur * 0.6, dur, h.pan ?? 0, (t) => {
    const k = t / dur
    const cutoff = 0.02 + 0.5 * Math.sin(Math.PI * k) ** 2
    lp += (noise() - lp) * cutoff
    return lp * Math.sin(Math.PI * k) ** 2 * h.vel * 0.5
  })
}

function impact(h: Hit) {
  let phase = 0
  let lp = 0
  tonal.add(h.t, 3.6, 0, (t) => {
    phase += (2 * Math.PI * (28 + 34 * Math.exp(-t * 2.2))) / RATE
    lp += (noise() - lp) * (0.02 + 0.3 * Math.exp(-t * 6))
    return (
      (Math.sin(phase) * Math.exp(-t * 1.1) * 0.9 +
        lp * Math.exp(-t * 3) * 0.8) *
      h.vel
    )
  })
  send.add(h.t, 1.5, 0, (t) => {
    lp += (noise() - lp) * 0.2
    return lp * Math.exp(-t * 3.5) * 0.35
  })
}

for (const h of HITS) {
  if (h.kind === 'kick') kick(h)
  else if (h.kind === 'clap') clap(h)
  else if (h.kind === 'hat') hat(h, false)
  else if (h.kind === 'openHat') hat(h, true)
  else if (h.kind === 'tick') tick(h)
  else if (h.kind === 'blip') blip(h)
  else if (h.kind === 'whoosh') whoosh(h)
  else if (h.kind === 'impact') impact(h)
}

// Sidechain: the tonal bus ducks under every kick.
const kicks = HITS.filter((h) => h.kind === 'kick').map((h) => h.t)
function duck(t: number) {
  let d = 1
  for (const k of kicks) {
    if (t >= k && t < k + 0.4) d = Math.min(d, 1 - 0.7 * Math.exp(-(t - k) * 9))
  }
  return d
}

// Bass: offbeat plucks on each chord's root; the logo bars hold a long sub.
const saw = (ph: number) => 2 * (ph - Math.floor(ph + 0.5))
for (const [i, c] of CHORDS.entries()) {
  const end = CHORDS[i + 1]?.t ?? DURATION
  if (c.t >= BAR * 6) {
    tonal.add(
      c.t,
      end - c.t,
      0,
      (t) =>
        Math.sin(2 * Math.PI * c.root * t) *
        0.32 *
        Math.min(1, t * 20) *
        Math.exp(-t * 0.5),
    )
    continue
  }
  if (c.t < BAR * 1) continue
  for (let b = 0; b < 8; b++) {
    const t0 = c.t + (b + 0.5) * (BEAT / 2)
    if (t0 >= end) break
    let lp = 0
    tonal.add(t0, BEAT / 2, 0, (t) => {
      const x = saw(c.root * t) + 0.5 * Math.sin(2 * Math.PI * c.root * t)
      lp += (x - lp) * (0.03 + 0.1 * Math.exp(-t * 18))
      return lp * Math.exp(-t * 7) * 0.5
    })
  }
}

// Pad: detuned saws, a slow filter swell per chord, wide.
for (const [i, c] of CHORDS.entries()) {
  const end = CHORDS[i + 1]?.t ?? DURATION
  const dur = end - c.t + 0.25
  for (const [v, hz] of c.notes.entries()) {
    for (const [side, cents] of [
      [-1, -7],
      [1, 7],
    ] as const) {
      const f = hz * 2 ** (cents / 1200)
      let lp = 0
      const bright = c.t >= BAR * 6 ? 0.09 : 0.035
      tonal.add(c.t, dur, side * 0.6, (t) => {
        lp +=
          (saw(f * t + v * 0.13) - lp) *
          (bright * (0.5 + 0.5 * Math.min(1, t / 1.2)))
        const env = Math.min(1, t / 0.35) * Math.min(1, (dur - t) / 0.3)
        return lp * env * (c.t < BAR ? 0.08 : 0.055)
      })
    }
  }
}

// Riser into the drop: filtered noise and a rising tone, cut dead on the silence.
{
  let lp = 0
  const dur = RISER.end - RISER.start
  tonal.add(RISER.start, dur, 0, (t) => {
    const k = t / dur
    lp += (noise() - lp) * (0.01 + 0.4 * k ** 2)
    return (
      (lp * 0.6 + Math.sin(2 * Math.PI * (220 + 900 * k ** 2) * t) * 0.08) *
      k ** 1.6 *
      0.5
    )
  })
}

// Reverb on the send: four combs into two allpasses (Schroeder).
function reverb(input: Float32Array, offset: number) {
  const out = new Float32Array(N)
  for (const [d, g] of [
    [1557, 0.84],
    [1617, 0.83],
    [1491, 0.85],
    [1422, 0.84],
  ] as const) {
    const len = d + offset
    const buf = new Float32Array(len)
    let j = 0
    for (let i = 0; i < N; i++) {
      const y = buf[j]!
      buf[j] = input[i]! + y * g
      out[i]! += y * 0.25
      j = (j + 1) % len
    }
  }
  for (const [d, g] of [
    [225, 0.5],
    [556, 0.5],
  ] as const) {
    const buf = new Float32Array(d + offset)
    let j = 0
    for (let i = 0; i < N; i++) {
      const b = buf[j]!
      const x = out[i]!
      buf[j] = x + b * g
      out[i] = b - x * g
      j = (j + 1) % buf.length
    }
  }
  return out
}
const wetL = reverb(send.l, 0)
const wetR = reverb(send.r, 23)

// Mix, duck, soft-clip, normalise to -1 dBFS, fade the tail.
const L = new Float32Array(N)
const R = new Float32Array(N)
let peak = 0
for (let i = 0; i < N; i++) {
  const t = i / RATE
  // the drop: tonal bus and reverb gated shut through the gap (5 ms ramps)
  const gate = Math.min(
    1,
    Math.max(0, (GAP.start - t) / 0.005) + Math.max(0, (t - GAP.end) / 0.005),
  )
  const d = duck(t) * gate
  const fade = Math.min(1, (DURATION - t) / 0.35)
  const sc = (x: number) => Math.tanh(x * 1.15) / Math.tanh(1.15)
  L[i] =
    sc((drums.l[i]! + tonal.l[i]! * d + wetL[i]! * 0.9 * gate) * 0.9) * fade
  R[i] =
    sc((drums.r[i]! + tonal.r[i]! * d + wetR[i]! * 0.9 * gate) * 0.9) * fade
  peak = Math.max(peak, Math.abs(L[i]!), Math.abs(R[i]!))
}
const gain = 10 ** (-1 / 20) / Math.max(peak, 1e-6)

// 16-bit PCM WAV
const data = Buffer.alloc(N * 4)
for (let i = 0; i < N; i++) {
  data.writeInt16LE(
    Math.round(Math.max(-1, Math.min(1, L[i]! * gain)) * 32767),
    i * 4,
  )
  data.writeInt16LE(
    Math.round(Math.max(-1, Math.min(1, R[i]! * gain)) * 32767),
    i * 4 + 2,
  )
}
const header = Buffer.alloc(44)
header.write('RIFF', 0)
header.writeUInt32LE(36 + data.length, 4)
header.write('WAVE', 8)
header.write('fmt ', 12)
header.writeUInt32LE(16, 16)
header.writeUInt16LE(1, 20)
header.writeUInt16LE(2, 22)
header.writeUInt32LE(RATE, 24)
header.writeUInt32LE(RATE * 4, 28)
header.writeUInt16LE(4, 32)
header.writeUInt16LE(16, 34)
header.write('data', 36)
header.writeUInt32LE(data.length, 40)

const out = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../public/audio/score.wav',
)
mkdirSync(path.dirname(out), { recursive: true })
writeFileSync(out, Buffer.concat([header, data]))
process.stdout.write(
  `wrote ${path.relative(process.cwd(), out)} (${DURATION.toFixed(2)} s, peak gain ${gain.toFixed(2)})\n`,
)
