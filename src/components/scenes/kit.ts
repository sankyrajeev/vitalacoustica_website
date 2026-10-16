// Small drawing helpers shared by the dark-stage canvas scenes (Visuals, Production).

export const INK = 'rgba(240,237,229,'
export const BRASS = 'rgba(184,164,123,'
export const font = (px: number, dpr: number, weight = 600) => `${weight} ${px * dpr}px Manrope, system-ui, sans-serif`
export const fract = (x: number) => x - Math.floor(x)
export const hash = (n: number) => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453)

export function tag(
  c: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  dpr: number,
  a = 0.7,
  align: CanvasTextAlign = 'left',
  col = INK,
) {
  c.font = font(10, dpr)
  c.letterSpacing = `${1.8 * dpr}px`
  c.textAlign = align
  c.fillStyle = `${col}${a})`
  c.fillText(text.toUpperCase(), x, y)
  c.letterSpacing = '0px'
}

/** Shapes collected by brightness, so a scene of thousands of cells costs a dozen fills. */
export const LEVELS = 12
export const buckets = () => Array.from({ length: LEVELS }, () => new Path2D())
export function addQuad(b: Path2D[], v: number, pts: readonly (readonly [number, number, number])[]) {
  if (v <= 0.02) return
  const p = b[Math.min(LEVELS - 1, Math.round(v * (LEVELS - 1)))]
  p.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1])
  p.closePath()
}
export function addLine(b: Path2D[], v: number, a: readonly number[], z: readonly number[]) {
  if (v <= 0.02) return
  const p = b[Math.min(LEVELS - 1, Math.round(v * (LEVELS - 1)))]
  p.moveTo(a[0], a[1])
  p.lineTo(z[0], z[1])
}
export function fillBuckets(c: CanvasRenderingContext2D, b: Path2D[], rgb: string, gain = 1, stroke = false) {
  b.forEach((p, i) => {
    const a = Math.min(1, ((i + 1) / LEVELS) * gain)
    if (stroke) {
      c.strokeStyle = `rgba(${rgb},${a})`
      c.stroke(p)
    } else {
      c.fillStyle = `rgba(${rgb},${a})`
      c.fill(p)
    }
  })
}

/** A small offscreen image to draw per pixel, then scale up. */
export function makePixels(W: number, H: number) {
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const x = cv.getContext('2d')!
  const img = x.createImageData(W, H)
  return { cv, W, H, d: img.data, flush: () => x.putImageData(img, 0, 0) }
}
