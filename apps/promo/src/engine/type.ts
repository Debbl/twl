// Typography: the two families, loaded from public/fonts (both SIL OFL).
// Archivo is the display voice; IBM Plex Mono is code, labels and the HUD.

interface FontDef {
  family: string
  file: string
}

const DEFS: readonly FontDef[] = [
  { family: 'Archivo-500', file: 'Archivo-w1000-500.ttf' },
  { family: 'Archivo-700', file: 'Archivo-w1000-700.ttf' },
  { family: 'Archivo-900', file: 'Archivo-w1000-900.ttf' },
  { family: 'ArchivoCondensed-900', file: 'Archivo-w875-900.ttf' },
  { family: 'Plex-400', file: 'IBMPlexMono-Regular.ttf' },
  { family: 'Plex-500', file: 'IBMPlexMono-Medium.ttf' },
  { family: 'Plex-600', file: 'IBMPlexMono-SemiBold.ttf' },
]

/** Family names by role. */
export const F = {
  display: (weight: 500 | 700 | 900 = 900) => `Archivo-${weight}`,
  condensed: () => 'ArchivoCondensed-900',
  mono: (weight: 400 | 500 | 600 = 400) => `Plex-${weight}`,
} as const

/** A Canvas2D font string. */
export const font = (family: string, px: number) => `${px}px "${family}"`

export async function loadFonts(): Promise<void> {
  await Promise.all(
    DEFS.map(async (d) => {
      const buf = await (await fetch(`/fonts/${d.file}`)).arrayBuffer()
      const face = new FontFace(d.family, buf)
      await face.load()
      document.fonts.add(face)
    }),
  )
  await document.fonts.ready
}

let measureCtx: CanvasRenderingContext2D | null = null
/** Advance width of `text` in `family` at `px`, with `tracking` px between glyphs. */
export function measure(
  text: string,
  family: string,
  px: number,
  tracking = 0,
) {
  if (!measureCtx) {
    const ctx = document.createElement('canvas').getContext('2d')
    if (!ctx) throw new Error('no 2d context')
    measureCtx = ctx
  }
  measureCtx.font = font(family, px)
  measureCtx.letterSpacing = `${tracking}px`
  return measureCtx.measureText(text).width
}
