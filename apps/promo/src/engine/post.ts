// Post-processing on the composited HDR (linear) frame: bloom and halation,
// chromatic aberration, a tone shoulder, film grain, vignette, fades, flash.
import * as THREE from 'three'
import { FSPass, H, W, makeRT } from './gl.ts'

/** Linear HDR -> 0..1: identity below k, a smooth shoulder above. */
export const SHOULDER_GLSL = /* glsl */ `
vec3 shoulder(vec3 x) {
  const float k = 0.72;
  vec3 y = mix(x, k + (1.0 - k) * (1.0 - exp(-(x - k) / (1.0 - k))), step(k, x));
  float over = max(max(x.r, x.g), x.b);
  return mix(y, vec3(1.0), smoothstep(2.0, 12.0, over) * 0.85);
}`

export interface PostParams {
  exposure: number
  bloom: number
  /** Chroma (max - min channel, linear) where bloom starts: the signal colour passes, bone does not. */
  bloomThreshold: number
  bloomKnee: number
  bloomRadius: number
  /** A soft signal-coloured glow around the brightest highlights. */
  halation: number
  /** Chromatic aberration, px at the frame edge. */
  ca: number
  grain: number
  vignette: number
  /** HUD opacity. */
  hud: number
  /** Fade to black 0..1. */
  fade: number
  /** Additive bone flash. */
  flash: number
  /** Frame offset, px. */
  shake: readonly [number, number]
  /** Frame zoom (1 = none), for punch-ins on hits. */
  zoom: number
}

export const DEFAULT_POST: PostParams = {
  exposure: 1,
  bloom: 0.55,
  bloomThreshold: 0.45,
  bloomKnee: 0.5,
  bloomRadius: 0.75,
  halation: 0.2,
  ca: 1,
  grain: 0.05,
  vignette: 0.3,
  hud: 1,
  fade: 0,
  flash: 0,
  shake: [0, 0],
  zoom: 1,
}

const MIPS = 7

export class Post {
  private prefilter: FSPass
  private down: FSPass
  private up: FSPass
  private final: FSPass
  private mips: THREE.WebGLRenderTarget[] = []
  private ups: THREE.WebGLRenderTarget[] = []

  constructor() {
    let w = W >> 1
    let h = H >> 1
    for (let i = 0; i < MIPS; i++) {
      this.mips.push(
        makeRT(Math.max(2, w), Math.max(2, h), { depthBuffer: false }),
      )
      this.ups.push(
        makeRT(Math.max(2, w), Math.max(2, h), { depthBuffer: false }),
      )
      w >>= 1
      h >>= 1
    }
    this.prefilter = new FSPass(
      /* glsl */ `
      uniform sampler2D src; uniform vec2 texel; uniform float threshold, knee;
      void main() {
        vec3 c = texture(src, vUv + texel * vec2(-1, -1)).rgb + texture(src, vUv + texel * vec2(1, -1)).rgb
          + texture(src, vUv + texel * vec2(-1, 1)).rgb + texture(src, vUv + texel * vec2(1, 1)).rgb;
        c = min(c * 0.25, vec3(40.0));
        // Bloom keys on chroma, not luminance: the signal colour glows and bone
        // type never does (their luminance is too close to tell apart). Values
        // past 1.2 (flashes, hot cores) glow whatever their hue.
        float hi = max(c.r, max(c.g, c.b)), lo = min(c.r, min(c.g, c.b));
        float l = max(hi - lo, hi - 1.2);
        float rq = clamp(l - threshold + knee, 0.0, 2.0 * knee);
        rq = rq * rq / (4.0 * knee + 1e-5);
        fragColor = vec4(c * max(rq, l - threshold) / max(l, 1e-5), 1.0);
      }`,
      {
        src: { value: null },
        texel: { value: new THREE.Vector2() },
        threshold: { value: 1 },
        knee: { value: 0.5 },
      },
    )
    // 13-tap downsample (Jimenez 2014)
    this.down = new FSPass(
      /* glsl */ `
      uniform sampler2D src; uniform vec2 texel;
      vec3 s(vec2 o) { return texture(src, vUv + texel * o).rgb; }
      void main() {
        vec3 o = (s(vec2(-1, -1)) + s(vec2(1, -1)) + s(vec2(-1, 1)) + s(vec2(1, 1))) * 0.125
          + (s(vec2(-2, -2)) + s(vec2(0, -2)) + s(vec2(0, 0)) + s(vec2(-2, 0))) * 0.03125
          + (s(vec2(0, -2)) + s(vec2(2, -2)) + s(vec2(2, 0)) + s(vec2(0, 0))) * 0.03125
          + (s(vec2(-2, 0)) + s(vec2(0, 0)) + s(vec2(0, 2)) + s(vec2(-2, 2))) * 0.03125
          + (s(vec2(0, 0)) + s(vec2(2, 0)) + s(vec2(2, 2)) + s(vec2(0, 2))) * 0.03125;
        fragColor = vec4(o, 1.0);
      }`,
      { src: { value: null }, texel: { value: new THREE.Vector2() } },
    )
    // 9-tap tent upsample of the smaller level, added to this level
    this.up = new FSPass(
      /* glsl */ `
      uniform sampler2D src; uniform sampler2D prev; uniform vec2 texel; uniform float radius;
      void main() {
        vec2 o = texel * radius;
        vec3 s = texture(src, vUv - o).rgb + 2.0 * texture(src, vUv + vec2(0, -o.y)).rgb + texture(src, vUv + vec2(o.x, -o.y)).rgb
          + 2.0 * texture(src, vUv + vec2(-o.x, 0)).rgb + 4.0 * texture(src, vUv).rgb + 2.0 * texture(src, vUv + vec2(o.x, 0)).rgb
          + texture(src, vUv + vec2(-o.x, o.y)).rgb + 2.0 * texture(src, vUv + vec2(0, o.y)).rgb + texture(src, vUv + o).rgb;
        fragColor = vec4(texture(prev, vUv).rgb + s / 16.0, 1.0);
      }`,
      {
        src: { value: null },
        prev: { value: null },
        texel: { value: new THREE.Vector2() },
        radius: { value: 1 },
      },
    )
    this.final = new FSPass(
      /* glsl */ `
      uniform sampler2D src; uniform sampler2D bloomTex; uniform sampler2D haloTex; uniform sampler2D hudTex;
      uniform float exposure, bloom, halation, ca, grain, vignette, hud, fade, flash, time, zoom;
      uniform vec2 shake; uniform vec2 res;
      ${SHOULDER_GLSL}
      void main() {
        vec2 uv = (vUv - 0.5) / zoom + 0.5 - shake / res;
        vec2 dc = uv - 0.5;
        vec2 dca = dc * vec2(res.x / res.y, 1.0);
        vec2 off = dc * dot(dca, dca) * ca / res.x * 4.0;
        vec3 col = vec3(texture(src, uv + off).r, texture(src, uv).g, texture(src, uv - off).b);
        col += texture(bloomTex, uv).rgb * bloom;
        col += C_SIGNAL * luma(texture(haloTex, uv).rgb) * halation;
        col *= exposure;
        // the HUD sits in the frame before the shoulder, so it gets grain and vignette too
        vec4 h = texture(hudTex, vUv);
        col = mix(col, h.rgb / max(h.a, 1e-4), h.a * hud);
        col = shoulder(col);
        col += C_BONE * flash;
        col *= mix(1.0, smoothstep(0.95, 0.25, length(dc * vec2(1.0, 0.8))), vignette);
        col *= 1.0 - fade;
        vec3 s = toSRGB(sat(col));
        // film grain at two scales, strongest in the mid-tones
        float g1 = hash12(gl_FragCoord.xy + fract(time * 13.37) * 1000.0) - 0.5;
        float g2 = hash12(floor(gl_FragCoord.xy / 2.0) + fract(time * 7.13) * 1000.0) - 0.5;
        float lm = luma(s);
        s += (g1 * 0.6 + g2 * 0.4) * grain * (0.55 + 1.2 * lm * (1.0 - lm));
        s += (hash12(gl_FragCoord.xy * 1.37 + time) - 0.5) / 255.0;
        fragColor = vec4(sat(s), 1.0);
      }`,
      {
        src: { value: null },
        bloomTex: { value: null },
        haloTex: { value: null },
        hudTex: { value: null },
        exposure: { value: 1 },
        bloom: { value: 0.5 },
        halation: { value: 0.2 },
        ca: { value: 1 },
        grain: { value: 0.05 },
        vignette: { value: 0.3 },
        hud: { value: 1 },
        fade: { value: 0 },
        flash: { value: 0 },
        time: { value: 0 },
        zoom: { value: 1 },
        shake: { value: new THREE.Vector2() },
        res: { value: new THREE.Vector2(W, H) },
      },
    )
  }

