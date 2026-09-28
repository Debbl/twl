// Offline renderer: drives the app in headless Chrome (?export) through a
// private Vite server with live reload off.
//
//   node scripts/render.ts stills --t 1.5,7,14.6 [--only logo] [--out dir]
//   node scripts/render.ts sheet --from 0 --to 15 [--n 16] [--cols 4] [--cuts] [--out file.png]
//   node scripts/render.ts video [--from 0] [--to 15] [--samples auto] [--shutter 0.2] [--out file.mp4]
//   node scripts/render.ts perf --from 0 --to 5 [--samples 1]
//
// --samples N averages N sub-frames per frame over shutter x (1/fps); --samples
// auto picks the count per frame (4, 12, 36, 108 or 324, see Engine.render).
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { createServer } from 'vite'
import { WebSocketServer } from 'ws'
import type { Page } from 'playwright-core'
import type { AdaptiveSampling } from '../src/engine/engine.ts'
import type { PromoApi, StreamOptions } from '../src/main.ts'

const argv = process.argv.slice(2)
const mode = argv[0] ?? 'stills'
const opt = (k: string, d?: string) => {
  const i = argv.indexOf(`--${k}`)
  return i >= 0 ? argv[i + 1] : d
}
const flag = (k: string) => argv.includes(`--${k}`)
const num = (k: string, d: number) => Number(opt(k, String(d)))

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(APP, 'out')
const SAMPLES: number | AdaptiveSampling =
  opt('samples', '1') === 'auto'
    ? {
        min: num('min-samples', 4),
        max: num('max-samples', 324),
        tol: num('tol', 3),
      }
    : num('samples', 1)
const SHUTTER = num('shutter', 0.5)
const log = (s: string) => process.stdout.write(`${s}\n`)
const hist = (h: Record<string, number>) =>
  Object.entries(h)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([k, v]) => `${k}:${v}`)
    .join(' ')

// Callbacks passed to page.evaluate are serialised and run in the browser, so
// they reach the page API through `window.__promo` directly.

process.env.PROMO_NO_HMR = '1'
const server = await createServer({
  root: APP,
  logLevel: 'error',
  server: { port: 0 },
})
await server.listen()
const url = server.resolvedUrls?.local[0]?.replace(/\/$/, '')
if (!url) throw new Error('vite did not start')

const browser = await chromium.launch({
  channel: 'chrome',
  headless: !flag('headed'),
  args: [
    '--use-angle=metal',
    '--enable-gpu-rasterization',
    '--ignore-gpu-blocklist',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
  ],
})
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
})
const logs: string[] = []
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning')
    logs.push(`[${m.type()}] ${m.text()}`)
})
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))

const only = opt('only')
await page.goto(`${url}/?export${only ? `&only=${only}` : ''}`)
await page.waitForFunction(
  () => window.__promo?.ready === true || window.__promo?.error !== undefined,
  null,
  {
    timeout: 120000,
  },
)
const bootError = await page.evaluate(() => window.__promo?.error)
if (bootError)
  throw new Error(`app failed to boot:\n${bootError}\n${logs.join('\n')}`)
const sceneErrors = await page.evaluate(
  () => (window.__promo as PromoApi).errors,
)
if (sceneErrors.length)
  process.stderr.write(`SCENE ERRORS:\n${sceneErrors.join('\n')}\n`)

async function stills(p: Page, times: number[], dir: string) {
  mkdirSync(dir, { recursive: true })
  for (const t of times) {
    const k = await p.evaluate(
      ([t, s, sh]) => (window.__promo as PromoApi).still(t, s, sh),
      [t, SAMPLES, SHUTTER] as const,
    )
    const file = path.join(dir, `f_${t.toFixed(2).padStart(6, '0')}.png`)
    await p.screenshot({
      path: file,
      clip: { x: 0, y: 0, width: 1920, height: 1080 },
    })
    log(`${file}${k > 1 ? `  (${k} sub-frames)` : ''}`)
  }
}

async function sheet(p: Page, times: number[], cols: number, file: string) {
  const dataUrl = await p.evaluate(
    ({ times, cols }) => {
      const cw = 480
      const ch = 270
      const pad = 4
      const lab = 18
      const rows = Math.ceil(times.length / cols)
      const cv = document.createElement('canvas')
      cv.width = cols * (cw + pad) + pad
      cv.height = rows * (ch + lab + pad) + pad
      const c = cv.getContext('2d')
      if (!c) throw new Error('no 2d context')
      c.fillStyle = '#222'
      c.fillRect(0, 0, cv.width, cv.height)
      const src = document.getElementById('c') as HTMLCanvasElement
      times.forEach((t, i) => {
        ;(window.__promo as PromoApi).still(t)
        const x = pad + (i % cols) * (cw + pad)
        const y = pad + Math.floor(i / cols) * (ch + lab + pad)
        c.drawImage(src, x, y + lab, cw, ch)
        c.fillStyle = '#ddd'
        c.font = '13px monospace'
        c.fillText(`${t.toFixed(2)}s`, x + 2, y + 13)
      })
      return cv.toDataURL('image/png')
    },
    { times, cols },
  )
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, Buffer.from(dataUrl.split(',')[1] ?? '', 'base64'))
  log(file)
}

