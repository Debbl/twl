import { describe, expect, it } from "vitest";
import { transfer } from "~/lib";

describe("flex", () => {
  it("should transform", () => {
    expect(
      transfer(
        "flex: ~ justify-between items-center col basic-0 wrap 1 grow shrink order",
      ),
    ).toMatchInlineSnapshot(`
      [
        "flex justify-between items-center flex-col basic-0 flex-wrap flex-1 grow shrink order",
      ]
    `);
  });
});

describe("grid", () => {
  it("should transform", () => {
    expect(
      transfer(
        "grid: ~ cols-3 rows-3 flow-row justify-between items-center col basic-0 wrap",
      ),
    ).toMatchInlineSnapshot(`
      [
        "grid grid-cols-3 grid-rows-3 grid-flow-row justify-between items-center col basic-0 wrap",
      ]
    `);
  });
});

describe("hover", () => {
  it("should transform", () => {
    expect(transfer("hover: bg-red-300 text-red-300")).toMatchInlineSnapshot(`
      [
        "hover:bg-red-300 hover:text-red-300",
      ]
    `);
  });
});

describe("p", () => {
  it("should transform", () => {
    expect(transfer("p: 0 x-2 y-2")).toMatchInlineSnapshot(`
      [
        "p-0 px-2 py-2",
      ]
    `);
  });
});
