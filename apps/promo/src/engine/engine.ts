// The engine: owns the renderer, loads the scenes on the timeline, renders
// any film time deterministically, and composites transitions, HUD and post.
// Ported from the P(doom) video's engine, minus lyrics and stateful scenes.
import * as THREE from 'three'
import { BAR, BEAT, DURATION } from '../score.ts'
import { Compositor, FSPass, H, W, clearRT, makeRT } from './gl.ts'
import { Hud } from './hud.ts'
import { DEFAULT_POST, Post, SHOULDER_GLSL } from './post.ts'
import { loadFonts } from './type.ts'
import type { SceneId } from '../score.ts'
import type { PostParams } from './post.ts'
import type { Frame, PostOverrides, Scene, SceneClass } from './scene.ts'

export interface TimelineEntry {
  id: SceneId
  /** Lazy module loader; the default export is the Scene class. */
  load: () => Promise<{ default: SceneClass }>
  start: number
  end: number
  /** Post overrides for the whole entry (the scene's own win). */
  post?: PostOverrides
  /** Cap on adaptive sub-frames while this entry is on screen. */
  maxSamples?: number
}

interface Loaded {
  entry: TimelineEntry
  scene: Scene | null
  error?: string
}

/**
 * Adaptive motion blur: the sub-frame count steps through 4, 12, 36, 108,
 * 324 between `min` and `max` until the frame's estimated remaining error is
 * below `tol` 8-bit levels (worst 2x2 px block).
 */
export interface AdaptiveSampling {
  min: number
  max: number
  tol: number
}

/**
 * Shutter offsets (-0.5..0.5) in rendering order: 4 evenly spread, then each
 * step adds a sub-frame either side of every old one. Each prefix of 4·3^l is
 * evenly spread and centred, so comparing a step's new set with the old one
 * measures sampling error, not a shift in time.
 */
function ternaryOffsets(steps: number) {
  const u = [0, 1, 2, 3].map((i) => (i + 0.5) / 4 - 0.5)
  for (let l = 0, n = 4; l < steps; l++, n *= 3) {
    for (let m = 0; m < n; m++)
      u.push((3 * m + 0.5) / (3 * n) - 0.5, (3 * m + 2.5) / (3 * n) - 0.5)
  }
  return u
}

export class Engine {
  renderer: THREE.WebGLRenderer
  comp = new Compositor()
  hud = new Hud()
  post!: Post
  loaded = new Map<SceneId, Loaded>()
  errors: string[] = []
  /** Sub-frames used for the last frame. */
  lastSamples = 1
  lastPost: PostParams = { ...DEFAULT_POST }

  private rts = [makeRT(), makeRT()]
  private mixRT = makeRT(W, H, { depthBuffer: false })
  private sumRT = makeRT(W, H, { depthBuffer: false, type: THREE.FloatType })
  private newRT = makeRT(W, H, { depthBuffer: false, type: THREE.FloatType })
  private avgRT = makeRT(W, H, { depthBuffer: false })
  private errRT: THREE.WebGLRenderTarget
  private maxRT: THREE.WebGLRenderTarget
  private errBuf: Float32Array
  private finalRT = new THREE.WebGLRenderTarget(W, H, {
    type: THREE.UnsignedByteType,
    depthBuffer: false,
  })
  private blit: FSPass
  private xfade: FSPass
  private accum: FSPass
  private errPass: FSPass
  private maxPass: FSPass

  readonly timeline: readonly TimelineEntry[]

