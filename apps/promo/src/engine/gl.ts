// GL plumbing on top of three.js: HDR render targets, fullscreen shader
// passes, a texture compositor and Canvas2D layers uploaded as textures.
import * as THREE from 'three'
import { GLSL_COMMON } from './glsl/common.ts'

/** The frame, in px. Scenes lay out in these units. */
export const W = 1920
export const H = 1080

/** HDR (half-float, linear) render target. */
export function makeRT(
  w = W,
  h = H,
  opts: Partial<THREE.RenderTargetOptions> = {},
) {
  return new THREE.WebGLRenderTarget(
    Math.max(1, Math.round(w)),
    Math.max(1, Math.round(h)),
    {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      ...opts,
    },
  )
}

const FS_VERT = /* glsl */ `
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`

let fsGeom: THREE.BufferGeometry | null = null
function fullscreenGeometry() {
  if (!fsGeom) {
    fsGeom = new THREE.BufferGeometry()
    fsGeom.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3),
    )
  }
  return fsGeom
}

export type Uniforms = Record<string, THREE.IUniform>

/**
 * A fullscreen GLSL ES 3.0 pass. `frag` declares its own uniforms and a
 * `main()` writing `fragColor`; `vUv` and GLSL_COMMON are provided.
 */
export class FSPass {
  mat: THREE.RawShaderMaterial
  private scene = new THREE.Scene()
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

  constructor(
    frag: string,
    uniforms: Uniforms = {},
    opts: { blending?: THREE.Blending; transparent?: boolean } = {},
  ) {
    this.mat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: `precision highp float;\nin vec3 position;\n${FS_VERT}`,
      fragmentShader: `precision highp float;\nprecision highp int;\nin vec2 vUv;\nout vec4 fragColor;\n${GLSL_COMMON}\n${frag}`,
      uniforms,
      depthTest: false,
      depthWrite: false,
      blending: opts.blending ?? THREE.NoBlending,
      transparent: opts.transparent ?? false,
    })
    const mesh = new THREE.Mesh(fullscreenGeometry(), this.mat)
    mesh.frustumCulled = false
    this.scene.add(mesh)
  }

  /** A uniform by name; throws on a typo rather than silently doing nothing. */
  u(name: string): THREE.IUniform {
    const uniform = this.mat.uniforms[name]
    if (!uniform) throw new Error(`no uniform ${name}`)
    return uniform
  }

  render(
    renderer: THREE.WebGLRenderer,
    target: THREE.WebGLRenderTarget | null,
  ) {
    renderer.setRenderTarget(target)
    renderer.render(this.scene, this.cam)
  }
}

export type BlendMode = 'normal' | 'add' | 'screen' | 'replace'

export interface DrawOptions {
  mode?: BlendMode
  opacity?: number
  /** Multiply the texture's rgb by its alpha (straight-alpha sources). */
  premult?: boolean
}

/** Draws a texture over a target with a blend mode and opacity. */
export class Compositor {
  private passes = new Map<BlendMode, FSPass>()
  private frag = /* glsl */ `
    uniform sampler2D tex; uniform float opacity; uniform bool premult;
    void main() {
      vec4 c = texture(tex, vUv);
      if (premult) c.rgb *= c.a;
      fragColor = c * opacity;
    }`

  private get(mode: BlendMode) {
    let p = this.passes.get(mode)
    if (!p) {
      const uniforms: Uniforms = {
        tex: { value: null },
        opacity: { value: 1 },
        premult: { value: true },
      }
      p = new FSPass(this.frag, uniforms, {
        blending: THREE.CustomBlending,
        transparent: true,
      })
      const m = p.mat
      m.blendEquation = THREE.AddEquation
      if (mode === 'normal') {
        m.blendSrc = THREE.OneFactor
        m.blendDst = THREE.OneMinusSrcAlphaFactor
        m.blendSrcAlpha = THREE.OneFactor
        m.blendDstAlpha = THREE.OneMinusSrcAlphaFactor
      } else if (mode === 'add') {
        m.blendSrc = THREE.OneFactor
        m.blendDst = THREE.OneFactor
        m.blendSrcAlpha = THREE.ZeroFactor
        m.blendDstAlpha = THREE.OneFactor
      } else if (mode === 'screen') {
        m.blendSrc = THREE.OneFactor
        m.blendDst = THREE.OneMinusSrcColorFactor
        m.blendSrcAlpha = THREE.ZeroFactor
        m.blendDstAlpha = THREE.OneFactor
      } else {
        m.blending = THREE.NoBlending
      }
      this.passes.set(mode, p)
    }
    return p
  }

  draw(
    renderer: THREE.WebGLRenderer,
    tex: THREE.Texture,
    target: THREE.WebGLRenderTarget | null,
    o: DrawOptions = {},
  ) {
    const p = this.get(o.mode ?? 'normal')
    p.u('tex').value = tex
    p.u('opacity').value = o.opacity ?? 1
    p.u('premult').value = o.premult ?? true
    p.render(renderer, target)
  }
}

/**
 * A W x H Canvas2D surface uploaded as an sRGB texture (decoded to linear
 * when sampled). Draw in px with the origin top-left, then `upload()`.
 */
export class Layer2D {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  texture: THREE.CanvasTexture

  readonly w: number
  readonly h: number

  constructor(w = W, h = H) {
    this.w = w
    this.h = h
    this.canvas = document.createElement('canvas')
    this.canvas.width = w
    this.canvas.height = h
    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('no 2d context')
    this.ctx = ctx
    this.texture = new THREE.CanvasTexture(this.canvas)
    this.texture.colorSpace = THREE.SRGBColorSpace
    this.texture.minFilter = THREE.LinearFilter
    this.texture.generateMipmaps = false
  }

  clear() {
    const c = this.ctx
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.globalAlpha = 1
    c.globalCompositeOperation = 'source-over'
    c.filter = 'none'
    c.clearRect(0, 0, this.w, this.h)
  }

  upload() {
    this.texture.needsUpdate = true
    return this.texture
  }
}

/** Clear a render target to a linear colour. */
export function clearRT(
  renderer: THREE.WebGLRenderer,
  rt: THREE.WebGLRenderTarget | null,
  rgb: readonly [number, number, number] = [0, 0, 0],
  a = 1,
) {
  const prev = renderer.getClearColor(new THREE.Color()).clone()
  const prevA = renderer.getClearAlpha()
  renderer.setRenderTarget(rt)
  renderer.setClearColor(
    new THREE.Color().setRGB(
      rgb[0],
      rgb[1],
      rgb[2],
      THREE.LinearSRGBColorSpace,
    ),
    a,
  )
  renderer.clear(true, true, true)
  renderer.setClearColor(prev, prevA)
}
