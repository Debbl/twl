interface Ranked {
  value: string
  order: bigint | null
}

/**
 * Orders class names the way prettier-plugin-tailwindcss does: classes
 * Tailwind does not know come first in their original order, the rest follow
 * by Tailwind's sort key. Unless kept, repeats of a known class are dropped.
 */
export function sortClasses(
  classes: readonly Ranked[],
  options: { preserveDuplicates: boolean },
): string[] {
  let ranked = [...classes]

  if (!options.preserveDuplicates) {
    const seen = new Set<string>()
    ranked = ranked.filter(({ value, order }) => {
      if (order === null) return true
      if (seen.has(value)) return false
      seen.add(value)
      return true
    })
  }

  // `Array.prototype.sort` is stable, so equal keys keep their source order.
  return ranked
    .sort((a, b) => {
      if (a.order === b.order) return 0
      if (a.order === null) return -1
      if (b.order === null) return 1
      return a.order < b.order ? -1 : 1
    })
    .map(({ value }) => value)
}