async function video(
  p: Page,
  from: number,
  to: number,
  fps: number,
  file: string,
) {
  mkdirSync(path.dirname(file), { recursive: true })
  const audio = path.join(APP, 'public/audio/score.wav')
  const args = [
    '-y',
    '-loglevel',
    'error',
    '-f',
    'rawvideo',
    '-pix_fmt',
    'rgba',
    '-s',
    '1920x1080',
    '-r',
    String(fps),
    '-i',
    'pipe:0',
  ]
  if (!flag('noaudio'))
    args.push('-ss', String(from), '-t', String(to - from), '-i', audio)
  args.push(
    '-vf',
    'vflip',
    '-c:v',
    'libx264',
    '-preset',
    opt('preset', 'slow')!,
    '-crf',
    opt('crf', '16')!,
  )
  args.push(
    '-pix_fmt',
    'yuv420p',
    '-tune',
    'grain',
    '-x264-params',
    'aq-mode=3',
  )
  args.push(
    '-color_primaries',
    'bt709',
    '-color_trc',
    'bt709',
    '-colorspace',
    'bt709',
  )
  if (!flag('noaudio')) args.push('-c:a', 'aac', '-b:a', '320k', '-shortest')
  args.push('-movflags', '+faststart', file)
  const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] })
  const ffDone = new Promise<void>((res, rej) =>
    ff.on('close', (code) =>
      code === 0 ? res() : rej(new Error(`ffmpeg exited ${code}`)),
    ),
  )

  const total = Math.round(to * fps) - Math.round(from * fps)
  let frames = 0
  let allReceived: () => void = () => {}
  const received = new Promise<void>((res) => {
    allReceived = res
  })
  const t0 = performance.now()
  const wss = new WebSocketServer({
    port: 0,
    maxPayload: 1920 * 1080 * 4 + 1024,
  })
  await new Promise<void>((res) => wss.once('listening', () => res()))
  const address = wss.address()
  const port =
    typeof address === 'object' && address !== null ? address.port : 0
  wss.on('connection', (socket) => {
    socket.on('message', (data: Buffer) => {
      // the page waits for acks, so ffmpeg's backpressure reaches it
      const flushed = ff.stdin.write(data)
      const ack = () => {
        frames++
        socket.send(String(frames))
        if (frames % 60 === 0 || frames === total) {
          const el = (performance.now() - t0) / 1000
          process.stdout.write(
            `\r${frames}/${total} frames  ${(frames / el).toFixed(1)} fps  eta ${((total - frames) / (frames / el)).toFixed(0)}s   `,
          )
        }
        if (frames === total) allReceived()
      }
      if (flushed) ack()
      else ff.stdin.once('drain', ack)
    })
  })
  const o: StreamOptions = {
    from,
    to,
    fps,
    ws: `ws://localhost:${port}`,
    samples: SAMPLES,
    shutter: SHUTTER,
    inflight: 4,
  }
  const used = await p.evaluate(
    (o) => (window.__promo as PromoApi).stream(o),
    o,
  )
  await received
  ff.stdin.end()
  await ffDone
  wss.close()
  log(
    `\nwrote ${file} (${frames} frames in ${((performance.now() - t0) / 1000).toFixed(1)}s)`,
  )
  log(`sub-frames per frame (count:frames): ${hist(used)}`)
}

try {
  if (mode === 'stills') {
    const times = (opt('t') ?? '0').split(',').map(Number)
    await stills(page, times, opt('out', path.join(OUT, 'stills'))!)
  } else if (mode === 'sheet') {
    const from = num('from', 0)
    const to = num('to', 15)
    const n = num('n', 16)
    let times = Array.from(
      { length: n },
      (_, i) => from + ((to - from) * i) / Math.max(1, n - 1),
    )
    const at = opt('times')
    if (at) times = at.split(',').map(Number)
    if (flag('cuts')) {
      const tl = await page.evaluate(
        () => (window.__promo as PromoApi).timeline,
      )
      times = tl
        .slice(1)
        .flatMap((e) => [
          e.start - 0.1,
          e.start - 1 / 60,
          e.start + 1 / 60,
          e.start + 0.1,
        ])
    }
    await sheet(
      page,
      times,
      num('cols', 4),
      opt('out', path.join(OUT, `sheet_${from}-${to}.png`))!,
    )
  } else if (mode === 'perf') {
    const from = num('from', 0)
    const to = num('to', 5)
    const r = await page.evaluate(
      async ({ from, to, samples, shutter }) => {
        const P = window.__promo as PromoApi
        const ms: number[] = []
        P.still(from)
        for (let t = from; t < to; t += 1 / 60) {
          const a = performance.now()
          P.still(t, samples, shutter)
          ms.push(performance.now() - a)
        }
        ms.sort((a, b) => a - b)
        return {
          n: ms.length,
          avg: ms.reduce((a, b) => a + b, 0) / ms.length,
          p95: ms[Math.floor(ms.length * 0.95)] ?? 0,
        }
      },
      { from, to, samples: SAMPLES, shutter: SHUTTER },
    )
    log(`frames ${r.n}  avg ${r.avg.toFixed(1)}ms  p95 ${r.p95.toFixed(1)}ms`)
  } else if (mode === 'video') {
    const dur = await page.evaluate(() => (window.__promo as PromoApi).duration)
    await video(
      page,
      num('from', 0),
      num('to', dur),
      num('fps', 60),
      path.resolve(opt('out', path.join(OUT, 'twl-promo.mp4'))!),
    )
  } else {
    throw new Error(`unknown mode ${mode}`)
  }
  if (logs.length)
    process.stderr.write(`BROWSER LOG:\n${logs.slice(0, 40).join('\n')}\n`)
} finally {
  await browser.close()
  await server.close()
}
