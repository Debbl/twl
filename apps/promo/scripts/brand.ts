// Writes every brand asset from src/brand/logo.ts: SVGs, PNGs and the Open Graph card
// into assets/logo/ at the repo root, and the favicon, the OG card and the
// nav's path data into the docs site.
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import {
  BONE,
  INK,
  SIGNAL,
  icon,
  lockup,
  lockupData,
  mark,
  wordmark,
} from '../src/brand/logo.ts'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '../../..')
const out = path.join(repo, 'assets/logo')
mkdirSync(out, { recursive: true })

const svgs = {
  'mark.svg': mark(),
  'mark-light.svg': mark({ fg: INK }),
  'icon.svg': icon(),
  'wordmark.svg': wordmark(),
  'wordmark-light.svg': wordmark({ fg: INK }),
  'lockup.svg': lockup(),
  'lockup-light.svg': lockup({ fg: INK }),
}
for (const [name, body] of Object.entries(svgs))
  writeFileSync(path.join(out, name), body)

// PNGs are rasterized by Chrome, on a transparent background.
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
async function png(svgBody: string, size: number, file: string) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}img{display:block;width:${size}px;height:${size}px}</style><img src="data:image/svg+xml;utf8,${encodeURIComponent(svgBody)}">`,
    { waitUntil: 'load' },
  )
  writeFileSync(
    file,
    await page.screenshot({ type: 'png', omitBackground: true }),
  )
}
for (const [size, name] of [
  [512, 'icon-512.png'],
  [192, 'icon-192.png'],
  [180, 'apple-touch-icon.png'],
  [32, 'favicon-32.png'],
] as const) {
  await png(svgs['icon.svg'], size, path.join(out, name))
}

// Open Graph card, 1200x630. The code on it is real: the template and the
// string twl compiles it to.
const fontFace = (family: string, file: string, weight: number) =>
  `@font-face { font-family: '${family}'; font-weight: ${weight}; src: url(data:font/ttf;base64,${readFileSync(path.join(here, '../public/fonts', file)).toString('base64')}); }`
const svgUrl = (body: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(body)}`
const og = `<!doctype html><meta charset="utf-8"><style>
  ${fontFace('Archivo', 'Archivo-w1000-900.ttf', 900)}
  ${fontFace('Archivo', 'Archivo-w1000-500.ttf', 500)}
  ${fontFace('Plex', 'IBMPlexMono-Regular.ttf', 400)}
  ${fontFace('Plex', 'IBMPlexMono-Medium.ttf', 500)}
  html, body { margin: 0; width: 1200px; height: 630px; background: ${INK}; color: ${BONE}; overflow: hidden; }
  body { position: relative; font-family: Archivo; }
  .rule { position: absolute; background: rgba(238, 240, 244, 0.1); }
  .lockup { position: absolute; left: 72px; top: 64px; height: 50px; }
  h1 { position: absolute; left: 72px; top: 196px; margin: 0; font-weight: 900; font-size: 88px; line-height: 0.95; letter-spacing: -0.035em; }
  h1 em { font-style: normal; color: ${SIGNAL}; }
  .lede { position: absolute; left: 74px; top: 404px; width: 470px; font: 500 25px/1.35 Archivo; color: #9AA1B2; }
  pre { margin: 0; font: 400 22px/1.6 Plex; }
  .code { position: absolute; left: 676px; top: 150px; width: 452px; padding: 26px 30px; box-sizing: border-box; border: 1px solid rgba(238, 240, 244, 0.14); border-radius: 14px; background: #12141A; }
  .dim { color: #6B7385; } .tag { color: ${SIGNAL}; }
  .arrow { position: absolute; left: 700px; top: 426px; font: 500 16px Plex; letter-spacing: 0.12em; color: #6B7385; text-transform: uppercase; }
  .out { position: absolute; left: 676px; top: 458px; width: 452px; padding: 18px 30px; box-sizing: border-box; border-radius: 14px; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.35); }
  .foot { position: absolute; left: 72px; right: 72px; bottom: 44px; display: flex; justify-content: space-between; font: 500 18px Plex; color: #6B7385; letter-spacing: 0.02em; }
  .foot b { color: ${BONE}; font-weight: 500; }
</style>
<div class="rule" style="left:72px;right:72px;top:150px;height:1px;width:520px"></div>
<div class="rule" style="left:72px;right:72px;bottom:88px;height:1px"></div>
<img class="lockup" src="${svgUrl(lockup())}">
<h1>The cn API,<br><em>compiled.</em></h1>
<div class="lede">Commented Tailwind templates for cn, clsx and twMerge, folded to plain strings at build time.</div>
<div class="code"><pre><span class="tag">cn</span>\`
  <span class="dim">// layout</span>
  flex items-center
  <span class="dim">// spacing</span>
  m-2 p-4
\`</pre></div>
<div class="arrow">↓ build</div>
<div class="out"><pre>"flex items-center m-2 p-4"</pre></div>
<div class="foot"><span><b>pnpm add twl</b></span><span>vite · webpack · rspack · esbuild · next.js</span></div>`
await page.setViewportSize({ width: 1200, height: 630 })
await page.setContent(og, { waitUntil: 'load' })
await page.evaluate(() => document.fonts.ready)
writeFileSync(
  path.join(out, 'og-image.png'),
  await page.screenshot({ type: 'png' }),
)

await browser.close()
execFileSync('ffmpeg', [
  '-y',
  '-loglevel',
  'error',
  '-i',
  path.join(out, 'favicon-32.png'),
  path.join(out, 'favicon.ico'),
])

// The docs site: Next picks up app/icon.svg, app/apple-icon.png and
// app/favicon.ico by name, and links them with a content hash.
const site = path.join(repo, 'apps/website')
copyFileSync(path.join(out, 'icon.svg'), path.join(site, 'src/app/icon.svg'))
// Browsers and crawlers ask for /favicon.ico whatever the page links.
copyFileSync(
  path.join(out, 'favicon.ico'),
  path.join(site, 'src/app/favicon.ico'),
)
copyFileSync(
  path.join(out, 'apple-touch-icon.png'),
  path.join(site, 'src/app/apple-icon.png'),
)
// The Open Graph card is served from public/ and declared in the locale
// layout's metadata, which also carries its alt text.
mkdirSync(path.join(site, 'public'), { recursive: true })
copyFileSync(
  path.join(out, 'og-image.png'),
  path.join(site, 'public/og-image.png'),
)

// The nav draws the lockup itself, in currentColor, so it follows the theme.
writeFileSync(
  path.join(site, 'src/lib/logo.generated.ts'),
  `// Generated by apps/promo/scripts/brand.ts from apps/promo/src/brand/logo.ts. Do not edit.\n\nexport const lockup = ${JSON.stringify(lockupData(), null, 2)} as const\n`,
)

process.stdout.write(
  `logo assets written to ${path.relative(repo, out)}/ and apps/website\n`,
)
