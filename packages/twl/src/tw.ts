import { twMerge } from "tailwind-merge";
import { cls } from "./cls";
import type { ClassValue } from "clsx";

export function tw(
  strings: TemplateStringsArray,
  ...expressions: ClassValue[]
) {
  return twMerge(cls(strings, ...expressions));
}
