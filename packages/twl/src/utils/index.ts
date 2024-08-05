export function prefix(prefix: string, input: string) {
  const cls = input.replaceAll("~", prefix).split(" ");

  return cls.map((c) => `${prefix}-${c}`).join(" ");
}

export function isValidPrefix(selector: string) {
  return selector.endsWith(":");
}
