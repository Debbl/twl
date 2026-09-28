// Shared pieces for the scenes: the ink backdrop, display type that slides in
// glyph by glyph, mono annotations, and a Canvas2D layer mounted on a 3D plane.
import * as THREE from 'three'
import { FSPass, H, Layer2D, W } from '../engine/gl.ts'
import { rgba } from '../engine/palette.ts'
import { F, font } from '../engine/type.ts'
import { ease, prog } from '../engine/util.ts'

/** The ink backdrop: a faint dot grid and a slow falloff of light. */
export class Backdrop {
  pass = new FSPass(
    /* glsl */ `
    uniform float t; uniform float grid; uniform vec2 light;
    void main() {
      vec2 px = vUv * vec2(${W}.0, ${H}.0);
      vec3 col = C_INK;
      float d = length((vUv - light) * vec2(1.6, 1.0));
      col = mix(col, C_INK2, smoothstep(0.9, 0.0, d) * 0.9);
      col += C_INK2 * (fbm(vUv * 3.0 + t * 0.03) - 0.5) * 0.25;
      // a 32 px dot grid, fading with distance from the light
      vec2 cell = mod(px, 32.0) - 16.0;
      float dot_ = 1.0 - smoothstep(0.6, 1.4, length(cell));
      col = mix(col, C_GRAPHITE, dot_ * grid * smoothstep(1.1, 0.2, d) * 0.35);
      fragColor = vec4(col, 1.0);
    }`,
    {
      t: { value: 0 },
      grid: { value: 1 },
      light: { value: new THREE.Vector2(0.5, 0.55) },
    },
  )

  render(
    renderer: THREE.WebGLRenderer,
    out: THREE.WebGLRenderTarget,
    t: number,
    grid = 1,
    light: [number, number] = [0.5, 0.55],
  ) {
    this.pass.u('t').value = t
    this.pass.u('grid').value = grid
    ;(this.pass.u('light').value as THREE.Vector2).set(light[0], light[1])
    this.pass.render(renderer, out)
  }
}

export interface HeadlineLine {
  text: string
  /** When the line starts to come in; its glyphs follow 18 ms apart. */
  at: number
  color?: string
  /** How many trailing glyphs take the signal colour (a full stop, say). */
  signal?: number
}

/**
 * Display type in Archivo Black: each glyph slides up from behind a mask as
 * its line comes in, and the whole block slides out after `out`.
 */
export function headline(
  c: CanvasRenderingContext2D,
  t: number,
  lines: readonly HeadlineLine[],
  x: number,
  y: number,
  size: number,
  out = Infinity,
) {
  const lh = size * 0.98
  c.font = font(F.display(900), size)
  // tracking lives in letterSpacing, so measureText already includes it
  c.letterSpacing = `${-size * 0.035}px`
  c.textBaseline = 'alphabetic'
  c.textAlign = 'left'
  for (const [li, line] of lines.entries()) {
    const baseline = y + li * lh
    // (no exit: `out` is Infinity, and prog() of an infinite window is NaN)
    const leave = Number.isFinite(out)
      ? prog(t, out + li * 0.04, out + li * 0.04 + 0.28, ease.inCubic)
      : 0
    if (leave >= 1) continue
    c.save()
    // mask: the line's own band, so glyphs rise from below the baseline
    c.beginPath()
    c.rect(x - size, baseline - size * 0.9, W, size * 1.14)
    c.clip()
    const glyphs = [...line.text]
    for (const [i, ch] of glyphs.entries()) {
      const k = prog(
        t,
        line.at + i * 0.018,
        line.at + i * 0.018 + 0.42,
        ease.outExpo,
      )
      if (k <= 0) continue
      // glyph i sits at the width of text[0..i] minus its own advance, which
      // keeps the kerning between it and the glyph before
      const gx =
        x +
        c.measureText(glyphs.slice(0, i + 1).join('')).width -
        c.measureText(ch).width
      const accent = i >= glyphs.length - (line.signal ?? 0)
      c.fillStyle = accent ? rgba('signal') : (line.color ?? rgba('bone'))
      c.fillText(ch, gx, baseline + (1 - k) * size * 1.05 - leave * size * 1.05)
    }
    c.restore()
  }
}

