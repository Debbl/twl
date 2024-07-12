export function flex(input: string) {
  const str = `flex-${input}`;

  if (input === "~") return "flex";

  if (
    ["row", "col", "wrap", "nowrap", "1", "auto", "initial", "none"].some((i) =>
      input.startsWith(i),
    )
  )
    return str;
  return input;
}
