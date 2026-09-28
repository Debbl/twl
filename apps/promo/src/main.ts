// Entry: the preview player, or the export API (?export) that
// scripts/render.ts drives in headless Chrome.
import { Engine } from './engine/engine.ts'
import { H, W } from './engine/gl.ts'
import { BAR, BEAT } from './score.ts'
import { FILES, TIMELINE } from './timeline.ts'
import type { AdaptiveSampling } from './engine/engine.ts'
import type { SceneId } from './score.ts'

const params = new URLSearchParams(location.search)
const EXPORT = params.has('export')
const ONLY = params.get('only')
const FROM = params.get('t')

function el<T extends HTMLElement>(id: string) {
  const node = document.getElementById(id)
  if (!node) throw new Error(`#${id} missing`)
  return node as T
}

const canvas = el<HTMLCanvasElement>('c')
canvas.width = W
canvas.height = H
const engine = new Engine(canvas, TIMELINE)

export interface StreamOptions {
  from: number
  to: number
  fps: number
  ws: string
  samples: number | AdaptiveSampling
  shutter: number
  /** Frames sent but not yet acknowledged by the encoder, at most. */
  inflight: number
}

export interface PromoApi {
  ready: boolean
  error?: string
  duration: number
  errors: string[]
  timeline: { id: SceneId; start: number; end: number }[]
  still: (
    t: number,
    samples?: number | AdaptiveSampling,
    shutter?: number,
  ) => number
  stream: (o: StreamOptions) => Promise<Record<number, number>>
}

declare global {
  interface Window {
    __promo?: PromoApi | { ready: false; error: string }
  }
}

async function boot() {
  const only = ONLY ? new Set(ONLY.split(',')) : null
  await engine.init(only ? (e) => only.has(e.id) : undefined)
  if (EXPORT) setupExport()
  else setupPlayer()
}

function setupExport() {
  document.body.classList.add('export')
  window.__promo = {
    ready: true,
    duration: engine.duration,
    errors: engine.errors,
    timeline: TIMELINE.map(({ id, start, end }) => ({ id, start, end })),
    still: (t, samples = 1, shutter = 0.5) =>
      engine.render(t, 1 / 60, true, samples, shutter),
    /**
     * Render [from, to) and stream raw RGBA frames (bottom-up) over a
     * WebSocket. The receiver acknowledges each frame it has handed to the
     * encoder, and at most `inflight` stay unacknowledged.
     */
    async stream(o) {
      const ws = new WebSocket(o.ws)
      ws.binaryType = 'arraybuffer'
      let acked = 0
      ws.addEventListener('message', (e: MessageEvent<unknown>) => {
        if (typeof e.data === 'string')
          acked = Math.max(acked, Number(e.data) || 0)
      })
      await new Promise<void>((res, rej) => {
        ws.addEventListener('open', () => res())
        ws.addEventListener('error', () => rej(new Error('websocket failed')))
      })
      const dt = 1 / o.fps
      const n0 = Math.round(o.from * o.fps)
      const n1 = Math.round(o.to * o.fps)
      const buf = new Uint8Array(W * H * 4)
      const used: Record<number, number> = {}
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
      for (let n = n0; n < n1; n++) {
        const k = engine.render(n * dt, dt, false, o.samples, o.shutter)
        used[k] = (used[k] ?? 0) + 1
        await engine.readPixelsAsync(buf)
        while (n - n0 - acked >= o.inflight) await sleep(2)
        ws.send(buf)
      }
      while (ws.bufferedAmount > 0) await sleep(5)
      ws.close()
      return used
    },
  }
}

