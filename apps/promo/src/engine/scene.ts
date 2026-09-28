// Scene API. A scene owns a window of the timeline and renders linear HDR
// colour into the target it is given, as a pure function of time.
import type * as THREE from 'three'
import type { SceneId } from '../score.ts'
import type { Compositor } from './gl.ts'
import type { PostParams } from './post.ts'

export interface SceneCtx {
  renderer: THREE.WebGLRenderer
  comp: Compositor
  id: SceneId
  /** The entry's window, in seconds. */
  start: number
  end: number
}

export interface Frame {
  /** Film time, s. */
  t: number
  /** Local time since this scene's start, and 0..1 progress through its window. */
  lt: number
  p: number
  /** Continuous beat and bar indices, and their fractional phases. */
  beat: number
  bar: number
  beatPhase: number
  barPhase: number
}

export type PostOverrides = Partial<PostParams>

export abstract class Scene {
  protected ctx: SceneCtx

  constructor(ctx: SceneCtx) {
    this.ctx = ctx
  }

  /** Build resources. Called once before the first render. */
  init(): Promise<void> | void {}

  /** Render into `out` (half-float, linear HDR); must overwrite all of it. */
  abstract render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides | void

  dispose(): void {}
}

export type SceneClass = new (ctx: SceneCtx) => Scene
