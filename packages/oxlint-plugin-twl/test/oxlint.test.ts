import { RuleTester } from 'oxlint/plugins-dev'
import { describe, it } from 'vitest'
// The ESLint suite's fixtures, so both linters are held to the same files.
import {
  loadFixtures,
  readExpected,
} from '../../eslint-plugin-twl/test/fixture-cases'
import plugin from '../src'
import type { Rule } from 'oxlint/plugins-dev'
import type {
  Fixture,
  RuleName,
} from '../../eslint-plugin-twl/test/fixture-cases'

RuleTester.describe = describe
RuleTester.it = it
RuleTester.itOnly = it.only

// ESLint compatibility mode reports columns the way ESLint wrote them.
const tester = new RuleTester({ eslintCompat: true })

interface Cases {
  valid: ValidCase[]
  invalid: InvalidCase[]
}

type ValidCase = Exclude<
  Parameters<RuleTester['run']>[2]['valid'][number],
  string
>
type InvalidCase = Parameters<RuleTester['run']>[2]['invalid'][number]

function add(cases: Cases, fixture: Fixture) {
  const { output, errors } = readExpected(fixture)
  const base = {
    name: fixture.name,
    code: fixture.input,
    filename: fixture.filename,
    // Oxlint rejects even an empty options list for a rule without a schema.
    ...(fixture.options.length > 0 && { options: fixture.options }),
    // Spread into a plain object type, which Oxlint's JSON settings type accepts.
    settings: { twl: { ...fixture.settings.twl } },
  }

  if (errors.length === 0) {
    cases.valid.push(base)
    return
  }

  cases.invalid.push({
    ...base,
    // `null` asserts that nothing is fixed.
    output: output === fixture.input ? null : output,
    errors: errors.map(({ message, line, column }) => ({
      message,
      line,
      column,
    })),
  })
}

const byRule = new Map<RuleName, Cases>()
for (const fixture of loadFixtures()) {
  const cases = byRule.get(fixture.rule) ?? { valid: [], invalid: [] }
  add(cases, fixture)
  byRule.set(fixture.rule, cases)
}

for (const [rule, cases] of byRule) {
  // The rules are typed for ESLint; Oxlint runs the same objects.
  tester.run(rule, plugin.rules[rule] as Rule, cases)
}
