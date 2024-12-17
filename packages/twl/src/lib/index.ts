import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { flex, grid, hover } from "~/class";
import { isValidPrefix } from "~/utils";
import type { ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function parse(prefix: string, input: string) {
  const str = `${prefix}-${input}`;

  if (prefix === "flex") return flex(input);
  if (prefix === "hover") return hover(input);
  if (prefix === "grid") return grid(input);
  if (prefix === "p" || prefix === "m") {
    if (input.includes("-")) return `${prefix}${input}`;
    return `${prefix}-${input}`;
  }

  return str;
}

export function transfer(...inputs: ClassValue[]) {
  return inputs.map((input) => {
    if (typeof input !== "string") return input;
    const [selector, ...inputArr] = input.toString().split(" ");

    if (isValidPrefix(selector)) {
      const prefix = selector.slice(0, -1);
      return inputArr.map((i) => parse(prefix, i)).join(" ");
    }

    return input;
  });
}

export function twl(...inputs: ClassValue[]) {
  return cn(transfer(...inputs));
}
