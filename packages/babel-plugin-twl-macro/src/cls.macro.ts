import * as t from "@babel/types";
import { createMacro } from "babel-plugin-macros";
import { cls } from "twl";
import type { MacroParams } from "babel-plugin-macros";

function twlMacro({ references }: MacroParams) {
  // 处理所有对 cls 的引用
  const clsReferences = references.cls || [];

  clsReferences.forEach((referencePath) => {
    // 检查父路径是否是 TaggedTemplateExpression
    if (
      referencePath.parentPath &&
      referencePath.parentPath.isTaggedTemplateExpression()
    ) {
      const taggedTemplate = referencePath.parentPath;

      // 使用类型断言确保 TypeScript 知道这是 TaggedTemplateExpression
      const templateExpression =
        taggedTemplate.node as t.TaggedTemplateExpression;
      const quasi = templateExpression.quasi;

      // 提取模板字符串内容
      const strings = quasi.quasis.map(
        (q) => q.value.raw,
      ) as unknown as TemplateStringsArray;

      // 在编译时执行 cls 函数
      const result = cls(strings);

      // 用字符串字面量替换整个表达式
      taggedTemplate.replaceWith(t.stringLiteral(result));
    }
  });
}

export default createMacro(twlMacro);
