function hover(input: string) {
  const cls = input.split(" ");
  return cls.map((c) => `hover:${c}`).join(" ");
}

function isHover(input: string) {
  return input.startsWith("hover:");
}

export { hover, isHover };
