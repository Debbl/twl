import { markStrokes, WEIGHT } from '../brand/logo.ts'
import { Layer2D, W } from '../engine/gl.ts'
import { rgba } from '../engine/palette.ts'
import { Scene } from '../engine/scene.ts'
import { F, font } from '../engine/type.ts'
import { ease, keys, lerp, prog, pulse } from '../engine/util.ts'
import {
  BEAT,
  CLASSES_IN,
  COMPILE,
  COMPILED,
  GROUPS,
  LOGO,
  SWAPS,
  TYPING,
  at,
  typedAt,
} from '../score.ts'
import { Backdrop, Sheet, headline, label, markToScreen, MARK } from './_kit.ts'
// fig. 02-04 - one card, three acts. The template is written as commented
// groups (write), each group is sorted in place (sort), then the comments fall
// away and the classes close up into the one string twl compiles it to
// (compile). On the last beat the string shrinks to a bar and the comments'
// slashes gather above it: the mark, handed to the logo scene.
import type * as THREE from 'three'
import type { Frame, PostOverrides } from '../engine/scene.ts'

const SIZE = 46
const LINE = 76
/** Code space: col/row of a mono grid; drawn through a moving transform. */
const X0 = 930
const Y0 = 250
/** The compiled line, scaled down to fit the frame and centred. */
const PREFIX = 'const button = '
const COMPILED_COLS = PREFIX.length + COMPILED.length + 2
const LEAN = Math.tan((18 * Math.PI) / 180)

interface Token {
  text: string
  group: number
  /** Column before and after sorting, and in the compiled line. */
  colBefore: number
  colAfter: number
  colCompiled: number
  /** Order in the compiled line, for the stagger. */
  order: number
}

function buildTokens(): Token[] {
  const out: Token[] = []
  const compiled = COMPILED.split(' ')
  for (const [g, group] of GROUPS.entries()) {
    const cols = (names: readonly string[]) => {
      const m = new Map<string, number>()
      let col = 2
      for (const n of names) {
        m.set(n, col)
        col += n.length + 1
      }
      return m
    }
    const before = cols(group.before)
    const after = cols(group.after)
    for (const text of group.before) {
      const order = compiled.indexOf(text)
      const colCompiled =
        PREFIX.length +
        1 +
        compiled.slice(0, order).reduce((a, s) => a + s.length + 1, 0)
      out.push({
        text,
        group: g,
        colBefore: before.get(text)!,
        colAfter: after.get(text)!,
        colCompiled,
        order,
      })
    }
  }
  return out
}

export default class Code extends Scene {
  private bg = new Backdrop()
  private sheet = new Sheet(30)
  private overlay = new Layer2D()
  private tokens = buildTokens()
  private cw = 0

  override init() {
    const c = this.sheet.layer.ctx
    c.font = font(F.mono(400), SIZE)
    this.cw = c.measureText('0').width
  }

