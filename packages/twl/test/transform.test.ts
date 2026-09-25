import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { transform } from '../src/compiler'
import type { TransformOptions } from '../src/compiler'

/**
 * Fixtures are directories holding an `input.tsx` and the `output.tsx` it
 * compiles to. Both are real modules: the input imports `cls` from
 * `twl/macro`, which the test config points at the runtime, and the output is
 * the compiled file committed next to it. That makes a change in what the
 * compiler emits show up as a diff of real code, and it lets the parity test
 * below execute both halves rather than compare strings.
 *
 * A case that needs non-default options states them in an `options.json` next
 * to its input.
 *
 * `vitest -u` rewrites every `output.tsx`. The parity suite reads the files as
 * committed, so a run that regenerates them is one run behind - run it twice.
 */

const here = path.dirname(fileURLToPath(import.meta.url))
const fixtures = path.join(here, 'fixtures')

function cases() {
  return readdirSync(fixtures)
    .filter((name) => statSync(path.join(fixtures, name)).isDirectory())
    .filter((name) => name !== 'unchanged' && name !== 'errors')
    .sort()
}

function files(group: string) {
  return readdirSync(path.join(fixtures, group))
    .filter((name) => name.endsWith('.tsx'))
    .sort()
}

function input(name: string) {
  const file = path.join(fixtures, name, 'input.tsx')
  const optionsFile = path.join(fixtures, name, 'options.json')
  const options = existsSync(optionsFile)
    ? (JSON.parse(readFileSync(optionsFile, 'utf8')) as TransformOptions)
    : {}

  return { file, code: readFileSync(file, 'utf8'), options }
}

/** Class names, ignoring how much whitespace ended up between them. */
function classList(value: unknown) {
  return String(value).split(/\s+/).filter(Boolean)
}

describe('input compiles to output', () => {
  for (const name of cases()) {
    it(name, async () => {
      const { file, code, options } = input(name)
      const result = transform(code, file, options)

      expect(result).not.toBeNull()
      await expect(result!.code).toMatchFileSnapshot(
        path.join(fixtures, name, 'output.tsx'),
      )
    })
  }
})

/**
 * The committed output has to produce what the runtime tag produces.
 *
 * Both modules are really imported and run. Two implementations of the same
 * semantics drifting apart is the failure this compiler exists to prevent,
 * and nothing short of executing both of them catches it.
 */
describe('output matches the runtime', () => {
  for (const name of cases()) {
    it(name, async () => {
      // A fixture that exports no value is there for its output alone, and
      // importing it anyway would drag in whatever it renders with - the JSX
      // one needs a React runtime this package has no reason to depend on.
      if (!input(name).code.includes('export const result')) return

      const runtime = (await import(
        path.join(fixtures, name, 'input.tsx')
      )) as Record<string, unknown>
      const compiled = (await import(
        path.join(fixtures, name, 'output.tsx')
      )) as Record<string, unknown>

      expect(compiled.result).toBeTypeOf('string')
      expect(classList(compiled.result)).toEqual(classList(runtime.result))

      // An interpolation is not re-normalized once it has a value, so one that
      // evaluates to nothing leaves behind the space that separated it. That
      // is the single accepted difference; everything else has to be exact.
      if (!input(name).code.includes('${')) {
        expect(compiled.result).toBe(runtime.result)
      }
    })
  }
})

describe('files left alone', () => {
  for (const name of files('unchanged')) {
    it(name, () => {
      const file = path.join(fixtures, 'unchanged', name)

      expect(transform(readFileSync(file, 'utf8'), file)).toBeNull()
    })
  }
})

describe('rejected', () => {
  const expected: Record<string, RegExp> = {
    'namespace-import.tsx': /Import `cls` or `tw` by name instead/,
    'shadowed-binding.tsx': /Rename one of them/,
    'not-a-tag.tsx': /can only be used as a template tag/,
    'interpolation-in-comment.tsx': /sits inside a `\/\/` comment/,
  }

  for (const name of files('errors')) {
    it(name, () => {
      const file = path.join(fixtures, 'errors', name)
      const compile = () => transform(readFileSync(file, 'utf8'), file)

      expect(compile).toThrow(expected[name]!)
      // A diagnostic without a position is not actionable.
      expect(compile).toThrow(/errors\/.+\.tsx:\d+ /)
    })
  }
})

describe('output shape', () => {
  it('leaves untouched code byte for byte', () => {
    const { file, code } = input('jsx-component')

    expect(transform(code, file)!.code).toContain(
      'export function Card({ className }: { className?: string }) {',
    )
  })

  it('returns a source map naming the file', () => {
    const { file, code } = input('static')
    const { map } = transform(code, file)!

    expect(map.version).toBe(3)
    expect(map.sources).toEqual([file])
    expect(map.mappings.length).toBeGreaterThan(0)
  })
})