  constructor(canvas: HTMLCanvasElement, timeline: readonly TimelineEntry[]) {
    this.timeline = timeline
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(1)
    this.renderer.setSize(W, H, false)
    this.renderer.autoClear = false
    this.blit = new FSPass(
      `uniform sampler2D src; void main(){ fragColor = texture(src, vUv); }`,
      { src: { value: null } },
    )
    this.xfade = new FSPass(
      `uniform sampler2D a; uniform sampler2D b; uniform float k; void main(){ fragColor = mix(texture(a, vUv), texture(b, vUv), k); }`,
      { a: { value: null }, b: { value: null }, k: { value: 0 } },
    )
    // adds a sub-frame to a sum; a non-finite pixel is dropped, or one stray
    // NaN in hundreds of sub-frames would poison the average
    this.accum = new FSPass(
      `uniform sampler2D src;
      void main() {
        vec4 c = texture(src, vUv);
        bool ok = abs(c.r) <= 6e4 && abs(c.g) <= 6e4 && abs(c.b) <= 6e4 && abs(c.a) <= 6e4;
        fragColor = ok ? c : vec4(0.0);
      }`,
      { src: { value: null } },
      { blending: THREE.CustomBlending, transparent: true },
    )
    const am = this.accum.mat
    am.blendEquation = THREE.AddEquation
    am.blendSrc = THREE.OneFactor
    am.blendDst = THREE.OneFactor
    am.blendSrcAlpha = THREE.ZeroFactor
    am.blendDstAlpha = THREE.OneFactor

    // Sampling error per 2x2 block: how far the displayed average moves when a
    // step's new sub-frames (2n, summed in b) join the n before them (in a).
    const B = 2
    const ew = Math.ceil(W / B)
    const eh = Math.ceil(H / B)
    const R = 16
    const small = {
      depthBuffer: false,
      type: THREE.FloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    } as const
    this.errRT = makeRT(ew, eh, small)
    this.maxRT = makeRT(Math.ceil(ew / R), Math.ceil(eh / R), small)
    this.errBuf = new Float32Array(this.maxRT.width * this.maxRT.height * 4)
    this.errPass = new FSPass(
      /* glsl */ `
      uniform sampler2D a; uniform sampler2D b; uniform float invA, invB;
      ${SHOULDER_GLSL}
      vec3 disp(vec3 x) { return toSRGB(sat(shoulder(max(x, 0.0)))); }
      void main() {
        ivec2 p0 = ivec2(gl_FragCoord.xy) * ${B}, lim = ivec2(${W - 1}, ${H - 1});
        vec3 sa = vec3(0.0), sb = vec3(0.0);
        for (int y = 0; y < ${B}; y++) for (int x = 0; x < ${B}; x++) {
          ivec2 p = min(p0 + ivec2(x, y), lim);
          sa += texelFetch(a, p, 0).rgb; sb += texelFetch(b, p, 0).rgb;
        }
        vec3 e = abs(disp(sa * (invA / ${B * B}.0)) - disp(sb * (invB / ${B * B}.0)));
        fragColor = vec4(170.0 * max(e.r, max(e.g, e.b)), 0.0, 0.0, 1.0);
      }`,
      {
        a: { value: null },
        b: { value: null },
        invA: { value: 1 },
        invB: { value: 1 },
      },
    )
    this.maxPass = new FSPass(
      /* glsl */ `
      uniform sampler2D e;
      void main() {
        ivec2 p0 = ivec2(gl_FragCoord.xy) * ${R};
        float m = 0.0;
        for (int y = 0; y < ${R}; y++) for (int x = 0; x < ${R}; x++) {
          ivec2 p = p0 + ivec2(x, y);
          if (p.x < ${ew} && p.y < ${eh}) m = max(m, texelFetch(e, p, 0).r);
        }
        fragColor = vec4(m, 0.0, 0.0, 1.0);
      }`,
      { e: { value: null } },
    )
  }

  get duration() {
    return DURATION
  }

  async init(only?: (e: TimelineEntry) => boolean) {
    await loadFonts()
    this.post = new Post()
    const entries = only ? this.timeline.filter(only) : this.timeline
    await Promise.all(entries.map((e) => this.loadEntry(e)))
  }

  private async loadEntry(e: TimelineEntry) {
    const rec: Loaded = { entry: e, scene: null }
    this.loaded.set(e.id, rec)
    try {
      const { default: SceneCtor } = await e.load()
      const scene = new SceneCtor({
        renderer: this.renderer,
        comp: this.comp,
        id: e.id,
        start: e.start,
        end: e.end,
      })
      await scene.init()
      rec.scene = scene
    } catch (err) {
      rec.error =
        err instanceof Error ? (err.stack ?? err.message) : String(err)
      this.errors.push(`[${e.id}] ${rec.error}`)
      console.error(`scene ${e.id} failed`, err)
    }
  }

  /** Re-instantiate a scene after its module changed (Vite HMR in the preview). */
  async reload(id: SceneId) {
    const e = this.timeline.find((x) => x.id === id)
    if (!e) return
    this.loaded.get(id)?.scene?.dispose()
    await this.loadEntry(e)
  }

  private frameFor(e: TimelineEntry, t: number): Frame {
    const beat = t / BEAT
    const bar = t / BAR
    return {
      t,
      lt: t - e.start,
      p: (t - e.start) / (e.end - e.start),
      beat,
      bar,
      beatPhase: beat - Math.floor(beat),
      barPhase: bar - Math.floor(bar),
    }
  }