  /** Code space -> sheet px, with the block's move and scale at time t. */
  private place(t: number) {
    const k = prog(t, COMPILE.collapse, COMPILE.collapse + 0.4, ease.inOutCubic)
    const s = lerp(1, 0.8, k)
    const width = COMPILED_COLS * this.cw * s
    const ox = lerp(X0, (W - width) / 2, k)
    // the compiled line sits above where the mark will form
    const oy = lerp(Y0, 300, k)
    return { s, ox, oy }
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx
    const t = f.t
    const c = this.sheet.layer.ctx
    const cw = this.cw
    this.sheet.layer.clear()

    const { s, ox, oy } = this.place(t)
    const X = (col: number) => ox + col * cw * s
    const Y = (row: number) => oy + row * LINE * s
    c.font = font(F.mono(400), SIZE * s)
    c.textBaseline = 'alphabetic'

    // ---- line numbers and the gutter rule fade out as the block collapses
    const gutter = 1 - prog(t, COMPILE.collapse, COMPILE.collapse + 0.2)
    if (gutter > 0) {
      c.fillStyle = rgba('graphite', gutter)
      c.textAlign = 'right'
      for (let r = 0; r < 8; r++)
        if (t >= at(2) + r * 0.03) c.fillText(String(r + 1), X(-1.5), Y(r))
      c.textAlign = 'left'
    }

    // ---- line 0: const button = cn`  ->  const button = "
    const l0 =
      prog(t, at(2), at(2) + 0.25, ease.outCubic) *
      (1 - prog(t, COMPILE.shrink, COMPILE.shrink + 0.2))
    const quote = prog(t, COMPILE.quote, COMPILE.quote + 0.2, ease.outBack)
    c.globalAlpha = l0
    c.fillStyle = rgba('ash')
    c.fillText('const', X(0), Y(0))
    c.fillStyle = rgba('bone')
    c.fillText('button', X(6), Y(0))
    c.fillStyle = rgba('ash')
    c.fillText('=', X(13), Y(0))
    // cn slides out when the whitespace collapses; the backtick becomes a quote
    const cnOut = prog(
      t,
      COMPILE.collapse,
      COMPILE.collapse + 0.25,
      ease.inCubic,
    )
    c.globalAlpha = l0 * (1 - cnOut)
    c.fillStyle = rgba('bone')
    c.fillText('cn', X(15) - cnOut * 30, Y(0))
    c.globalAlpha = l0
    const openCol = lerp(17, 15, cnOut)
    this.morphTick(c, X(openCol), Y(0), quote)
    c.globalAlpha = 1

    // ---- comments: typed, then struck through and faded
    for (const [g, group] of GROUPS.entries()) {
      const row = 1 + g * 2
      const typed = typedAt(g).filter((ct) => ct <= t).length
      if (typed === 0) continue
      const text = group.comment.slice(2)
      const shown = Math.max(0, typed - 2)
      const strike = prog(
        t,
        COMPILE.strike + g * 0.05,
        COMPILE.strike + g * 0.05 + 0.18,
        ease.outCubic,
      )
      const fade = 1 - prog(t, COMPILE.collapse - 0.05, COMPILE.collapse + 0.15)
      c.globalAlpha = fade
      c.fillStyle = rgba('ash')
      c.fillText(text.slice(0, shown), X(4), Y(row))
      if (strike > 0) {
        c.fillStyle = rgba('bone', 0.8)
        c.fillRect(
          X(2),
          Y(row) - SIZE * s * 0.3,
          (text.length + 2) * cw * s * strike,
          2,
        )
      }
      c.globalAlpha = 1
      // the slashes: drawn as strokes at the logo's lean, so they can become it
      for (let k = 0; k < Math.min(2, typed); k++)
        this.slash(c, t, g, k, X(2 + k), Y(row), s)
      // the group bracket and its label
      const bx = X(26)
      const top = Y(row) - SIZE * s * 0.8
      const bottom = Y(row + 1) + SIZE * s * 0.3
      const bk =
        prog(t, TYPING[g]!.end, TYPING[g]!.end + 0.3, ease.outCubic) * fade
      if (bk > 0) {
        c.strokeStyle = rgba('graphite', bk)
        c.lineWidth = 1.5
        c.beginPath()
        c.moveTo(bx - 14, top)
        c.lineTo(bx, top)
        c.lineTo(bx, top + (bottom - top) * bk)
        c.lineTo(bx - 14, top + (bottom - top) * bk)
        c.stroke()
        label(
          c,
          t,
          `group ${String(g + 1).padStart(2, '0')}`,
          bx + 22,
          top + 26,
          TYPING[g]!.end + 0.1,
          { size: 15, out: COMPILE.collapse - 0.1 },
        )
        const done = SWAPS[g]!.end
        label(c, t, '✓ sorted', bx + 22, top + 52, done, {
          size: 15,
          color: rgba('signal'),
          out: COMPILE.collapse - 0.1,
        })
      }
    }

    // ---- the classes
    const lineK = (tok: Token) =>
      prog(
        t,
        COMPILE.collapse + tok.order * 0.035,
        COMPILE.collapse + tok.order * 0.035 + 0.36,
        ease.inOutCubic,
      )
    const shrink = prog(
      t,
      COMPILE.shrink,
      COMPILE.shrink + BEAT * 0.8,
      ease.inOutExpo,
    )
    for (const tok of this.tokens) {
      const inK = prog(
        t,
        CLASSES_IN[tok.group]!,
        CLASSES_IN[tok.group]! + 0.32,
        ease.outExpo,
      )
      if (inK <= 0) continue
      const sw = SWAPS[tok.group]!
      const sk = prog(t, sw.start, sw.end, ease.inOutCubic)
      const row = 2 + tok.group * 2
      const moving = tok.colAfter > tok.colBefore ? 1 : -1
      const col = lerp(tok.colBefore, tok.colAfter, sk)
      // swapped classes pass over and under each other
      const arc = Math.sin(Math.PI * sk) * LINE * 0.45 * moving
      let x = X(col)
      let y = Y(row) - (1 - inK) * 60 - arc
      const lk = lineK(tok)
      if (lk > 0) {
        x = lerp(x, X(tok.colCompiled), lk)
        y = lerp(Y(row), Y(0), lk)
      }
      // the string shrinks into the mark's bar
      c.globalAlpha = inK * (1 - shrink)
      c.fillStyle = rgba('bone')
      c.fillText(tok.text, x, y)
      if (sk > 0 && sk < 1) {
        // a signal trail along the arc
        c.strokeStyle = rgba('signal', Math.sin(Math.PI * sk))
        c.lineWidth = 2
        c.beginPath()
        for (let i = 0; i <= 16; i++) {
          const u = (sk * i) / 16
          const px =
            X(lerp(tok.colBefore, tok.colAfter, u)) +
            (tok.text.length * cw * s) / 2
          const py =
            Y(row) - SIZE * 0.35 - Math.sin(Math.PI * u) * LINE * 0.45 * moving
          if (i === 0) c.moveTo(px, py)
          else c.lineTo(px, py)
        }
        c.stroke()
      }
      c.globalAlpha = 1
    }

    // ---- the closing backtick flies to the end of the line and turns
    const close = prog(t, at(3, 3), at(3, 3) + 0.25, ease.outCubic)
    if (close > 0) {
      const flyK = prog(
        t,
        COMPILE.collapse + 0.2,
        COMPILE.collapse + 0.55,
        ease.inOutCubic,
      )
      c.globalAlpha = close * (1 - shrink)
      this.morphTick(
        c,
        lerp(X(0), X(PREFIX.length + 1 + COMPILED.length), flyK),
        lerp(Y(7), Y(0), flyK),
        quote,
      )
      c.globalAlpha = 1
    }

    // ---- the bar: the compiled line, squeezed into the mark's bar
    if (shrink > 0) {
      const [bx0, by] = markToScreen(36, 91)
      const [bx1] = markToScreen(84, 91)
      const x0 = lerp(X(PREFIX.length), bx0, shrink)
      const x1 = lerp(X(PREFIX.length + 2 + COMPILED.length), bx1, shrink)
      const y = lerp(Y(0) - SIZE * s * 0.35, by, shrink)
      const w = lerp(SIZE * s * 0.9, WEIGHT * MARK.scale, shrink)
      c.strokeStyle = rgba('bone', Math.min(1, shrink * 3))
      c.lineCap = 'round'
      c.lineWidth = w
      // the string's own ends are inset by half a stroke; the mark's bar, like
      // the logo's path, runs endpoint to endpoint with round caps past them
      const inset = (w / 2) * (1 - shrink)
      c.beginPath()
      c.moveTo(x0 + inset, y)
      c.lineTo(x1 - inset, y)
      c.stroke()
      c.lineCap = 'butt'
    }

    // ---- camera: tilted in, frontal by the time the comments are struck
    const flat = prog(t, at(2), COMPILE.strike - BEAT, ease.inOutCubic)
    const sway =
      Math.sin((t - at(2)) * 0.9) *
      (1 - prog(t, at(4, 3), COMPILE.strike, ease.inOutCubic))
    this.sheet.mesh.rotation.set(
      lerp(0.32, 0, flat) + 0.02 * sway,
      lerp(-0.55, 0, flat) + 0.06 * sway,
      lerp(0.05, 0, flat),
    )
    const d = this.sheet.frontal()
    this.sheet.camera.position.set(
      lerp(2.2, 0, flat),
      lerp(-0.6, 0, flat),
      d * lerp(0.82, 1, flat),
    )
    this.sheet.camera.lookAt(0, 0, 0)

    this.bg.render(renderer, out, t, 1, [0.62, 0.45])
    renderer.setRenderTarget(out)
    renderer.clearDepth()
    this.sheet.render(renderer, out)

    // ---- headlines and notes, in screen space
    const o = this.overlay.ctx
    this.overlay.clear()
    headline(
      o,
      t,
      [
        { text: 'Write them', at: at(2, 0) },
        { text: 'like code.', at: at(2, 1), signal: 1 },
      ],
      96,
      860,
      118,
      at(4) - 0.32,
    )
    headline(
      o,
      t,
      [
        { text: 'Sorted inside', at: at(4, 0) },
        { text: 'each group.', at: at(4, 1), signal: 1 },
      ],
      96,
      860,
      118,
      at(5) - 0.32,
    )
    headline(
      o,
      t,
      [
        { text: 'Compiled at', at: at(5, 0) },
        { text: 'build time.', at: at(5, 1), signal: 1 },
      ],
      96,
      860,
      118,
      COMPILE.shrink,
    )
    label(o, t, 'comments and newlines, inside cn`…`', 100, 1010, at(2, 2), {
      out: at(4) - 0.3,
    })
    label(
      o,
      t,
      'twl/sort-classes · eslint-plugin-twl · oxlint-plugin-twl',
      100,
      1010,
      at(4, 2),
      { out: at(5) - 0.3 },
    )
    label(
      o,
      t,
      'static templates become plain strings',
      100,
      1010,
      at(5, 1.5),
      { out: COMPILE.shrink },
    )
    label(
      o,
      t,
      'vite · rollup · rolldown · webpack · rspack · esbuild · farm · next.js',
      100,
      680,
      at(5, 2),
      { out: COMPILE.shrink, color: rgba('bone', 0.8) },
    )
    comp.draw(renderer, this.overlay.upload(), out)

    const hits =
      SWAPS.reduce((a, sw) => a + pulse(t, sw.end, 0.09), 0) +
      pulse(t, CLASSES_IN[0]!, 0.1) * 0.5
    return {
      zoom: 1 + 0.01 * hits + 0.02 * pulse(t, COMPILE.quote, 0.12),
      shake: [0, Math.sin(t * 80) * 2 * pulse(t, COMPILE.collapse, 0.08)],
      // silence before the drop: the frame dims with the sound
      exposure: keys(t, [
        [COMPILE.shrink, 1],
        [LOGO.impact - 0.02, 0.85, ease.inQuad],
      ]),
    }
  }

