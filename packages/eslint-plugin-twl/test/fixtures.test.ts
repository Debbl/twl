import path from 'node:path'
import parser from '@typescript-eslint/parser'
import { Linter } from 'eslint'
import { describe, expect, it } from 'vitest'
import plugin from '../src'
import { loadFixtures } from './fixture-cases'
import type { Fixture, FixtureError } from './fixture-cases'

const linter = new Linter({ configType: 'flat' })

function configFor(fixture: Fixture): Linter.Config[] {
  return [
    {
      files: ['**/*.tsx'],
      languageOptions: {
        parser,
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      plugins: { twl: plugin },
      settings: fixture.settings,
      rules: { [`twl/${fixture.rule}`]: ['error', ...fixture.options] },
    },
  ]
}

describe('fixtures', () => {
  for (const fixture of loadFixtures()) {
    it(`${fixture.rule}/${fixture.name}`, async () => {
      const config = configFor(fixture)
      const messages = linter.verify(fixture.input, config, fixture.filename)

      // A parse error would make every other assertion meaningless.
      expect(messages.filter((message) => message.fatal)).toEqual([])

      const errors: FixtureError[] = messages.map((message) => ({
        messageId: message.messageId ?? '',
        message: message.message,
        line: message.line,
        column: message.column,
      }))
      const { output } = linter.verifyAndFix(
        fixture.input,
        config,
        fixture.filename,
      )

      await expect(`${JSON.stringify(errors, null, 2)}\n`).toMatchFileSnapshot(
        path.join(fixture.dir, 'errors.json'),
      )
      await expect(output).toMatchFileSnapshot(
        path.join(fixture.dir, 'output.tsx'),
      )
    })
  }
})
