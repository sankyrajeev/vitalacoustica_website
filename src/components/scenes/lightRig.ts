import { camera, type Frame, type Proj, type V3 } from './draw'

// A small moving-head rig for the Light page: six heads hung from a truss, beams through haze.
// A "look" says what the rig should do; heads glide towards it, so changes become transitions.

export type Program = 'static' | 'sweep' | 'mirror' | 'fan' | 'circle' | 'chase' | 'chaos' | 'follow'
export type PaletteId = 'amber' | 'ruby' | 'ice' | 'white' | 'violet'

export const PALETTES: Record<PaletteId, [number, number, number][]> = {
  amber: [
    [255, 168, 64],
    [255, 122, 40],
  ],
  ruby: [
    [235, 40, 62],
    [255, 104, 64],
  ],
  ice: [
    [150, 205, 255],
    [235, 248, 255],
  ],
  white: [
    [255, 244, 222],
    [214, 190, 140],
  ],
  violet: [
    [150, 84, 255],
    [255, 84, 196],
  ],
}

export type Look = {
  program: Program
  palette: PaletteId
  dim: number // 0 → 1
  speed: number // 0 → 1
  width?: number // beam width, 0 → 1
  strobe?: boolean
  aim?: { x: number; z: number } // floor point for 'follow'
}

type Head = { pan: number; tilt: number; c: [number, number, number]; dim: number; width: number }

const N = 6
const TRUSS_Y = 5.2
const TRUSS_Z = 4

