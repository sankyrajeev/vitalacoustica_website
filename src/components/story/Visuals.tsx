import { VA_MARK_PATH } from '../../brand/vaMarkPath'
import { glow, label, P, rgba, smooth, type Draw } from '../scenes/draw'
import { Stage } from '../scenes/Stage'

// Small interactive scenes for the Our Story chapters, drawn on canvas in the brand's brass and ivory.
// Each runs only while on screen, and holds still for visitors who prefer reduced motion.

/* ─────────────── 01 Two friends: two lights in orbit, joined by a wave ─────────────── */

const makeFriends = (): Draw => {
  const trails: [number, number][][] = [[], []]
  return ({ c, w, h, t, dpr, pointer }) => {
    const cx = w / 2
    const cy = h / 2
    const R = Math.min(w, h * 1.6) * 0.32
    const speed = pointer.active ? 0.9 : 0.45
    const a = t * speed
    const pts = [0, Math.PI].map((o) => {
      const ang = a + o
      return { x: cx + Math.cos(ang) * R, y: cy + Math.sin(ang) * R * 0.38, z: Math.sin(ang) }
    })
    // the orbit
    c.strokeStyle = rgba(P.brass, 0.18)
    c.lineWidth = dpr
    c.beginPath()
    c.ellipse(cx, cy, R, R * 0.38, 0, 0, Math.PI * 2)
    c.stroke()
    // trails
    pts.forEach((p, i) => {
      trails[i].push([p.x, p.y])
      if (trails[i].length > 46) trails[i].shift()
      trails[i].forEach(([x, y], k) => {
        const f = k / trails[i].length
        c.fillStyle = rgba(i ? P.ink : P.brass, f * 0.35)
        c.beginPath()
        c.arc(x, y, (1 + f * 2) * dpr, 0, Math.PI * 2)
        c.fill()
      })
    })
    // the music between them
    const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * (124 / 60) * 0.5)), 8)
    c.lineWidth = 1.4 * dpr
    for (let k = 0; k < 3; k++) {
      c.strokeStyle = rgba(k ? P.brass : P.ink, 0.5 - k * 0.12)
      c.beginPath()
      for (let i = 0; i <= 80; i++) {
        const u = i / 80
        const x = pts[0].x + (pts[1].x - pts[0].x) * u
        const y0 = pts[0].y + (pts[1].y - pts[0].y) * u
        const env = Math.sin(u * Math.PI)
        const y = y0 + env * h * (0.03 + beat * 0.07) * Math.sin(u * (10 + k * 4) - t * 6 + k)
        if (i) c.lineTo(x, y)
        else c.moveTo(x, y)
      }
      c.stroke()
    }
    // the two lights, nearer one larger
    pts
      .map((p, i) => ({ ...p, i }))
      .sort((p, q) => p.z - q.z)
      .forEach((p) => {
        const s = 1 + p.z * 0.25
        glow(c, p.x, p.y, 70 * dpr * s * (1 + beat * 0.2), p.i ? P.ink : P.brass, 0.45)
        c.fillStyle = rgba(p.i ? P.ink : P.brass, 1)
        c.beginPath()
        c.arc(p.x, p.y, 5 * dpr * s, 0, Math.PI * 2)
        c.fill()
        label(c, p.i ? 'Harsh' : 'Sankarsh', p.x, p.y - 22 * dpr * s, dpr, 0.55 + p.z * 0.2)
      })
  }
}

/* ─────────────── 02 What was missing: the mix as it was, and as it should feel ─────────────── */

