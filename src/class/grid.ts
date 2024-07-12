export function grid(input: string) {
  const str = `grid-${input}`;

  if (input === "~") return "grid";

  if (["cols", "rows", "flow"].some((i) => input.startsWith(i))) return str;

  return input;
}
