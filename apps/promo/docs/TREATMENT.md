# twl promo: treatment

15 seconds, 8 bars at 128 BPM. The film makes one argument: a className is a
mess; written as commented groups in `cn`, it is code; sorted, it is tidy;
compiled, it is one string - and the comments and the string, drawn as they
are, _are_ the logo: `//` over a bar.

## The edit

| fig | scene     | bars | what happens                                                                                                                                            |
| --- | --------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | `mess`    | 1-2  | A real-world className types out on a wall, faster and faster. The two classes that both set padding are underlined. "Class names / get messy."         |
| 02  | `write`   | 3-4  | The same classes as a `cn` template: three `// comments` type in, one per beat; each group's classes drop in on the next bar. "Write them / like code." |
| 03  | `sort`    | 5    | Each group sorts itself, one swap per beat, a signal trail on the arc. "Sorted inside / each group."                                                    |
| 04  | `compile` | 6    | Comments struck, whitespace collapses, backticks become quotes. The comments' slashes gather as one `//`; on the last beat the string shrinks to a bar. |
| 05  | `logo`    | 7-8  | The mark lands (the only 3D solid in the film), turns, settles into the lockup; the wordmark writes on; the line; `pnpm add twl`.                       |

Every cut is on a downbeat. Everything a scene reacts to (a comment typed, a
swap, a slam) is defined once in `src/score.ts`; the soundtrack is rendered
from the same events, so picture and sound cannot drift.

## Style

- **Palette:** the logo's. Ink `#0B0C10`, ink2 `#14161C` for raised surfaces,
  graphite `#4A5061` for hairlines, ash `#98A0B3` for secondary text, bone
  `#EEF0F4` for type, and one signal colour, sky `#38BDF8`. No other hues.
- **Only the signal glows.** Bloom keys on chroma, not luminance, so bone type
  stays crisp next to a glowing slash. Signal is spent sparingly: the caret,
  the `//`, the conflict underline, sort trails, a full stop per headline.
- **Type:** Archivo Black for headlines, tight (-3.5% tracking), glyphs
  rising from behind a mask. IBM Plex Mono for code, labels and the HUD;
  labels are uppercase with wide tracking. Both are SIL OFL, in
  `public/fonts/` with their licenses.
- **Layout:** headlines bottom-left on a 96 px margin, code on the right, mono
  notes on the same left edge. Crop marks and a fig. counter frame every shot.
- **Motion:** strong eases (`outExpo`, `inOutCubic`), holds, then snaps on the
  beat. The camera moves only when it says something: onto the caret, back to
  show the length, flat to read the code.
- **Honesty:** every class, every sort and the compiled string on screen are
  real - checked against eslint-plugin-twl's sorter and twl's compiler.

## Not this

No neon cyberpunk, no synthwave grids, no particle nebulae, no lens flares, no
emoji, no product UIs or logos other than twl's own.
