// Runs one playground, so the root package.json does not carry a `dev:` and a
// `build:` alias per app.
//
//   pnpm play                 # pick from the list, then `dev`
//   pnpm play nextjs          # `dev` in playground/nextjs
//   pnpm play nextjs build    # any script that playground defines
//   pnpm play vite            # a partial name narrows the list, then picks
//
// The playgrounds consume the built package, so `pnpm build` comes first.
import { spawn } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { cancel, isCancel, select } from '@clack/prompts'

const root = path.dirname(fileURLToPath(new URL('.', import.meta.url)))
const dir = path.join(root, 'playground')

const playgrounds = readdirSync(dir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => ({
    name: entry.name,
    manifest: path.join(dir, entry.name, 'package.json'),
  }))
  .filter((entry) => existsSync(entry.manifest))
  .map(({ name, manifest }) => {
    // The directory name is what you type; the package name
    // (`playground-nextjs`) is pnpm's business, not the argument's.
    const pkg = JSON.parse(readFileSync(manifest, 'utf8'))
    return { name, description: pkg.description, scripts: pkg.scripts ?? {} }
  })
  .sort((a, b) => a.name.localeCompare(b.name))

const [query, script = 'dev'] = process.argv.slice(2)

// An exact name wins over the substring it is a prefix of.
const exact = playgrounds.find((entry) => entry.name === query)
const matches =
  exact === undefined
    ? playgrounds.filter(
        (entry) => query === undefined || entry.name.includes(query),
      )
    : [exact]

if (matches.length === 0) {
  process.stderr.write(
    `no playground matches ${JSON.stringify(query)}. Available: ` +
      `${playgrounds.map((entry) => entry.name).join(', ')}\n`,
  )
  process.exit(1)
}

let chosen = matches[0]

if (matches.length > 1) {
  const answer = await select({
    message: `Which playground? (${script})`,
    options: matches.map((entry) => ({
      value: entry.name,
      label: entry.name,
      hint: entry.description,
    })),
  })

  if (isCancel(answer)) {
    cancel('nothing to run')
    process.exit(0)
  }

  chosen = matches.find((entry) => entry.name === answer)
}

if (chosen.scripts[script] === undefined) {
  process.stderr.write(
    `playground/${chosen.name} has no \`${script}\` script. It defines: ` +
      `${Object.keys(chosen.scripts).join(', ')}\n`,
  )
  process.exit(1)
}

const run = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit' })
    child.on('exit', (status) =>
      status === 0
        ? resolve()
        : reject(new Error(`${command} exited ${status}`)),
    )
  })

// The playgrounds import the package by its `exports` map, which points at
// `dist`, so a stale build is a stale playground.
await run('pnpm', ['--filter', './packages/**', 'build'])
await run('pnpm', ['--filter', `playground-${chosen.name}`, script])
