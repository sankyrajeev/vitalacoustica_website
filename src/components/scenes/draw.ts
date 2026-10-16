// Colours and drawing helpers shared by the site's canvas scenes.

/** Scene colours, switched with the site's light and dark editions. */
export const P = {
  ink: [240, 237, 229] as readonly number[],
  brass: [184, 164, 123] as readonly number[],
  add: 'lighter' as GlobalCompositeOperation, // how glows combine
  light: false,
}

export function syncPalette() {
  const light = document.documentElement.dataset.theme === 'light'
  if (light === P.light) return
  P.light = light
  P.ink = light ? [30, 29, 26] : [240, 237, 229]
  P.brass = light ? [133, 112, 68] : [184, 164, 123]
  P.add = light ? 'multiply' : 'lighter'
}

export const rgba = (c: readonly number[], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a))})`
export const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export type Frame = {
  c: CanvasRenderingContext2D
  w: number
  h: number
  dpr: number
  t: number // seconds
  dt: number
  pointer: { x: number; y: number; active: boolean; down: boolean; dx: number } // x, y: 0 → 1 across the canvas
  progress: number // 0 as the chapter enters from below, 1 as it leaves at the top
}
export type Draw = (f: Frame) => void

export function glow(c: CanvasRenderingContext2D, x: number, y: number, r: number, col: readonly number[], a: number) {
  const g = c.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, rgba(col, a))
  g.addColorStop(1, rgba(col, 0))
  c.fillStyle = g
  c.fillRect(x - r, y - r, r * 2, r * 2)
}

export function label(
  c: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  dpr: number,
  a = 0.7,
  align: CanvasTextAlign = 'center',
) {
  c.font = `600 ${10.5 * dpr}px Manrope, system-ui, sans-serif`
  c.letterSpacing = `${2 * dpr}px`
  c.textAlign = align
  c.fillStyle = rgba(P.ink, a)
  c.fillText(text.toUpperCase(), x, y)
  c.letterSpacing = '0px'
}
