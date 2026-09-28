// fig. 01 - a className, as found. One real-world class string types out on a
// wall, faster and faster; the camera starts on the caret and pulls back until
// the whole thing is visible. Conflicting classes are underlined as they land.
import * as THREE from 'three'
import { H, Layer2D, W } from '../engine/gl.ts'
import { rgba } from '../engine/palette.ts'
import { Scene } from '../engine/scene.ts'
import { F, font } from '../engine/type.ts'
import { ease, keys, lerp, prog, pulse } from '../engine/util.ts'
import { MESS_CLASSES, MESS_CONFLICTS, at, messAt } from '../score.ts'
import { Backdrop, caret, headline, label } from './_kit.ts'
import type { Frame, PostOverrides } from '../engine/scene.ts'

// The wall: a 3840 x 2160 canvas on a plane twice the frame.
const WW = 3840
const WH = 2160
/** Texels per wall px: the opening frames look at the wall from close up. */
const DENSITY = 1.5
const SIZE = 64
const LINE = 96
const LEFT = 220
const TOP = 360
const MAX = WW - 440
const PREFIX = 'className="'
const NOTES: Readonly<Record<string, string>> = {
  'p-2': 'SETS PADDING',
  'p-4': 'SETS PADDING AGAIN',
}

interface Placed {
  text: string
  x: number
  y: number
  w: number
  conflict: boolean
}

export default class Mess extends Scene {
  private bg = new Backdrop()
  private wall = new Layer2D(WW * DENSITY, WH * DENSITY)
  /** What the wall last showed; an unchanged wall is neither redrawn nor uploaded. */
  private wallKey = ''
  private overlay = new Layer2D()
  private scene3 = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(34, W / H, 0.1, 400)
  private plane!: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  private placed: Placed[] = []
  private prefixW = 0

  override init() {
    const mat = new THREE.MeshBasicMaterial({
      map: this.wall.texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    })
    this.wall.texture.anisotropy = 8
    this.plane = new THREE.Mesh(
      new THREE.PlaneGeometry(WW / 100, WH / 100),
      mat,
    )
    this.scene3.add(this.plane)

    // Lay the classes out once, wrapping like an editor with soft wrap on.
    const c = this.wall.ctx
    c.font = font(F.mono(400), SIZE)
    this.prefixW = c.measureText(PREFIX).width
    const space = c.measureText(' ').width
    let x = LEFT + this.prefixW
    let y = TOP
    for (const text of MESS_CLASSES) {
      const w = c.measureText(text).width
      if (x + w > MAX) {
        x = LEFT + this.prefixW
        y += LINE
      }
      this.placed.push({
        text,
        x,
        y,
        w,
        conflict: MESS_CONFLICTS.includes(text),
      })
      x += w + space
    }
  }

