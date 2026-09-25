// Bundles a fixture app twice, with the compiler on and off, then weighs the
// real bundles rather than the transform's output.
//
//   pnpm spike
//
// The package tests assert what `transform` emits. This asserts what survives
// a bundler, and it runs against `dist` rather than `src`: that the macro
// import is gone, that no class name template reaches the output, and what the
// difference actually weighs. A claim about shipped bytes has to be made
// against shipped bytes, through the artifact that is actually published.
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { build } from 'esbuild'
import twl from '../dist/esbuild.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const entry = path.join(here, 'fixture', 'src', 'main.ts')

async function bundle(plugins) {
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    minify: true,
    format: 'esm',
    write: false,
    plugins,
  })

  const code = result.outputFiles[0].text

  return { code, raw: code.length, gzip: gzipSync(code).length }
}

const compiled = await bundle([twl()])
const runtime = await bundle([])

// Minification renames every function, so the probe has to be text the source
// carries rather than an identifier: a `//` comment only survives in a bundle
// that still folds the template at runtime.
const COMMENT = '// layout'
const FOLDED = 'flex items-center justify-center'

const checks = [
  ['macro import is gone', !compiled.code.includes('twl/macro')],
  ['class names are folded', compiled.code.includes(FOLDED)],
  ['comments do not ship', !compiled.code.includes(COMMENT)],
  [
    'static tw merge is resolved',
    compiled.code.includes('py-1 px-4 bg-red-600'),
  ],
  ['the runtime build really differs', runtime.code.includes(COMMENT)],
]

let failed = false
for (const [label, ok] of checks) {
  process.stdout.write(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}\n`)
  if (!ok) failed = true
}

const saved = runtime.gzip - compiled.gzip
process.stdout.write(
  `\n  compiled ${compiled.gzip} B gzip  ·  runtime ${runtime.gzip} B gzip` +
    `  ·  saved ${saved} B (${((saved / runtime.gzip) * 100).toFixed(1)}%)\n`,
)

if (failed) process.exit(1)