  /** A backtick that turns into a double quote as `k` goes 0 -> 1. */
  private morphTick(
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    k: number,
  ) {
    const a = c.globalAlpha
    c.fillStyle = rgba('ash')
    c.globalAlpha = a * (1 - k)
    c.fillText('`', x, y)
    c.globalAlpha = a * k
    c.fillStyle = rgba('bone')
    c.fillText('"', x, y - (1 - k) * 20)
    c.globalAlpha = a
  }

  /**
   * One slash of comment `g` (k = 0 or 1). When the comments are struck it
   * lifts out and flies to slash k of the mark, where the three comments'
   * slashes wait as one thin `//`; on the last beat it thickens into the mark.
   */
  private slash(
    c: CanvasRenderingContext2D,
    t: number,
    g: number,
    k: number,
    x: number,
    y: number,
    s: number,
  ) {
    const h = SIZE * s * 0.7
    const fly = prog(
      t,
      COMPILE.strike + 0.1 + g * 0.06,
      COMPILE.collapse + 0.35 + g * 0.06,
      ease.inOutExpo,
    )
    const grow = prog(
      t,
      COMPILE.shrink,
      COMPILE.shrink + BEAT * 0.8,
      ease.inOutExpo,
    )
    const stroke = markStrokes()[k]!
    const [bx, by] = markToScreen(stroke.points[0]![0], stroke.points[0]![1])
    const [tx, ty] = markToScreen(stroke.points[1]![0], stroke.points[1]![1])
    const x0 = lerp(x + SIZE * s * 0.12, bx, fly)
    const y0 = lerp(y + 2, by, fly)
    const x1 = lerp(x + SIZE * s * 0.12 + LEAN * h, tx, fly)
    const y1 = lerp(y + 2 - h, ty, fly)
    c.strokeStyle = rgba('signal')
    c.lineCap = 'round'
    c.lineWidth = lerp(3.5, WEIGHT * MARK.scale, grow)
    c.beginPath()
    c.moveTo(x0, y0)
    c.lineTo(x1, y1)
    c.stroke()
    c.lineCap = 'butt'
  }
}
