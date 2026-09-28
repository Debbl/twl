import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Rule fixtures live in `fixtures/<rule>/<case>/`:
 *
 * - `input.tsx` is the code linted with that one rule on.
 * - `output.tsx` is the code after `--fix`; the input again when nothing is
 *   fixable.
 * - `errors.json` is what the rule reports, `[]` for code it accepts.
 * - `config.json`, when present, holds rule `options` and `settings`.
 *
 * ESLint writes `output.tsx` and `errors.json` (`vitest -u`), and the Oxlint
 * suite in `oxlint-plugin-twl` is held to the same committed files.
 */

export type RuleName =
  | 'no-interpolation-in-comment'
  | 'no-namespace-import'
  | 'no-shadowed-macro'
  | 'sort-classes'

export interface TwlSettings {
  from?: string[]
  stylesheet?: string
}

export interface FixtureError {
  messageId: string
  message: string
  line: number
  column: number
}

export interface Fixture {
  rule: RuleName
  name: string
  dir: string
  filename: string
  input: string
  options: Array<{ preserveDuplicates: boolean }>
  settings: { twl: TwlSettings }
}

const fixtures = fileURLToPath(new URL('fixtures', import.meta.url))

export const stylesheet = path.join(fixtures, 'tailwind.css')

interface FixtureConfig {
  options?: Fixture['options']
  settings?: { twl?: TwlSettings }
}

function directories(dir: string) {
  return readdirSync(dir)
    .filter((name) => statSync(path.join(dir, name)).isDirectory())
    .sort()
}

export function loadFixtures(): Fixture[] {
  return directories(fixtures).flatMap((rule) =>
    directories(path.join(fixtures, rule)).map((name) => {
      const dir = path.join(fixtures, rule, name)
      const configFile = path.join(dir, 'config.json')
      const config: FixtureConfig = existsSync(configFile)
        ? (JSON.parse(readFileSync(configFile, 'utf8')) as FixtureConfig)
        : {}
      const filename = path.join(dir, 'input.tsx')

      return {
        rule: rule as RuleName,
        name,
        dir,
        filename,
        input: readFileSync(filename, 'utf8'),
        options: config.options ?? [],
        // Every case can sort; a case's own settings win.
        settings: { twl: { stylesheet, ...config.settings?.twl } },
      }
    }),
  )
}

/** The committed expectations, for a host that checks rather than writes them. */
export function readExpected(fixture: Fixture) {
  return {
    output: readFileSync(path.join(fixture.dir, 'output.tsx'), 'utf8'),
    errors: JSON.parse(
      readFileSync(path.join(fixture.dir, 'errors.json'), 'utf8'),
    ) as FixtureError[],
  }
}
