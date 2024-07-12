export function border(input: string) {
  const str = `border-${input}`;

  if (input === "~") return "flex";

  if (
    ["row", "col", "wrap", "nowrap", "1", "auto", "initial", "none"].some((i) =>
      i.startsWith(input),
    )
  )
    return str;
  return input;
}
