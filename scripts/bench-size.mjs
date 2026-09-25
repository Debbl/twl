// Weighs the JavaScript the playground ships with the compiler on and off, so
// the numbers in the README are reproducible rather than remembered.
//
//   node scripts/bench-size.mjs
//   node scripts/bench-size.mjs --compare   # deltas against the baseline
//   node scripts/bench-size.mjs --write     # record a new baseline
//
// The baseline is `scripts/bench-baseline.json`, committed. Git is the
// history: the diff on that file is what a change costs, next to the change
// itself. A run that moves the numbers on purpose updates it in the same
// commit, so the file reviews itself and cannot silently go stale.
//
// Method: build the playground, then add up every `/_next/static/*.js` the
// rendered HTML references, resolved to files on disk. That is what a browser
// actually downloads for the page, which server chunks and unreferenced assets
// are not.
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const playground = path.join(root, 'playground', 'nextjs')
const baselineFile = path.join(root, 'scripts', 'bench-baseline.json')

const VARIANTS = [
  { label: 'compiled', env: {} },
  { label: 'runtime', env: { TWL_COMPILE: '0' } },
]

function build(env) {
  const result = spawnSync('npx', ['next', 'build'], {
    cwd: playground,
    env: { ...process.env, ...env },
    encoding: 'utf8',
  })

  if (result.status !== 0) {
    process.stderr.write(result.stdout ?? '')
    process.stderr.write(result.stderr ?? '')
    throw new Error('playground build failed')
  }
}

/** Every rendered HTML file the build produced. */
function pages() {
  const dir = path.join(playground, '.next', 'server', 'app')
  if (!existsSync(dir)) return []

  return readdirSync(dir, { recursive: true })
    .filter((name) => String(name).endsWith('.html'))
    .map((name) => path.join(dir, String(name)))
}

/** The client scripts a page references, resolved to files on disk. */
function scriptsOf(html) {
  const source = readFileSync(html, 'utf8')
  const referenced = new Set()

  for (const match of source.matchAll(/\/_next\/(static\/[^"'\\\s)]+?\.js)/g)) {
    referenced.add(match[1])
  }

  return [...referenced]
    .map((asset) => path.join(playground, '.next', asset))
    .filter((file) => existsSync(file))
}

function weigh() {
  const files = new Set()
  const perPage = {}

  for (const html of pages()) {
    const scripts = scriptsOf(html)
    let gzip = 0

    for (const file of scripts) {
      files.add(file)
      gzip += gzipSync(readFileSync(file)).length
    }

    perPage[path.basename(html)] = gzip
  }

  let gzip = 0
  let raw = 0
  for (const file of files) {
    const bytes = readFileSync(file)
    raw += bytes.length
    gzip += gzipSync(bytes).length
  }

  return { gzip, raw, files: files.size, pages: perPage }
}

function versions() {
  const read = (file) => JSON.parse(readFileSync(file, 'utf8'))
  const twl = read(path.join(root, 'packages', 'twl', 'package.json'))
  const app = read(path.join(playground, 'package.json'))

  return { twl: twl.version, next: app.dependencies.next }
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(2)} kB`
}

function delta(now, before) {
  if (before === undefined) return ''
  const diff = now - before
  if (diff === 0) return '  =='
  return `  ${diff > 0 ? '+' : ''}${(diff / 1024).toFixed(2)} kB`
}

const args = new Set(process.argv.slice(2))
const baseline =
  args.has('--compare') && existsSync(baselineFile)
    ? JSON.parse(readFileSync(baselineFile, 'utf8'))
    : undefined

const measured = {}
for (const variant of VARIANTS) {
  process.stderr.write(`building playground (${variant.label})...\n`)
  build(variant.env)
  measured[variant.label] = weigh()
}

const width = Math.max(...VARIANTS.map((variant) => variant.label.length))
process.stdout.write(
  `\nplayground client JS, per the HTML that references it\n\n`,
)

for (const variant of VARIANTS) {
  const { gzip, raw, files } = measured[variant.label]
  const before = baseline?.variants?.[variant.label]

  process.stdout.write(
    `  ${variant.label.padEnd(width)}  ${kb(gzip).padStart(10)} gzip  ` +
      `${kb(raw).padStart(10)} raw  ${String(files).padStart(3)} files` +
      `${delta(gzip, before?.gzip)}\n`,
  )
}

const saved = measured.runtime.gzip - measured.compiled.gzip
const percent = ((saved / measured.runtime.gzip) * 100).toFixed(1)
process.stdout.write(
  `\n  compiling saves ${kb(saved)} gzip (${percent}% of what the runtime build ships)\n`,
)

if (args.has('--write')) {
  const record = {
    recordedAt: new Date().toISOString().slice(0, 10),
    node: process.version,
    versions: versions(),
    variants: measured,
  }
  writeFileSync(baselineFile, `${JSON.stringify(record, null, 2)}\n`)
  process.stdout.write(`\n  baseline written to scripts/bench-baseline.json\n`)
}
