# Engine

The film is a web app: TypeScript and three.js on Vite. Any time `t` renders
deterministically at 1920x1080, so the preview and the 60 fps export are the
same frames. The engine is ported from the P(doom) music video's, without its
lyric, 4K and stateful-scene machinery.

## Layout

- `src/score.ts` - the edit and the music: BPM, scene windows, the moments
  scenes act on, drum hits and chords. The single source of timing.
- `src/timeline.ts` - one entry per scene window, straight from the score.
- `src/engine/` - the renderer: `engine.ts` (compositing, adaptive motion
  blur), `post.ts` (bloom, halation, CA, tone shoulder, grain, vignette),
  `gl.ts` (render targets, fullscreen passes, Canvas2D layers), `type.ts`,
  `hud.ts`, `palette.ts`, `util.ts`.
- `src/scenes/` - `mess`, `code` (write, sort and compile share it) and `logo`,
  plus `_kit.ts`: the backdrop, headlines, labels, a Canvas2D sheet on a 3D
  plane, and `MARK`, the spot where the mark is handed from one scene to the
  next.
- `src/brand/logo.ts` - the logo's geometry; the video, `scripts/brand.ts`
  and the docs site all read it.
- `scripts/` - `render.ts` (headless Chrome through Playwright, raw frames
  over a WebSocket into ffmpeg), `score.ts` (the soundtrack synth) and
  `brand.ts` (logo, favicon and Open Graph assets).

## Rules for scenes

- Output is a pure function of `f.t`. No `Math.random()` or clocks: the export
  renders sub-frames out of order. Use `mulberry32`, `hash` and `frameIdx`.
- Read times from `src/score.ts`, never hard-code them in a scene.
- Colours are linear; only saturated colour (the signal) blooms.
- Return post overrides (`zoom`, `shake`, `flash`, `bloom`, `exposure` ...)
  rather than faking them in the scene. Remember `flash` adds linear light: a
  little goes a long way over ink.

## Commands

```sh
pnpm dev                           # preview at http://localhost:5199
pnpm stills --t 2.4,7.6            # PNGs into out/stills
pnpm sheet --cuts                  # frames around every cut
pnpm sheet --from 9 --to 11.25     # a range as a contact sheet
pnpm render --samples auto --shutter 0.2   # the MP4, with motion blur
pnpm score                         # re-render the soundtrack
pnpm brand                         # re-export logo, favicon, OG card
```

Preview keys: `space` play, `←`/`→` ±1 s (`shift` ±5 s), `,`/`.` one frame,
`[`/`]` previous/next scene, `l` loop the scene, `h` hide the UI.

`--samples auto` renders each frame as the average of 4 to 324 sub-frames
over the shutter, stepping 4, 12, 36, 108, 324 until the estimated error is
under `--tol` levels (default 3); `--samples N` fixes the count.
