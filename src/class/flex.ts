function flex(input: string) {
  return `flex ${input}`;
}

function isFlex(input: string) {
  return input.startsWith("flex:");
}

export { flex, isFlex };
