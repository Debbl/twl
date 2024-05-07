function prefix(prefix: string, input: string) {
  const cls = input.replaceAll("~", prefix).split(" ");

  return cls.map((c) => `${prefix}-${c}`).join(" ");
}

export { prefix };
