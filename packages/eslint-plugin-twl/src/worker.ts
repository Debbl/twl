// Runs in a worker thread, because loading a Tailwind design system is async
// and ESLint rules are not. Keep this file free of relative imports: it is
// also run straight from source in tests.
import { readFile, stat } from 'node:fs/promises'
import { dirname } from 'node:path'
import { runAsWorker } from 'synckit'
import type { __unstable__loadDesignSystem } from '@tailwindcss/node'

type DesignSystem = Awaited<ReturnType<typeof __unstable__loadDesignSystem>>

interface CachedDesignSystem {
  mtimeMs: number
  system: Promise<DesignSystem>
}

const cache = new Map<string, CachedDesignSystem>()

async function load(stylesheet: string) {
  const { mtimeMs } = await stat(stylesheet)
  const cached = cache.get(stylesheet)
  // Only the entry stylesheet is watched; an edit elsewhere needs a restart.
  if (cached !== undefined && cached.mtimeMs === mtimeMs) return cached.system

  const system = (async () => {
    const { __unstable__loadDesignSystem: loadDesignSystem } =
      await import('@tailwindcss/node')
    const css = await readFile(stylesheet, 'utf8')
    return loadDesignSystem(css, { base: dirname(stylesheet) })
  })()
  cache.set(stylesheet, { mtimeMs, system })
  system.catch(() => cache.delete(stylesheet))
  return system
}

/**
 * Tailwind's sort key for each class, as a decimal string because the worker
 * boundary is easier on strings than on bigints. `null` marks a class
 * Tailwind does not know.
 */
async function classOrder(
  stylesheet: string,
  classes: string[],
): Promise<Array<string | null>> {
  const system = await load(stylesheet)
  return system
    .getClassOrder(classes)
    .map(([, order]) => (order === null ? null : order.toString()))
}

export type ClassOrder = typeof classOrder

runAsWorker(classOrder)
