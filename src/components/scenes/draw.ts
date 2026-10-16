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

/* ─────────────── a small 3D camera for canvas scenes ─────────────── */

export type V3 = readonly [number, number, number]
export type Proj = (p: V3) => readonly [number, number, number]

/** Perspective projection looking towards +z, turned by `yaw` and tilted down by `pitch`. */
export function camera(o: { cx: number; cy: number; scale: number; yaw: number; pitch: number; persp?: number }): Proj {
  const cyw = Math.cos(o.yaw)
  const syw = Math.sin(o.yaw)
  const cp = Math.cos(o.pitch)
  const sp = Math.sin(o.pitch)
  const D = o.persp ?? 60
  return ([x, y, z]) => {
    const x1 = x * cyw - z * syw
    const z1 = x * syw + z * cyw
    const y1 = y * cp + z1 * sp
    const z2 = -y * sp + z1 * cp
    const f = D / (D + z2)
    return [o.cx + x1 * o.scale * f, o.cy - y1 * o.scale * f, z2] as const
  }
}

/** Traces a 3D polyline into the current path. */
export function trace(c: CanvasRenderingContext2D, proj: Proj, pts: readonly V3[], close = false) {
  pts.forEach((p, i) => {
    const [x, y] = proj(p)
    if (i) c.lineTo(x, y)
    else c.moveTo(x, y)
  })
  if (close) c.closePath()
}

/** A box's twelve edges, from one corner to the opposite. */
export function box(c: CanvasRenderingContext2D, proj: Proj, [x0, y0, z0]: V3, [x1, y1, z1]: V3) {
  const v: V3[] = [
    [x0, y0, z0],
    [x1, y0, z0],
    [x1, y0, z1],
    [x0, y0, z1],
    [x0, y1, z0],
    [x1, y1, z0],
    [x1, y1, z1],
    [x0, y1, z1],
  ]
  const e = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ]
  c.beginPath()
  for (const [a, b] of e) {
    const [ax, ay] = proj(v[a])
    const [bx, by] = proj(v[b])
    c.moveTo(ax, ay)
    c.lineTo(bx, by)
  }
  c.stroke()
}

/** A circle lying flat at height y. */
export function ring(c: CanvasRenderingContext2D, proj: Proj, x: number, y: number, z: number, r: number, n = 28) {
  c.beginPath()
  trace(
    c,
    proj,
    Array.from(
      { length: n + 1 },
      (_, i) => [x + Math.cos((i / n) * Math.PI * 2) * r, y, z + Math.sin((i / n) * Math.PI * 2) * r] as V3,
    ),
  )
}