const makeMix = (): Draw => {
  let split = 0.5
  return ({ c, w, h, t, dpr, pointer }) => {
    const target = pointer.active ? pointer.x : 0.5 + 0.28 * Math.sin(t * 0.5)
    split += (target - split) * 0.12
    const n = 44
    const gap = w / n
    const base = h * 0.78
    const sx = split * w
    for (let i = 0; i < n; i++) {
      const x = i * gap + gap * 0.2
      const u = i / n
      const shape = 0.35 + 0.65 * Math.exp(-Math.pow((u - 0.2) / 0.22, 2)) + 0.35 * Math.exp(-Math.pow((u - 0.65) / 0.18, 2))
      const live = 0.55 + 0.45 * Math.abs(Math.sin(t * (2 + (i % 5) * 0.7) + i))
      const full = shape * live * h * 0.6
      if (x + gap * 0.6 < sx) {
        // before: thin, flat, some bands missing
        const hh = i % 6 === 2 || i % 7 === 4 ? 2 * dpr : full * 0.32
        c.fillStyle = rgba(P.ink, 0.18)
        c.fillRect(x, base - hh, gap * 0.6, hh)
      } else {
        const g = c.createLinearGradient(0, base - full, 0, base)
        g.addColorStop(0, rgba(P.ink, 0.95))
        g.addColorStop(0.35, rgba(P.brass, 0.9))
        g.addColorStop(1, rgba(P.brass, 0.25))
        c.fillStyle = g
        c.fillRect(x, base - full, gap * 0.6, full)
        // reflection
        c.fillStyle = rgba(P.brass, 0.08)
        c.fillRect(x, base + 4 * dpr, gap * 0.6, full * 0.25)
      }
    }
    // the divider
    c.strokeStyle = rgba(P.ink, 0.6)
    c.lineWidth = dpr
    c.beginPath()
    c.moveTo(sx, h * 0.08)
    c.lineTo(sx, h * 0.92)
    c.stroke()
    c.fillStyle = rgba(P.ink, 0.95)
    c.beginPath()
    c.arc(sx, h * 0.5, 9 * dpr, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = '#111'
    c.font = `${11 * dpr}px Manrope, sans-serif`
    c.textAlign = 'center'
    c.fillText('‹ ›', sx, h * 0.5 + 4 * dpr)
    label(c, 'How it often sounded', 8 * dpr, h * 0.97, dpr, 0.45, 'left')
    label(c, 'How it should feel', w - 8 * dpr, h * 0.97, dpr, 0.75, 'right')
  }
}

/* ─────────────── 03 The question: particles that form a question mark, then our mark ─────────────── */

function sample(drawShape: (c: CanvasRenderingContext2D, s: number) => void, n: number): [number, number][] {
  const s = 220
  const off = document.createElement('canvas')
  off.width = off.height = s
  const c = off.getContext('2d', { willReadFrequently: true })!
  c.fillStyle = '#fff'
  drawShape(c, s)
  const data = c.getImageData(0, 0, s, s).data
  const pts: [number, number][] = []
  for (let y = 0; y < s; y += 2)
    for (let x = 0; x < s; x += 2) if (data[(y * s + x) * 4 + 3] > 128) pts.push([x / s - 0.5, y / s - 0.5])
  return Array.from({ length: n }, (_, i) => pts[Math.floor((i * 7919) % pts.length)] ?? [0, 0])
}

const makeQuestion = (): Draw => {
  const N = 1500
  const q = sample((c, s) => {
    c.font = `${s * 0.95}px "Instrument Serif", Georgia, serif`
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText('?', s / 2, s / 2)
  }, N)
  const va = sample((c, s) => {
    const k = (s * 0.9) / 1485
    c.translate(s * 0.05, s / 2 - (806 * k) / 2)
    c.scale(k, k)
    c.fill(new Path2D(VA_MARK_PATH), 'evenodd')
  }, N)
  const p = Array.from({ length: N }, () => ({ x: -1, y: -1, s: Math.random() }))
  return ({ c, w, h, t, dpr }) => {
    if (p[0].x < 0) p.forEach((d) => Object.assign(d, { x: Math.random() * w, y: Math.random() * h }))
    const S = Math.min(w * 0.95, h * 1.3)
    // a question, held; it becomes our mark, held; then scatters and starts again
    const cycle = t % 12
    const morph = smooth(4, 5.5, cycle)
    const gather = smooth(0.2, 2, cycle) * (1 - smooth(10, 11.5, cycle))
    p.forEach((d, i) => {
      const tx = w / 2 + (q[i][0] * (1 - morph) + va[i][0] * morph) * S
      const ty = h / 2 + (q[i][1] * (1 - morph) + va[i][1] * morph) * S
      const wx = w * ((d.s * 7.31 + i * 0.618) % 1)
      const wy = h * ((d.s * 3.17 + i * 0.382 + Math.sin(t * 0.2 + i) * 0.03 + 1) % 1)
      const x = wx + (tx - wx) * gather + Math.sin(t * 1.3 + i) * 1.5 * dpr
      const y = wy + (ty - wy) * gather + Math.cos(t * 1.1 + i) * 1.5 * dpr
      d.x += (x - d.x) * 0.1
      d.y += (y - d.y) * 0.1
      c.fillStyle = rgba(i % 9 ? P.brass : P.ink, 0.3 + 0.55 * gather * (0.7 + 0.3 * Math.sin(t * 2 + i)))
      c.fillRect(d.x, d.y, 2 * dpr, 2 * dpr)
    })
  }
}

/* ─────────────── 04 A feeling: a heartbeat that becomes music ─────────────── */

function ecg(u: number) {
  const x = u - Math.floor(u)
  if (x < 0.1) return 0.08 * Math.sin((x / 0.1) * Math.PI)
  if (x < 0.16) return -0.12 * Math.sin(((x - 0.1) / 0.06) * Math.PI)
  if (x < 0.22) return Math.sin(((x - 0.16) / 0.06) * Math.PI)
  if (x < 0.28) return -0.3 * Math.sin(((x - 0.22) / 0.06) * Math.PI)
  if (x > 0.42 && x < 0.58) return 0.18 * Math.sin(((x - 0.42) / 0.16) * Math.PI)
  return 0
}

const makeHeart = (): Draw => {
  let rate = 1
  return ({ c, w, h, t, dpr, pointer }) => {
    rate += ((pointer.active ? 1.8 : 1) - rate) * 0.05
    const mid = h * 0.5
    const amp = h * 0.28
    c.lineCap = 'round'
    for (let pass = 0; pass < 2; pass++) {
      c.lineWidth = (pass ? 1.6 : 6) * dpr
      c.beginPath()
      for (let i = 0; i <= 240; i++) {
        const u = i / 240
        const x = u * w
        const blend = smooth(0.35, 0.85, u)
        const heart = ecg(u * 3 - t * 0.9 * rate)
        const music =
          (Math.sin(u * 40 - t * 7 * rate) * 0.5 + Math.sin(u * 13 + t * 2) * 0.35) *
          (0.4 + 0.6 * Math.abs(Math.sin(u * 6 - t * rate)))
        const y = mid - amp * (heart * (1 - blend) + music * blend * 0.7)
        if (i) c.lineTo(x, y)
        else c.moveTo(x, y)
      }
      const g = c.createLinearGradient(0, 0, w, 0)
      g.addColorStop(0, rgba(P.ink, pass ? 0.9 : 0.08))
      g.addColorStop(0.5, rgba(P.brass, pass ? 0.95 : 0.12))
      g.addColorStop(1, rgba(P.brass, pass ? 0.6 : 0.06))
      c.strokeStyle = g
      c.stroke()
    }
    const bpm = Math.round(72 * rate)
    label(c, `♥ ${bpm} bpm`, 6 * dpr, h * 0.95, dpr, 0.5, 'left')
    label(c, 'the beat of the room', w - 6 * dpr, h * 0.95, dpr, 0.5, 'right')
  }
}

/* ─────────────── 06 Curiosity: an exploded loudspeaker in 3D ─────────────── */

type V3 = [number, number, number]

const makeSpeaker = (): Draw => {
  let yaw = -0.6
  let spin = 0.25
  const ring = (r: number, z: number, y: number, n = 40): V3[] =>
    Array.from({ length: n + 1 }, (_, i) => [Math.cos((i / n) * Math.PI * 2) * r, y + Math.sin((i / n) * Math.PI * 2) * r, z])
  const rect = (w: number, h: number, z: number, y = 0): V3[] => [
    [-w, y - h, z],
    [w, y - h, z],
    [w, y + h, z],
    [-w, y + h, z],
    [-w, y - h, z],
  ]
  return ({ c, w, h, t, dpr, pointer, progress, dt }) => {
    if (pointer.down) spin = pointer.dx * 40
    else spin += (0.25 - spin) * 0.02
    yaw += spin * dt
    const e = smooth(0.25, 0.55, progress) // how far it's pulled apart
    const pitch = 0.32
    const S = Math.min(w, h) * 0.34
    const proj = ([x, y, z]: V3) => {
      const x1 = x * Math.cos(yaw) + z * Math.sin(yaw)
      const z1 = -x * Math.sin(yaw) + z * Math.cos(yaw)
      const y1 = y * Math.cos(pitch) - z1 * Math.sin(pitch)
      const z2 = y * Math.sin(pitch) + z1 * Math.cos(pitch)
      const f = 3.4 / (3.4 - z2)
      return [w / 2 + x1 * S * f, h / 2 - y1 * S * f, z2] as const
    }
    const line = (pts: V3[], a: number, col: readonly number[] = P.brass) => {
      c.strokeStyle = rgba(col, a)
      c.beginPath()
      pts.forEach((p, i) => {
        const [x, y] = proj(p)
        if (i) c.lineTo(x, y)
        else c.moveTo(x, y)
      })
      c.stroke()
    }
    c.lineWidth = dpr
    const front = 0.45
    // cabinet: back, sides, joins
    const back = rect(0.55, 0.85, -0.45 - e * 0.5)
    line(back, 0.35)
    const box = rect(0.55, 0.85, front)
    line(box, 0.5)
    for (const [x, y] of [
      [-0.55, -0.85],
      [0.55, -0.85],
      [0.55, 0.85],
      [-0.55, 0.85],
    ] as const)
      line(
        [
          [x, y, -0.45 - e * 0.5],
          [x, y, front],
        ],
        0.25,
      )
    // baffle and driver come forward
    const bz = front + e * 0.35
    line(rect(0.55, 0.85, bz), 0.6, P.ink)
    const wz = bz + e * 0.45
    const throb = 0.02 * Math.max(0, Math.sin(t * 13))
    for (let k = 0; k < 6; k++)
      line(ring(0.42 - k * 0.06, wz - k * 0.05 * (1 + e) + throb * (6 - k), -0.32), 0.7 - k * 0.08, k ? P.brass : P.ink)
    line(ring(0.1, wz - 0.32 - e * 0.25, -0.32, 24), 0.8, P.ink) // magnet
    // the horn on top
    const hz = bz + e * 0.3
    line(rect(0.32, 0.16, hz, 0.52), 0.8, P.ink)
    line(rect(0.06, 0.04, hz - 0.25 - e * 0.15, 0.52), 0.7)
    for (const [x, y] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const)
      line(
        [
          [x * 0.32, 0.52 + y * 0.16, hz],
          [x * 0.06, 0.52 + y * 0.04, hz - 0.25 - e * 0.15],
        ],
        0.4,
      )
    // labels once it's apart
    const la = smooth(0.4, 0.55, progress) * 0.8
    if (la > 0.02) {
      const tag = (p: V3, text: string, dx: number) => {
        const [x, y] = proj(p)
        c.strokeStyle = rgba(P.ink, la * 0.5)
        c.beginPath()
        c.moveTo(x, y)
        c.lineTo(x + dx * dpr, y)
        c.stroke()
        label(c, text, x + dx * dpr + (dx > 0 ? 6 : -6) * dpr, y + 4 * dpr, dpr, la, dx > 0 ? 'left' : 'right')
      }
      tag([0.42, -0.32, wz], 'Driver', 60)
      tag([-0.32, 0.52, hz], 'Horn', -60)
      tag([0.55, -0.85, -0.45 - e * 0.5], 'Cabinet', 60)
    }
    label(c, 'Drag to turn it', w / 2, h * 0.97, dpr, 0.4)
  }
}

/* ─────────────── 07 Purpose: beams that go where you point ─────────────── */

const makeBeams = (): Draw => {
  const aims = [0, 0, 0, 0, 0].map(() => ({ x: 0.5, y: 0.2 }))
  const haze = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() }))
  return ({ c, w, h, t, dpr, pointer }) => {
    // haze
    haze.forEach((p) => {
      p.x = (p.x + 0.0004 * (0.5 + p.s)) % 1
      glow(c, p.x * w, p.y * h, 60 * dpr * (0.5 + p.s), P.ink, 0.025)
    })
    c.globalCompositeOperation = P.add
    aims.forEach((a, i) => {
      const fx = (0.16 + i * 0.17) * w
      const fy = h * 0.96
      const tx = pointer.active ? pointer.x + (i - 2) * 0.04 : 0.5 + Math.sin(t * 0.7 + i * 1.1) * 0.4
      const ty = pointer.active ? pointer.y : 0.15 + 0.1 * Math.sin(t * 0.9 + i)
      a.x += (tx - a.x) * 0.06
      a.y += (ty - a.y) * 0.06
      const ang = Math.atan2(a.x * w - fx, fy - a.y * h)
      const len = h * 1.4
      const ex = fx + Math.sin(ang) * len
      const ey = fy - Math.cos(ang) * len
      const sp = 0.035
      const g = c.createLinearGradient(fx, fy, ex, ey)
      g.addColorStop(0, rgba(i % 2 ? P.ink : P.brass, 0.55))
      g.addColorStop(0.7, rgba(P.brass, 0.08))
      g.addColorStop(1, rgba(P.brass, 0))
      c.fillStyle = g
      c.beginPath()
      c.moveTo(fx - 3 * dpr, fy)
      c.lineTo(fx + Math.sin(ang - sp) * len, fy - Math.cos(ang - sp) * len)
      c.lineTo(fx + Math.sin(ang + sp) * len, fy - Math.cos(ang + sp) * len)
      c.lineTo(fx + 3 * dpr, fy)
      c.fill()
      glow(c, fx, fy, 22 * dpr, P.ink, 0.7)
    })
    c.globalCompositeOperation = 'source-over'
    // the fixtures
    aims.forEach((_, i) => {
      c.fillStyle = '#1b1a18'
      c.fillRect((0.16 + i * 0.17) * w - 12 * dpr, h * 0.96, 24 * dpr, 10 * dpr)
    })
  }
}

