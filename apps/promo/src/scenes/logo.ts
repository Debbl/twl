// fig. 05 - the mark lands. It takes over from the compile scene exactly where
// that one left it, turns out as a solid, and settles into the lockup while the
// wordmark writes itself beside it; then the line, then the install command.
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import {
  lockupLayout,
  markStrokes,
  WEIGHT,
  wordmarkStrokes,
} from '../brand/logo.ts'
import { H, Layer2D, W } from '../engine/gl.ts'
import { LIN, rgba } from '../engine/palette.ts'
import { Scene } from '../engine/scene.ts'
import { F, font, measure } from '../engine/type.ts'
import { ease, keys, lerp, prog, pulse } from '../engine/util.ts'
import { BEAT, LOGO } from '../score.ts'
import { Backdrop, MARK, headline, label } from './_kit.ts'
import type { Point, Stroke } from '../brand/logo.ts'
import type { Frame, PostOverrides } from '../engine/scene.ts'

/** World units per logo unit. */
const U = 0.02
const FOV = 30
/** px per logo unit of the settled lockup, and where its box is centred. */
const LOCK_SCALE = 3.7
const LOCK_CY = 470

/** Camera distance at which one logo unit on the z = 0 plane covers `px` pixels. */
const distanceFor = (px: number) =>
  (H * U) / (2 * Math.tan(THREE.MathUtils.degToRad(FOV) / 2) * px)

function strokeLength(s: Stroke) {
  let len = 0
  for (let i = 1; i < s.points.length; i++) {
    const a = s.points[i - 1]!
    const b = s.points[i]!
    len += Math.hypot(b[0] - a[0], b[1] - a[1])
  }
  return len
}

export default class Logo extends Scene {
  private bg = new Backdrop()
  private overlay = new Layer2D()
  private scene3 = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(FOV, W / H, 0.05, 100)
  private mark = new THREE.Group()
  private lockup = lockupLayout()
  private lockBox = { x: 0, y: 0 }

  override init() {
    const { renderer } = this.ctx
    const pmrem = new THREE.PMREMGenerator(renderer)
    this.scene3.environment = pmrem.fromScene(
      new RoomEnvironment(),
      0.04,
    ).texture
    const key = new THREE.DirectionalLight(0xffffff, 1.2)
    key.position.set(3, 4, 6)
    this.scene3.add(key, new THREE.AmbientLight(0xffffff, 0.5))

    const signal = new THREE.Color().setRGB(
      ...LIN.signal,
      THREE.LinearSRGBColorSpace,
    )
    const bone = new THREE.Color().setRGB(
      ...LIN.bone,
      THREE.LinearSRGBColorSpace,
    )
    for (const s of markStrokes()) {
      const a = s.points[0]!
      const b = s.points[s.points.length - 1]!
      const va = this.toWorld(a)
      const vb = this.toWorld(b)
      const r = (WEIGHT / 2) * U
      const geo = new THREE.CapsuleGeometry(r, va.distanceTo(vb), 12, 32)
      const mat =
        s.role === 'signal'
          ? new THREE.MeshStandardMaterial({
              color: signal,
              emissive: signal,
              emissiveIntensity: 1.0,
              roughness: 0.3,
            })
          : new THREE.MeshStandardMaterial({
              color: bone,
              roughness: 0.42,
              metalness: 0,
              envMapIntensity: 0.8,
            })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.copy(va).add(vb).multiplyScalar(0.5)
      mesh.userData.role = s.role
      mesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        vb.clone().sub(va).normalize(),
      )
      this.mark.add(mesh)
    }
    this.scene3.add(this.mark)