  /**
   * Render film time t. With `samples` > 1, that many sub-frames spread over
   * `shutter` x dt around t are averaged before post-processing: motion blur
   * and temporal anti-aliasing. With an AdaptiveSampling the count is chosen
   * per frame (see ternaryOffsets). Returns the sub-frames used.
   */
  render(
    t: number,
    dt = 1 / 60,
    toScreen = true,
    samples: number | AdaptiveSampling = 1,
    shutter = 0.5,
  ): number {
    const r = this.renderer
    let outTex: THREE.Texture
    let post: PostParams = { ...DEFAULT_POST }
    let n = 1
    if (samples === 1) {
      ;({ outTex, post } = this.composite(t))
    } else {
      const adaptive = typeof samples !== 'number'
      let max = adaptive ? samples.max : 0
      if (adaptive) {
        const w = dt * shutter
        for (const e of this.timeline) {
          if (t + w / 2 >= e.start && t - w / 2 < e.end && e.maxSamples)
            max = Math.min(max, e.maxSamples)
        }
      }
      // Post parameters (shake, flash, zoom) are read at one point of the
      // shutter, 1/8 of it after t, which every sample set includes.
      const POST_U = 0.125
      let nearest = Infinity
      const sub = (u: number, into: THREE.WebGLRenderTarget) => {
        const res = this.composite(Math.max(0, t + dt * shutter * u))
        this.accum.u('src').value = res.outTex
        this.accum.render(r, into)
        const d = Math.abs(u - POST_U)
        if (d < nearest - 1e-9 || (d < nearest + 1e-9 && u > POST_U)) {
          nearest = d
          post = res.post
        }
      }
      clearRT(r, this.sumRT, [0, 0, 0], 0)
      if (!adaptive) {
        n = samples
        for (let k = 0; k < n; k++) sub((k + 0.5) / n - 0.5, this.sumRT)
      } else {
        const lg3 = (x: number) => Math.log(x / 4) / Math.log(3)
        const lo = Math.max(0, Math.round(lg3(samples.min)))
        const hi = Math.max(lo, Math.floor(lg3(max) + 1e-9))
        const u = ternaryOffsets(hi)
        n = 4 * 3 ** lo
        for (let k = 0; k < n; k++) sub(u[k]!, this.sumRT)
        for (let l = lo; l < hi; l++) {
          clearRT(r, this.newRT, [0, 0, 0], 0)
          for (let k = n; k < 3 * n; k++) sub(u[k]!, this.newRT)
          // stepped copies shrink as 1/count: what is left is about half the change
          const err = this.sampleError(n) / 2
          this.comp.draw(r, this.newRT.texture, this.sumRT, {
            mode: 'add',
            premult: false,
          })
          n *= 3
          if (err < samples.tol) break
        }
      }
      this.comp.draw(r, this.sumRT.texture, this.avgRT, {
        mode: 'replace',
        opacity: 1 / n,
        premult: false,
      })
      outTex = this.avgRT.texture
    }
    this.lastSamples = n
    this.post.render(
      r,
      outTex,
      this.hud.draw(t, post.hud),
      this.finalRT,
      post,
      t,
    )
    this.lastPost = post
    if (toScreen) {
      this.blit.u('src').value = this.finalRT.texture
      this.blit.render(r, null)
    }
    return n
  }

  private sampleError(n: number) {
    const r = this.renderer
    this.errPass.u('a').value = this.sumRT.texture
    this.errPass.u('b').value = this.newRT.texture
    this.errPass.u('invA').value = 1 / n
    this.errPass.u('invB').value = 1 / (2 * n)
    this.errPass.render(r, this.errRT)
    this.maxPass.u('e').value = this.errRT.texture
    this.maxPass.render(r, this.maxRT)
    r.readRenderTargetPixels(
      this.maxRT,
      0,
      0,
      this.maxRT.width,
      this.maxRT.height,
      this.errBuf,
    )
    let m = 0
    for (let i = 0; i < this.errBuf.length; i += 4)
      m = Math.max(m, this.errBuf[i]!)
    return m
  }

  /** Render and composite every scene active at t into an HDR texture (no post). */
  private composite(t: number): { outTex: THREE.Texture; post: PostParams } {
    const r = this.renderer
    const active = this.timeline
      .filter((e) => t >= e.start && t < e.end)
      .sort((a, b) => a.start - b.start)
    let post: PostParams = { ...DEFAULT_POST }
    let under: THREE.Texture | null = null
    let outTex: THREE.Texture | null = null

    for (const [idx, e] of active.entries()) {
      const rec = this.loaded.get(e.id)
      const rt = this.rts[idx % this.rts.length]!
      const prev = active[idx - 1]
      const tin = prev
        ? Math.min(1, (t - e.start) / Math.max(1e-3, prev.end - e.start))
        : 1
      if (!rec?.scene) {
        clearRT(r, rt, [0.25, 0, 0])
        under = outTex = rt.texture
        continue
      }
      let ov: PostOverrides | void = undefined
      try {
        ov = rec.scene.render(this.frameFor(e, t), rt)
      } catch (err) {
        console.error(`scene ${e.id} render error`, err)
        clearRT(r, rt, [0.25, 0, 0])
      }
      post = { ...post, ...e.post, ...ov }
      if (idx > 0 && under) {
        // overlapping entries crossfade over the overlap
        this.xfade.u('a').value = under
        this.xfade.u('b').value = rt.texture
        this.xfade.u('k').value = tin
        this.xfade.render(r, this.mixRT)
        outTex = this.mixRT.texture
      } else outTex = rt.texture
      under = outTex
    }

    if (!outTex) {
      clearRT(r, this.rts[0]!, [0, 0, 0])
      outTex = this.rts[0]!.texture
    }
    return { outTex, post }
  }

  /** RGBA8 pixels of the last frame (bottom-up rows), read without blocking. */
  async readPixelsAsync(buf?: Uint8Array) {
    const out = buf ?? new Uint8Array(W * H * 4)
    await this.renderer.readRenderTargetPixelsAsync(
      this.finalRT,
      0,
      0,
      W,
      H,
      out,
    )
    return out
  }
}