/* ─────────────── 08 After the last track: the lights go off, the crowd heads home ─────────────── */

const makeCrowd = (): Draw => {
  const people = Array.from({ length: 220 }, (_, i) => ({
    x: 0.08 + Math.random() * 0.84,
    y: 0.6 + Math.pow(Math.random(), 0.7) * 0.36,
    leave: 0.38 + Math.random() * 0.4,
    dir: Math.random() < 0.5 ? -1 : 1,
    ph: i,
  }))
  return ({ c, w, h, t, dpr, progress }) => {
    const lights = 9
    for (let i = 0; i < lights; i++) {
      const off = smooth(0.4 + i * 0.035, 0.44 + i * 0.035, progress)
      const x = w * (0.12 + (i / (lights - 1)) * 0.76)
      const flick = 0.85 + 0.15 * Math.sin(t * 9 + i * 3)
      if (off < 1) {
        glow(c, x, h * 0.1, 90 * dpr, P.brass, 0.35 * (1 - off) * flick)
        c.fillStyle = rgba(P.ink, (1 - off) * 0.9)
      } else c.fillStyle = rgba(P.ink, 0.12)
      c.beginPath()
      c.arc(x, h * 0.1, 4 * dpr, 0, Math.PI * 2)
      c.fill()
    }
    const bounce = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * (124 / 60) * 0.5)), 4)
    people.forEach((p) => {
      const gone = smooth(p.leave, p.leave + 0.18, progress)
      const x = (p.x + p.dir * gone * 0.6) * w
      const y = (p.y - bounce * 0.012 * (1 - gone) * Math.sin(p.ph)) * h
      c.fillStyle = rgba(p.ph % 7 ? P.brass : P.ink, (0.55 + 0.3 * Math.sin(p.ph)) * (1 - gone))
      c.beginPath()
      c.arc(x, y, (1.6 + (p.y - 0.6) * 4) * dpr, 0, Math.PI * 2)
      c.fill()
    })
  }
}

export const StoryFriends = () => <Stage make={makeFriends} className="story-scene--side" hint="Two friends, one love of music" />
export const StoryMix = () => <Stage make={makeMix} className="story-scene--side" hint="Drag the line: before and after" />
export const StoryQuestion = () => <Stage make={makeQuestion} className="story-scene--back" />
export const StoryHeart = () => (
  <Stage make={makeHeart} className="story-scene--side story-scene--wide" hint="Point here and the room speeds up" />
)
export const StorySpeaker = () => <Stage make={makeSpeaker} className="story-scene--side" />
export const StoryBeams = () => <Stage make={makeBeams} className="story-scene--side" hint="The beams follow you" />
export const StoryCrowd = () => <Stage make={makeCrowd} className="story-scene--back" />
