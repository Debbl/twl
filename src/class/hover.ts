export function hover(input: string) {
  const str = `hover:${input}`;

  if (input === "~") return "";

  return str;
}
