// The edit, straight from the score: one entry per scene window, hard cuts on
// downbeats. write, sort and compile are one card evolving, so they share a
// module and each renders it from the film time.
import { BAR, SCENES } from './score.ts'
import type { TimelineEntry } from './engine/engine.ts'
import type { SceneClass } from './engine/scene.ts'
import type { SceneId } from './score.ts'

type Loader = () => Promise<{ default: SceneClass }>

const MODULES: Record<SceneId, Loader> = {
  mess: () => import('./scenes/mess.ts'),
  write: () => import('./scenes/code.ts'),
  sort: () => import('./scenes/code.ts'),
  compile: () => import('./scenes/code.ts'),
  logo: () => import('./scenes/logo.ts'),
}

/** Scene module file per entry, for hot reload. */
export const FILES: Record<SceneId, string> = {
  mess: 'mess',
  write: 'code',
  sort: 'code',
  compile: 'code',
  logo: 'logo',
}

export const TIMELINE: readonly TimelineEntry[] = SCENES.map((s) => ({
  id: s.id,
  load: MODULES[s.id],
  start: s.from * BAR,
  end: s.to * BAR,
}))
