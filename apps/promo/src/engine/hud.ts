// The HUD: crop marks at the corners and a few mono annotations, drawn once
// per frame over the composited image. Deadpan, small, never in the way.
import { BAR, BPM, SCENES } from '../score.ts'
import { Layer2D, H, W } from './gl.ts'
import { rgba } from './palette.ts'
import { F, font } from './type.ts'

export class Hud {
  private layer = new Layer2D()

  draw(t: number, opacity: number) {
    const c = this.layer.ctx
    this.layer.clear()
    if (opacity <= 0) return this.layer.upload()
    c.globalAlpha = opacity
    const m = 48
    const len = 22
    c.strokeStyle = rgba('ash', 0.55)
    c.lineWidth = 1
    c.beginPath()
    for (const [x, y, sx, sy] of [
      [m, m, 1, 1],
      [W - m, m, -1, 1],
      [m, H - m, 1, -1],
      [W - m, H - m, -1, -1],
    ] as const) {
      c.moveTo(x, y + sy * len)
      c.lineTo(x, y)
      c.lineTo(x + sx * len, y)
    }
    c.stroke()

    c.font = font(F.mono(500), 15)
    c.letterSpacing = '1.5px'
    c.textBaseline = 'alphabetic'
    const index = SCENES.findIndex((s) => t >= s.from * BAR && t < s.to * BAR)
    const scene = SCENES[Math.max(0, index)]!
    const secs = Math.floor(t)
    const cs = Math.floor((t - secs) * 100)
    const label = (
      text: string,
      x: number,
      y: number,
      align: CanvasTextAlign,
      color = rgba('ash', 0.75),
    ) => {
      c.fillStyle = color
      c.textAlign = align
      c.fillText(text.toUpperCase(), x, y)
    }
    label('twl', m + 34, m + 16, 'left', rgba('bone', 0.9))
    label('the cn api, compiled', m + 82, m + 16, 'left')
    label(
      `00:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`,
      W - m - 34,
      m + 16,
      'right',
    )
    label(
      `fig. ${String(Math.max(0, index) + 1).padStart(2, '0')} / 0${SCENES.length}`,
      m + 34,
      H - m - 6,
      'left',
      rgba('bone', 0.9),
    )
    label(scene.title, m + 170, H - m - 6, 'left')
    label(`${BPM} bpm · 1920×1080`, W - m - 34, H - m - 6, 'right')
    return this.layer.upload()
  }
}