export function makeRig() {
  const heads: Head[] = Array.from({ length: N }, () => ({ pan: 0, tilt: 0.4, c: [255, 240, 220], dim: 0, width: 0.5 }))
  const haze = Array.from({ length: 40 }, (_, i) => ({
    x: ((i * 0.618) % 1) * 2 - 1,
    y: ((i * 0.377) % 1) * 0.8,
    s: (i % 5) / 5,
  }))

  /** Moves the heads towards a look. `rate` is how quickly (higher is faster). */
  function step(look: Look, t: number, dt: number, rate = 6) {
    const k = 1 - Math.exp(-dt * rate)
    const sp = 0.3 + look.speed * 2.2
    const pal = PALETTES[look.palette]
    heads.forEach((h, i) => {
      const u = (i / (N - 1)) * 2 - 1
      const hx = u * 5
      let pan = 0
      let tilt = 0.55
      let dim = 1
      let col = pal[i % 2]
      switch (look.program) {
        case 'static':
          pan = u * 0.22
          tilt = 0.5
          break
        case 'sweep':
          pan = Math.sin(t * sp) * 0.7
          tilt = 0.62
          break
        case 'mirror':
          pan = Math.sin(t * sp) * 0.6 * Math.sign(u || 1)
          tilt = 0.6 + 0.15 * Math.sin(t * sp * 0.5)
          break
        case 'fan':
          pan = u * (0.15 + 0.55 * (0.5 + 0.5 * Math.sin(t * sp)))
          tilt = 0.55
          break
        case 'circle':
          pan = 0.32 * Math.cos(t * sp + i * 0.7)
          tilt = 0.55 + 0.22 * Math.sin(t * sp + i * 0.7)
          break
        case 'chase': {
          pan = u * 0.35
          tilt = 0.6
          const ph = (t * sp * 2) % N
          const d = Math.min(Math.abs(ph - i), N - Math.abs(ph - i))
          dim = Math.max(0.08, 1 - d * 0.7)
          break
        }
        case 'chaos': {
          pan = Math.sin(t * (0.9 + i * 0.41) + i * 2.1) * 0.9
          tilt = 0.4 + 0.35 * Math.sin(t * (1.3 + i * 0.29) + i)
          const all = Object.values(PALETTES).flat()
          col = all[(i * 3 + Math.floor(t * (0.8 + i * 0.3))) % all.length]
          dim = 0.45 + 0.55 * Math.abs(Math.sin(t * (2 + i * 1.7) + i))
          break
        }
        case 'follow': {
          const a = look.aim ?? { x: 0, z: -3 }
          const tx = a.x + u * 0.6 - hx
          const tz = a.z - TRUSS_Z
          pan = Math.atan2(tx, -tz)
          tilt = Math.atan2(Math.hypot(tx, tz), TRUSS_Y)
          break
        }
      }
      if (look.strobe) dim *= Math.sin(t * 38) > 0.55 ? 1 : 0
      h.pan += (pan - h.pan) * k
      h.tilt += (tilt - h.tilt) * k
      h.dim += (dim * look.dim - h.dim) * (look.strobe ? 1 : k)
      h.width += ((look.width ?? 0.5) - h.width) * k
      for (let j = 0; j < 3; j++) h.c[j] += (col[j] - h.c[j]) * k
    })
  }

  /** Draws the rig. Always on a dark stage, whatever the site's theme. */
  function draw(f: Frame, yaw = 0, opts: { truss?: boolean } = {}) {
    const { c, w, h, dpr, t } = f
    const proj: Proj = camera({ cx: w / 2, cy: h * 0.62, scale: Math.min(w, h * 1.5) / 14, yaw, pitch: 0.34, persp: 22 })
    // haze
    haze.forEach((p) => {
      const x = w / 2 + (((p.x + t * 0.01 * (0.5 + p.s) + 1) % 2) - 1) * w * 0.6
      const g = c.createRadialGradient(x, h * (0.15 + p.y), 0, x, h * (0.15 + p.y), 90 * dpr)
      g.addColorStop(0, 'rgba(240,237,229,0.025)')
      g.addColorStop(1, 'rgba(240,237,229,0)')
      c.fillStyle = g
      c.fillRect(x - 90 * dpr, h * (0.15 + p.y) - 90 * dpr, 180 * dpr, 180 * dpr)
    })
    // floor
    c.strokeStyle = 'rgba(240,237,229,0.06)'
    c.lineWidth = dpr
    c.beginPath()
    for (let x = -7; x <= 7; x += 1.4) {
      const a = proj([x, 0, 5])
      const b = proj([x, 0, -8])
      c.moveTo(a[0], a[1])
      c.lineTo(b[0], b[1])
    }
    for (let z = -8; z <= 5; z += 1.3) {
      const a = proj([-7, 0, z])
      const b = proj([7, 0, z])
      c.moveTo(a[0], a[1])
      c.lineTo(b[0], b[1])
    }
    c.stroke()
    // beams
    c.globalCompositeOperation = 'lighter'
    heads.forEach((hd, i) => {
      if (hd.dim < 0.01) return
      const u = (i / (N - 1)) * 2 - 1
      const o: V3 = [u * 5, TRUSS_Y - 0.35, TRUSS_Z]
      const dir: V3 = [Math.sin(hd.pan) * Math.sin(hd.tilt), -Math.cos(hd.tilt), -Math.cos(hd.pan) * Math.sin(hd.tilt)]
      const len = dir[1] < -0.15 ? Math.min(16, (TRUSS_Y - 0.35) / -dir[1]) : 16
      const e: V3 = [o[0] + dir[0] * len, o[1] + dir[1] * len, o[2] + dir[2] * len]
      const [ax, ay] = proj(o)
      const [bx, by, bz] = proj(e)
      const nx = -(by - ay)
      const ny = bx - ax
      const nl = Math.hypot(nx, ny) || 1
      const spread = (0.02 + hd.width * 0.06) * len * (Math.min(w, h * 1.5) / 14) * (22 / (22 + bz))
      const [r, g, b] = hd.c.map(Math.round)
      const grad = c.createLinearGradient(ax, ay, bx, by)
      grad.addColorStop(0, `rgba(${r},${g},${b},${0.75 * hd.dim})`)
      grad.addColorStop(0.6, `rgba(${r},${g},${b},${0.18 * hd.dim})`)
      grad.addColorStop(1, `rgba(${r},${g},${b},${0.04 * hd.dim})`)
      c.fillStyle = grad
      c.beginPath()
      c.moveTo(ax - (nx / nl) * 2 * dpr, ay - (ny / nl) * 2 * dpr)
      c.lineTo(bx - (nx / nl) * spread, by - (ny / nl) * spread)
      c.lineTo(bx + (nx / nl) * spread, by + (ny / nl) * spread)
      c.lineTo(ax + (nx / nl) * 2 * dpr, ay + (ny / nl) * 2 * dpr)
      c.fill()
      // where it lands
      if (dir[1] < -0.15) {
        const sg = c.createRadialGradient(bx, by, 0, bx, by, spread * 1.6)
        sg.addColorStop(0, `rgba(${r},${g},${b},${0.5 * hd.dim})`)
        sg.addColorStop(1, `rgba(${r},${g},${b},0)`)
        c.fillStyle = sg
        c.beginPath()
        c.ellipse(bx, by, spread * 1.6, spread * 0.6, 0, 0, Math.PI * 2)
        c.fill()
      }
      // the lens
      const lg = c.createRadialGradient(ax, ay, 0, ax, ay, 14 * dpr)
      lg.addColorStop(0, `rgba(${r},${g},${b},${0.9 * hd.dim})`)
      lg.addColorStop(1, `rgba(${r},${g},${b},0)`)
      c.fillStyle = lg
      c.fillRect(ax - 14 * dpr, ay - 14 * dpr, 28 * dpr, 28 * dpr)
    })
    c.globalCompositeOperation = 'source-over'
    // truss and heads
    if (opts.truss !== false) {
      c.strokeStyle = 'rgba(240,237,229,0.35)'
      c.lineWidth = dpr
      for (const dy of [0, 0.4]) {
        const a = proj([-6.2, TRUSS_Y + dy, TRUSS_Z])
        const b = proj([6.2, TRUSS_Y + dy, TRUSS_Z])
        c.beginPath()
        c.moveTo(a[0], a[1])
        c.lineTo(b[0], b[1])
        c.stroke()
      }
      for (let x = -6.2; x <= 6.2; x += 0.62) {
        const a = proj([x, TRUSS_Y, TRUSS_Z])
        const b = proj([x + 0.31, TRUSS_Y + 0.4, TRUSS_Z])
        c.beginPath()
        c.moveTo(a[0], a[1])
        c.lineTo(b[0], b[1])
        c.stroke()
      }
      heads.forEach((_, i) => {
        const u = (i / (N - 1)) * 2 - 1
        const [x, y] = proj([u * 5, TRUSS_Y - 0.15, TRUSS_Z])
        c.fillStyle = '#1d1c1a'
        c.strokeStyle = 'rgba(240,237,229,0.5)'
        c.fillRect(x - 6 * dpr, y - 4 * dpr, 12 * dpr, 9 * dpr)
        c.strokeRect(x - 6 * dpr, y - 4 * dpr, 12 * dpr, 9 * dpr)
      })
    }
  }

  return { heads, step, draw }
}
