export function states(prefix: string, input: string) {
  const str = `flex-${input}`;

  if (input === "~") return "flex";

  if (
    ["row", "col", "wrap", "nowrap", "1", "auto", "initial", "none"].some((i) =>
      i.startsWith(input),
    )
  )
    return str;
  return input;
}
