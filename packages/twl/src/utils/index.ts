import { twMerge } from "tailwind-merge";
import type { ClassValue } from "clsx";
import { clsx } from "clsx";

export function prefix(prefix: string, input: string) {
  const cls = input.replaceAll("~", prefix).split(" ");

  return cls.map((c) => `${prefix}-${c}`).join(" ");
}

export function isValidPrefix(selector: string) {
  return selector.endsWith(":");
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export { clsx, twMerge };