function setupPlayer() {
  const audio = new Audio('/audio/score.wav')
  audio.preload = 'auto'
  const ui = el('ui')
  const scrub = el<HTMLInputElement>('scrub')
  const info = el('info')
  const marks = el('marks')
  const errs = el('errs')
  const dur = engine.duration
  scrub.max = String(dur)
  scrub.step = '0.001'
  if (engine.errors.length) {
    errs.textContent = engine.errors.join('\n\n')
    errs.style.display = 'block'
  }

  let t = FROM ? Number(FROM) : 0
  let playing = false
  let loop: [number, number] | null = null
  let lastAudioT = 0
  let lastPerf = 0
  const seek = (x: number) => {
    t = Math.max(0, Math.min(dur - 0.001, x))
    audio.currentTime = t
  }
  seek(t)

  for (const e of TIMELINE) {
    const m = document.createElement('div')
    m.className = 'mark'
    m.style.left = `${(e.start / dur) * 100}%`
    m.style.width = `${((e.end - e.start) / dur) * 100}%`
    m.textContent = e.id
    m.addEventListener('click', () => seek(e.start))
    marks.appendChild(m)
  }

  const toggle = () => {
    playing = !playing
    if (playing) {
      audio.currentTime = t
      void audio.play()
    } else audio.pause()
  }
  canvas.addEventListener('click', toggle)
  scrub.addEventListener('input', () => seek(Number(scrub.value)))
  window.addEventListener('keydown', (ev) => {
    const current = () => TIMELINE.find((x) => t >= x.start && t < x.end)
    if (ev.key === ' ') {
      ev.preventDefault()
      toggle()
    } else if (ev.key === 'ArrowRight') seek(t + (ev.shiftKey ? 5 : 1))
    else if (ev.key === 'ArrowLeft') seek(t - (ev.shiftKey ? 5 : 1))
    else if (ev.key === '.') seek(t + 1 / 60)
    else if (ev.key === ',') seek(t - 1 / 60)
    else if (ev.key === 'l') {
      const e = current()
      loop = loop ? null : e ? [e.start, e.end] : null
    } else if (ev.key === 'h') ui.classList.toggle('hidden')
    else if (ev.key === ']') {
      const e = TIMELINE.find((x) => x.start > t + 0.01)
      if (e) seek(e.start)
    } else if (ev.key === '[') {
      const e = TIMELINE.filter((x) => x.start < t - 0.3).at(-1)
      if (e) seek(e.start)
    }
  })

  let frames = 0
  let fpsT = performance.now()
  let fps = 0
  const tick = () => {
    if (playing) {
      // smooth the coarse audio clock with performance.now()
      const now = performance.now()
      if (audio.currentTime !== lastAudioT) {
        lastAudioT = audio.currentTime
        lastPerf = now
      }
      t = lastAudioT + (audio.paused ? 0 : (now - lastPerf) / 1000)
      if (loop && t >= loop[1]) seek(loop[0])
      if (audio.ended) {
        playing = false
        seek(0)
      }
    }
    engine.render(Math.min(t, dur - 1e-3), 1 / 60)
    scrub.value = String(t)
    frames++
    const now = performance.now()
    if (now - fpsT > 500) {
      fps = (frames * 1000) / (now - fpsT)
      frames = 0
      fpsT = now
    }
    const e = TIMELINE.find((x) => t >= x.start && t < x.end)
    info.textContent = `${t.toFixed(2)}s  bar ${(t / BAR + 1).toFixed(2)}  beat ${(((t / BEAT) % 4) + 1).toFixed(2)}  [${e?.id ?? '—'}]  ${fps.toFixed(0)}fps${loop ? '  LOOP' : ''}`
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)

  if (import.meta.hot) {
    import.meta.hot.on(
      'vite:afterUpdate',
      (payload: { updates: { path: string }[] }) => {
        for (const u of payload.updates) {
          const file = /scenes\/([\w-]+)\.ts/.exec(u.path)?.[1]
          if (!file) continue
          for (const e of TIMELINE)
            if (FILES[e.id] === file) void engine.reload(e.id)
        }
      },
    )
  }
}

boot().catch((err: unknown) => {
  const message =
    err instanceof Error ? (err.stack ?? err.message) : String(err)
  console.error(err)
  document.body.insertAdjacentHTML(
    'beforeend',
    `<pre style="color:#f55;position:fixed;top:0;left:0">${message}</pre>`,
  )
  window.__promo = { ready: false, error: message }
})