  /** Wall px -> world, the plane centred at the origin, 100 px per unit. */
  private world(x: number, y: number) {
    return new THREE.Vector3((x - WW / 2) / 100, (WH / 2 - y) / 100, 0)
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx
    const t = f.t

    // ---- the wall: redrawn only when what it shows has changed
    const c = this.wall.ctx
    const q = (x: number) => Math.round(x * 8)
    let key = f.beatPhase > 0.55 ? 'off' : 'on'
    for (const [i, p] of this.placed.entries()) {
      const t0 = messAt(i)
      if (t < t0) break
      key += `|${Math.ceil(p.text.length * prog(t, t0, t0 + 0.06))},${q(pulse(t, t0, 0.08))},${p.conflict ? q(prog(t, t0 + 0.04, t0 + 0.22)) : 0}`
    }
    const dirty = key !== this.wallKey
    this.wallKey = key
    this.wall.clear()
    c.setTransform(DENSITY, 0, 0, DENSITY, 0, 0)
    c.font = font(F.mono(400), SIZE)
    c.textBaseline = 'alphabetic'
    c.fillStyle = rgba('ash', 0.8)
    c.fillText(PREFIX, LEFT, TOP)
    let head = { x: LEFT + this.prefixW, y: TOP }
    let shown = 0
    for (const [i, p] of this.placed.entries()) {
      const t0 = messAt(i)
      if (t < t0) break
      shown++
      // each class types its characters over 60 ms
      const chars = Math.ceil(p.text.length * prog(t, t0, t0 + 0.06))
      const hit = pulse(t, t0, 0.08)
      c.fillStyle = p.conflict ? rgba('bone') : rgba('bone', 0.62 + 0.38 * hit)
      c.fillText(p.text.slice(0, chars), p.x, p.y)
      if (p.conflict) {
        const u = prog(t, t0 + 0.04, t0 + 0.22, ease.outCubic)
        c.fillStyle = rgba('signal')
        c.fillRect(p.x, p.y + 16, p.w * u, 5)
        // p-2 and p-4 both set all four paddings: the one pair worth a note
        const note = NOTES[p.text]
        if (note) {
          c.font = font(F.mono(500), 26)
          c.letterSpacing = '2px'
          c.fillStyle = rgba('signal', u)
          c.fillText(note, p.x, p.y + 56)
          c.letterSpacing = '0px'
          c.font = font(F.mono(400), SIZE)
        }
      }
      head = {
        x: p.x + c.measureText(p.text.slice(0, chars)).width + 8,
        y: p.y,
      }
    }
    caret(c, head.x, head.y, SIZE, f.beatPhase)

    // ---- camera: framed on `className="` for the opening frame, onto the
    // caret as the first classes land, then back to take the whole wall in
    const pull = prog(t, 0.1, at(1, 3.5), ease.inOutCubic)
    const onCaret = prog(t, messAt(0), messAt(2), ease.inOutCubic)
    const opening = this.world(LEFT + this.prefixW * 0.62, TOP - SIZE * 0.35)
    const target = opening.lerp(this.world(head.x, head.y), onCaret)
    const whole = this.world(WW * 0.44, TOP + 520)
    const look = target.clone().lerp(whole, pull)
    const dist = lerp(7.4, 25.5, pull ** 1.3)
    const yaw = lerp(-0.55, -0.12, pull)
    const pitch = lerp(0.2, 0.05, pull)
    this.camera.position.set(
      look.x + Math.sin(yaw) * dist,
      look.y + Math.sin(pitch) * dist,
      Math.cos(yaw) * dist,
    )
    this.camera.up
      .set(
        Math.sin(
          keys(t, [
            [0, -0.1],
            [at(1, 3.5), 0.02],
          ]),
        ),
        1,
        0,
      )
      .normalize()
    this.camera.lookAt(look)
    if (dirty) this.wall.upload()
    this.bg.render(renderer, out, t, 0.6, [0.35, 0.55])
    renderer.setRenderTarget(out)
    renderer.clearDepth()
    renderer.render(this.scene3, this.camera)

    // ---- overlay: the headline and live counters, in screen space
    const o = this.overlay.ctx
    this.overlay.clear()
    // the full stop is the one signal-coloured glyph
    headline(
      o,
      t,
      [
        { text: 'Class names', at: at(1, 0) },
        { text: 'get messy.', at: at(1, 2), signal: 1 },
      ],
      96,
      870,
      150,
    )
    const conflicts = this.placed
      .slice(0, shown)
      .filter((p) => p.conflict).length
    // live counters, set above the headline on the same left edge
    label(o, t, `${String(shown).padStart(2, '0')} classes`, 100, 690, -1, {
      color: rgba('bone', 0.9),
    })
    label(o, t, `${conflicts} conflicts`, 294, 690, -1, {
      color: conflicts ? rgba('signal') : rgba('ash'),
    })
    label(o, t, 'one button, as found in the wild', 100, 720, -1)
    comp.draw(renderer, this.overlay.upload(), out)

    return {
      bloom: 0.5,
      shake: [Math.sin(t * 90) * 3 * pulse(t, at(1), 0.1), 0],
      zoom: 1 + 0.012 * pulse(t, at(1, 2), 0.15),
    }
  }
}
