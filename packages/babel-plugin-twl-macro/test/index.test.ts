import path from 'node:path'
import { transformSync } from '@babel/core'
import { describe, expect, it } from 'vitest'

// 辅助函数：使用宏转换代码
function transform(code: string) {
  const importExpression = `import { cls } from '${path.resolve(__dirname, '../src/index.ts')}';\n`

  const result = transformSync(importExpression + code, {
    filename: 'test.js', // 文件名很重要，确保 .babelrc 规则能匹配
    plugins: ['macros'],
    babelrc: false,
    configFile: false,
    presets: [],
  })

  return result?.code
}

describe(
  'twl macro',
  () => {
    it('should transform cls tagged template to string literal', () => {
      const input = `
      const result = cls\`text-sm font-bold bg-sky-500\`;
    `

      const output = transform(input)

      // 移除空格和换行以便比较
      const normalizedOutput = output?.replace(/\s+/g, ' ').trim()

      expect(normalizedOutput).toMatchInlineSnapshot(
        `"import { cls } from '/Users/ding/i/twl/packages/babel-plugin-twl-macro/src/index.ts'; const result = cls\`text-sm font-bold bg-sky-500\`;"`,
      )
    })
  },
  {
    skip: true,
  },
)