  /** src (HDR linear) -> out (8-bit sRGB target). `time` seeds the grain. */
  render(
    renderer: THREE.WebGLRenderer,
    src: THREE.Texture,
    hud: THREE.Texture,
    out: THREE.WebGLRenderTarget | null,
    p: PostParams,
    time: number,
  ) {
    const first = this.mips[0]!
    this.prefilter.u('src').value = src
    ;(this.prefilter.u('texel').value as THREE.Vector2).set(1 / W, 1 / H)
    this.prefilter.u('threshold').value = p.bloomThreshold
    this.prefilter.u('knee').value = p.bloomKnee
    this.prefilter.render(renderer, first)
    for (let i = 1; i < MIPS; i++) {
      const s = this.mips[i - 1]!
      this.down.u('src').value = s.texture
      ;(this.down.u('texel').value as THREE.Vector2).set(
        1 / s.width,
        1 / s.height,
      )
      this.down.render(renderer, this.mips[i]!)
    }
    let prevTex = this.mips[MIPS - 1]!.texture
    for (let i = MIPS - 2; i >= 0; i--) {
      const small = i === MIPS - 2 ? this.mips[MIPS - 1]! : this.ups[i + 1]!
      this.up.u('src').value = prevTex
      this.up.u('prev').value = this.mips[i]!.texture
      ;(this.up.u('texel').value as THREE.Vector2).set(
        1 / small.width,
        1 / small.height,
      )
      this.up.u('radius').value = 0.5 + p.bloomRadius
      this.up.render(renderer, this.ups[i]!)
      prevTex = this.ups[i]!.texture
    }
    const f = this.final
    f.u('src').value = src
    f.u('bloomTex').value = this.ups[0]!.texture
    f.u('haloTex').value = this.ups[3]!.texture
    f.u('hudTex').value = hud
    f.u('exposure').value = p.exposure
    // the pyramid sums about MIPS levels
    f.u('bloom').value = p.bloom / 3
    f.u('halation').value = p.halation
    f.u('ca').value = p.ca
    f.u('grain').value = p.grain
    f.u('vignette').value = p.vignette
    f.u('hud').value = p.hud
    f.u('fade').value = p.fade
    f.u('flash').value = p.flash
    f.u('time').value = time
    f.u('zoom').value = p.zoom
    ;(f.u('shake').value as THREE.Vector2).set(p.shake[0], p.shake[1])
    f.render(renderer, out)
  }
}