/** A small uppercase mono annotation, fading in at `at`. */
export function label(
  c: CanvasRenderingContext2D,
  t: number,
  text: string,
  x: number,
  y: number,
  at: number,
  opts: {
    color?: string
    size?: number
    align?: CanvasTextAlign
    out?: number
  } = {},
) {
  const leave = opts.out === undefined ? 0 : prog(t, opts.out, opts.out + 0.2)
  const k = prog(t, at, at + 0.3, ease.outCubic) * (1 - leave)
  if (k <= 0) return
  c.save()
  c.globalAlpha *= k
  c.font = font(F.mono(500), opts.size ?? 16)
  c.letterSpacing = '2px'
  c.textAlign = opts.align ?? 'left'
  c.textBaseline = 'alphabetic'
  c.fillStyle = opts.color ?? rgba('ash', 0.9)
  c.fillText(text.toUpperCase(), x + (1 - k) * 12, y)
  c.restore()
}

/** A hairline from a to b, drawn on over [at, at + dur]. */
export function hairline(
  c: CanvasRenderingContext2D,
  t: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  at: number,
  dur = 0.3,
  color = rgba('graphite'),
) {
  const k = prog(t, at, at + dur, ease.outCubic)
  if (k <= 0) return
  c.strokeStyle = color
  c.lineWidth = 1
  c.beginPath()
  c.moveTo(ax, ay)
  c.lineTo(ax + (bx - ax) * k, ay + (by - ay) * k)
  c.stroke()
}

/**
 * A W x H Canvas2D layer on a plane in a 3D scene. At `frontal()` distance the
 * plane fills the frame exactly, one texel per pixel, so a scene can tilt it
 * in and land it flat on screen coordinates.
 */
export class Sheet {
  layer = new Layer2D()
  scene = new THREE.Scene()
  camera: THREE.PerspectiveCamera
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  /** World height of the plane. */
  readonly height = 10

  constructor(fov = 30) {
    this.camera = new THREE.PerspectiveCamera(fov, W / H, 0.1, 200)
    const mat = new THREE.MeshBasicMaterial({
      map: this.layer.texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    })
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry((this.height * W) / H, this.height),
      mat,
    )
    this.scene.add(this.mesh)
  }

  /** Camera distance at which the plane exactly fills the frame. */
  frontal() {
    return (
      this.height / 2 / Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2)
    )
  }

  /** Screen px -> world point on the plane (plane untransformed). */
  toWorld(x: number, y: number) {
    const s = this.height / H
    return new THREE.Vector3((x - W / 2) * s, (H / 2 - y) * s, 0)
  }

  render(renderer: THREE.WebGLRenderer, out: THREE.WebGLRenderTarget) {
    this.layer.upload()
    renderer.setRenderTarget(out)
    renderer.render(this.scene, this.camera)
  }
}

/** A blinking block caret, on for the first half of every beat. */
export function caret(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  beatPhase: number,
  color = rgba('signal'),
) {
  if (beatPhase > 0.55) return
  c.fillStyle = color
  c.fillRect(x, y - h * 0.8, h * 0.5, h)
}

/**
 * Where the mark sits when the compile scene hands over to the logo scene:
 * centred, `scale` px per logo unit. Both scenes draw it here on the cut.
 */
export const MARK = { cx: 960, cy: 520, scale: 4.2 } as const

/** A logo-space point (the mark's 120-unit square) on screen at the hand-over. */
export function markToScreen(x: number, y: number): [number, number] {
  return [MARK.cx + (x - 60) * MARK.scale, MARK.cy + (y - 60) * MARK.scale]
}
