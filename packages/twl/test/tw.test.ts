import { expect, it } from "vitest";
import { tw } from "../src";

it("basic", () => {
  const result = tw`text-sm`;
  expect(result).toMatchInlineSnapshot(`"text-sm"`);
});

it("basic with expressions", () => {
  const result = tw`text-sm ${"font-bold"}   ${"bg-sky-500"}`;
  expect(result).toMatchInlineSnapshot(`"text-sm font-bold bg-sky-500"`);
});

it("multiple lines", () => {
  const result = tw`
    text-sm  bg-sky-500
    font-bold
    text-lg
  `;
  expect(result).toMatchInlineSnapshot(`"bg-sky-500 font-bold text-lg"`);
});

it("multiple lines with expressions", () => {
  const result = tw`
    text-sm              bg-sky-400
    font-bold ${"font-bold"}   ${"bg-sky-500"}
  `;
  expect(result).toMatchInlineSnapshot(`"text-sm font-bold bg-sky-500"`);
});

it("multiple lines with comments", () => {
  const result = tw`
    // hello
    text-sm  bg-sky-500
    font-bold
    // world
    text-lg
  `;
  expect(result).toMatchInlineSnapshot(`"bg-sky-500 font-bold text-lg"`);
});