    // the settled lockup's box, centred on the frame
    const [, , vw, vh] = this.lockup.viewBox.split(' ').map(Number) as [
      number,
      number,
      number,
      number,
    ]
    this.lockBox = {
      x: W / 2 - (vw * LOCK_SCALE) / 2,
      y: LOCK_CY - (vh * LOCK_SCALE) / 2,
    }
  }

  /** Mark space (the 120-unit square, y down) -> world, centred on (60, 60). */
  private toWorld([x, y]: Point) {
    return new THREE.Vector3((x - 60) * U, -(y - 60) * U, 0)
  }

  /** Screen px of lockup point (x, y) once settled. */
  private lockToScreen(x: number, y: number) {
    const top = Number(this.lockup.viewBox.split(' ')[1])
    return [
      this.lockBox.x + x * LOCK_SCALE,
      this.lockBox.y + (y - top) * LOCK_SCALE,
    ] as const
  }

  /** Screen px -> world point on z = 0 for a frontal camera at distance d. */
  private screenToWorld(x: number, y: number, d: number) {
    const pxPerWorld = H / (2 * d * Math.tan(THREE.MathUtils.degToRad(FOV) / 2))
    return new THREE.Vector3(
      (x - W / 2) / pxPerWorld,
      (H / 2 - y) / pxPerWorld,
      0,
    )
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx
    const t = f.t
    const d = distanceFor(MARK.scale)

    // ---- the mark: from the hand-over spot to its place in the lockup
    const settle = prog(
      t,
      LOGO.wordmark,
      LOGO.wordmark + BEAT * 1.6,
      ease.inOutCubic,
    )
    const [mcx, mcy] = this.lockToScreen(
      this.lockup.markDx + 60,
      this.lockup.markDy + 60,
    )
    const from = this.screenToWorld(MARK.cx, MARK.cy, d)
    const to = this.screenToWorld(mcx, mcy, d)
    this.mark.position.copy(from).lerp(to, settle)
    this.mark.scale.setScalar(lerp(1, LOCK_SCALE / MARK.scale, settle))
    // it turns out into the room on the impact, and back as it settles
    const turn =
      prog(t, LOGO.impact, LOGO.impact + 0.5, ease.outExpo) * (1 - settle)
    this.mark.rotation.set(
      0.28 * turn,
      -0.42 * turn + Math.sin(t * 1.3) * 0.03 * (1 - settle),
      -0.03 * turn,
    )
    // the layers part while it is turned - slashes forward, bar back - and
    // close up flat again as it settles
    for (const child of this.mark.children) {
      child.position.z = (child.userData.role === 'signal' ? 0.5 : -0.4) * turn
    }

    // ---- camera: pushed back on the hit, then home
    const back = keys(t, [
      [LOGO.impact, 1],
      [LOGO.impact + 0.35, 1.45, ease.outExpo],
      [LOGO.wordmark, 1.3],
      [LOGO.wordmark + BEAT * 1.6, 1, ease.inOutCubic],
      [15, 0.97, ease.inOutQuad],
    ])
    const orbit = turn * 0.35
    this.camera.position.set(
      Math.sin(orbit) * d * back,
      0.15 * turn * d,
      Math.cos(orbit) * d * back,
    )
    this.camera.lookAt(0, 0, 0)
    this.camera.updateProjectionMatrix()

    this.bg.render(
      renderer,
      out,
      t,
      keys(t, [
        [LOGO.impact, 1],
        [LOGO.impact + 0.6, 0.4],
      ]),
      [0.5, 0.48],
    )
    renderer.setRenderTarget(out)
    renderer.clearDepth()
    renderer.render(this.scene3, this.camera)

    // ---- overlay: shockwave, wordmark, line, install
    const o = this.overlay.ctx
    this.overlay.clear()
    for (let i = 0; i < 3; i++) {
      const k = prog(
        t,
        LOGO.impact + i * 0.07,
        LOGO.impact + i * 0.07 + 0.9,
        ease.outCubic,
      )
      if (k <= 0 || k >= 1) continue
      o.strokeStyle = rgba('ash', (1 - k) * 0.7)
      o.lineWidth = 1.2
      o.beginPath()
      o.arc(MARK.cx, MARK.cy, 120 + k * 900, 0, Math.PI * 2)
      o.stroke()
    }

    // the wordmark writes on, stroke by stroke, at the lockup's scale
    const { strokes } = wordmarkStrokes()
    const lengths = strokes.map(strokeLength)
    const total = lengths.reduce((a, b) => a + b, 0)
    const written =
      prog(
        t,
        LOGO.wordmark + BEAT * 0.5,
        LOGO.wordmark + BEAT * 2.2,
        ease.inOutCubic,
      ) * total
    let before = 0
    o.lineCap = 'round'
    o.lineJoin = 'round'
    o.lineWidth = WEIGHT * LOCK_SCALE
    o.strokeStyle = rgba('bone')
    for (const [i, s] of strokes.entries()) {
      const len = lengths[i]!
      const shown = Math.min(len, written - before)
      before += len
      if (shown <= 0) continue
      const p = new Path2D()
      const pt = (q: Point) =>
        this.lockToScreen(q[0] + this.lockup.wordDx, q[1])
      const [x0, y0] = pt(s.points[0]!)
      p.moveTo(x0, y0)
      const last = s.points.length - 1
      for (let j = 1; j <= last; j++) {
        const [x, y] = pt(s.points[j]!)
        if (s.bend && j === last) {
          const [bx, by] = pt(s.bend)
          p.quadraticCurveTo(bx, by, x, y)
        } else p.lineTo(x, y)
      }
      o.setLineDash([Math.max(0.01, shown * LOCK_SCALE), 1e5])
      o.stroke(p)
    }
    o.setLineDash([])
    o.lineCap = 'butt'

    // the line, centred under the lockup
    const size = 64
    const tagline = 'The cn API, compiled.'
    const tw = measure(tagline, F.display(900), size, -size * 0.035)
    headline(
      o,
      t,
      [{ text: tagline, at: LOGO.tagline, signal: 1 }],
      W / 2 - tw / 2,
      760,
      size,
    )
    // the install command
    const ik = prog(t, LOGO.install, LOGO.install + 0.3, ease.outCubic)
    if (ik > 0) {
      o.save()
      o.globalAlpha = ik
      o.font = font(F.mono(500), 30)
      o.letterSpacing = '0px'
      const cmd = 'pnpm add twl'
      const cw = o.measureText(`$ ${cmd}`).width
      const x = W / 2 - cw / 2
      const y = 860 + (1 - ik) * 14
      o.strokeStyle = rgba('graphite')
      o.lineWidth = 1
      o.strokeRect(x - 28, y - 42, cw + 56 + 22, 62)
      o.fillStyle = rgba('signal')
      o.fillText('$', x, y)
      o.fillStyle = rgba('bone')
      o.fillText(` ${cmd}`, x + o.measureText('$').width, y)
      if (f.beatPhase < 0.55) {
        o.fillStyle = rgba('signal')
        o.fillRect(x + cw + 10, y - 26, 14, 32)
      }
      o.restore()
    }
    label(o, t, 'github.com/Debbl/twl', W / 2, 960, LOGO.install + 0.25, {
      align: 'center',
      size: 16,
    })
    comp.draw(renderer, this.overlay.upload(), out)

    const hit = pulse(t, LOGO.impact, 0.14)
    return {
      // linear: 0.05 of bone over ink already reads as a 25% grey, so it has to die fast
      flash: 0.3 * pulse(t, LOGO.impact, 0.018),
      bloom: 0.5 + 0.12 * hit,
      halation: 0.12,
      shake: [Math.sin(t * 97) * 10 * hit, Math.cos(t * 83) * 7 * hit],
      zoom: 1 + 0.03 * hit,
      ca: 1 + 3 * hit,
    }
  }
}
