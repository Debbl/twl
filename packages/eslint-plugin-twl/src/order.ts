import { createSyncFn } from 'synckit'
import type { ClassOrder } from './worker'

// Built, this module is bundled into `dist/index.mjs` next to
// `dist/worker.mjs`; from source, tests run `src/worker.ts` directly.
const WORKER = import.meta.url.endsWith('.ts') ? './worker.ts' : './worker.mjs'

let classOrderSync:
  | ((...args: Parameters<ClassOrder>) => Array<string | null>)
  | undefined

/** Tailwind's sort key for each class, `null` for classes it does not know. */
export function getClassOrder(
  stylesheet: string,
  classes: string[],
): Array<bigint | null> {
  classOrderSync ??= createSyncFn<ClassOrder>(new URL(WORKER, import.meta.url))
  return classOrderSync(stylesheet, classes).map((order) =>
    order === null ? null : BigInt(order),
  )
}
