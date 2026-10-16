import type { Frame, V3 } from './draw'
import { BRASS, font, fract, hash, INK, tag } from './kit'
import type { Heard } from './listen'

// One venue for the Production page, drawn in layers: the room, the stage, the sound system, the
// lighting rig, a projection mesh, the DJ booth, the infrastructure that links them, and the crowd.
// Each scene asks for a "look" (what's there, what's running, what's highlighted) and the venue
// glides towards it, so changes become transitions.

export type Part = 'stage' | 'sound' | 'light' | 'visuals' | 'dj' | 'infra' | 'custom'

export type VenueLook = {
  show: Partial<Record<Part, number>> // how present each part is, 0 → 1
  lit?: number // the show running: beams, image, sound
  focus?: Part[] | null // parts highlighted, the rest dimmed
  xray?: number // cables, devices and labels
  crowd?: number
  plan?: number // footprints, as on a drawing
  dims?: number // the room's measurements
  cases?: number // equipment in flight cases
  heat?: number // a coverage map, as when tuning
  test?: number // test patterns, as when integrating
  color?: readonly number[] // the lighting colour
}

type Pt = (x: number, y: number, z: number) => readonly [number, number, number]

const PARTS: Part[] = ['stage', 'sound', 'light', 'visuals', 'dj', 'infra', 'custom']
const KEYS = ['lit', 'xray', 'crowd', 'plan', 'dims', 'cases', 'heat', 'test'] as const

const W = 8 // half the room's width
const Z0 = -5 // the back of the room, behind the audience
const Z1 = 7.5 // the wall behind the stage
const HEADS = Array.from({ length: 6 }, (_, i) => -3.75 + i * 1.5)
const TRUSS_Z = 5.2
const TRUSS_Y = 4.9
const SPK = [-5.4, 5.4]
const FOH: V3 = [2, 0, -2.6]
const AMP: V3 = [-6.6, 0, 6]
const DISTRO: V3 = [-7.2, 0, 4.4]
const PROJ: V3 = [0, 3.2, -3.4]

type Cable = { kind: 'audio' | 'dmx' | 'net' | 'video' | 'power'; pts: V3[] }
const CABLES: Cable[] = [
  // the multicore from the front of house to the stage
  { kind: 'audio', pts: [FOH, [2, 0, 3.3], [-6.2, 0, 3.3], [-6.6, 0, 5.6]] },
  // amplifiers to the loudspeakers
  { kind: 'audio', pts: [AMP, [-5.4, 0, 3.6]] },
  { kind: 'audio', pts: [AMP, [-6.2, 0, 3.25], [5.4, 0, 3.25], [5.4, 0, 3.6]] },
  // the booth's output, down to the front of house
  {
    kind: 'audio',
    pts: [
      [0, 0.6, 4.4],
      [0, 0, 3.4],
      [1.9, 0, 3.4],
      [1.9, 0, -2.2],
    ],
  },
  // lighting data up the truss leg and along to every head
  {
    kind: 'dmx',
    pts: [
      [2.1, 0, -2.2],
      [2.1, 0, 3.35],
      [4.6, 0, 5.2],
      [4.6, TRUSS_Y, TRUSS_Z],
      [-3.75, TRUSS_Y, TRUSS_Z],
    ],
  },
  // network: control computers to the lighting node and the visual system
  {
    kind: 'net',
    pts: [
      [2.2, 0.9, -2.6],
      [2.2, 0, -2.2],
      [2.2, 0, 3.4],
      [4.4, 0, 5.0],
    ],
  },
  // video to the projector
  { kind: 'video', pts: [[1.7, 0.9, -2.6], [0, 0, -3.1], PROJ] },
  // power
  { kind: 'power', pts: [DISTRO, AMP] },
  { kind: 'power', pts: [DISTRO, [-4.6, 0, 5.2]] },
  { kind: 'power', pts: [DISTRO, [-7.6, 0, 4.4], [-7.6, 0, -2.6], [1.2, 0, -2.6]] },
]
const CABLE_RGB: Record<Cable['kind'], string> = {
  audio: '184,164,123',
  dmx: '232,98,84',
  net: '110,170,255',
  video: '186,140,255',
  power: '240,237,229',
}
export const CABLE_LEGEND: [string, string][] = [
  ['Audio', CABLE_RGB.audio],
  ['DMX', CABLE_RGB.dmx],
  ['Network', CABLE_RGB.net],
  ['Video', CABLE_RGB.video],
  ['Power', CABLE_RGB.power],
]

const CROWD = Array.from({ length: 70 }, (_, i) => ({
  x: -4.8 + fract(i * 0.618 + hash(i) * 0.3) * 9.6,
  z: -1.8 + fract(i * 0.381 + hash(i + 7) * 0.2) * 4.6,
  p: hash(i + 3),
}))

const CASES = ['Audio', 'Lighting', 'Visuals', 'DJ', 'Cabling', 'Truss']

export function makeVenue() {
  const cur: Required<Omit<VenueLook, 'show' | 'focus' | 'color'>> & { show: Record<Part, number>; color: number[] } = {
    show: { stage: 0, sound: 0, light: 0, visuals: 0, dj: 0, infra: 0, custom: 0 },
    lit: 0,
    xray: 0,
    crowd: 0,
    plan: 0,
    dims: 0,
    cases: 0,
    heat: 0,
    test: 0,
    color: [255, 190, 120],
  }
  const focusOf: Record<Part, number> = { stage: 1, sound: 1, light: 1, visuals: 1, dj: 1, infra: 1, custom: 1 }
  let flash = 0

  function step(look: VenueLook, dt: number, rate = 4) {
    const k = 1 - Math.exp(-dt * rate)
    for (const p of PARTS) {
      cur.show[p] += ((look.show[p] ?? 0) - cur.show[p]) * k
      focusOf[p] += ((look.focus && !look.focus.includes(p) ? 0.22 : 1) - focusOf[p]) * k
    }
    for (const key of KEYS) cur[key] += ((look[key] ?? 0) - cur[key]) * k
    const col = look.color ?? [255, 190, 120]
    for (let j = 0; j < 3; j++) cur.color[j] += (col[j] - cur.color[j]) * k
  }

  function draw(f: Frame, P: Pt, heard: Heard) {
    const { c, dpr, t, dt } = f
    if (heard.hit) flash = 1
    flash = Math.max(0, flash - dt * 4)
    const v = (p: Part) => cur.show[p] * focusOf[p]
    const seg = (pts: readonly V3[]) => {
      c.beginPath()
      pts.forEach((p, i) => {
        const [x, y] = P(p[0], p[1], p[2])
        if (i) c.lineTo(x, y)
        else c.moveTo(x, y)
      })
    }
    const poly = (pts: readonly V3[], fill: string, stroke?: string) => {
      seg(pts)
      c.closePath()
      c.fillStyle = fill
      c.fill()
      if (stroke) {
        c.strokeStyle = stroke
        c.stroke()
      }
    }
    /** A solid box: dark faces, light edges. */
    const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, a: number, edge = INK) => {
      if (a < 0.02) return
      const fill = `rgba(22,21,19,${Math.min(1, a * 1.2)})`
      const e = `${edge}${0.55 * a})`
      c.lineWidth = dpr
      poly(
        [
          [x0, y0, z0],
          [x1, y0, z0],
          [x1, y1, z0],
          [x0, y1, z0],
        ],
        fill,
        e,
      )
      poly(
        [
          [x0, y1, z0],
          [x1, y1, z0],
          [x1, y1, z1],
          [x0, y1, z1],
        ],
        fill,
        e,
      )
      const side = P(x1, y0, z0)[0] < P(x1, y0, z1)[0] ? x1 : x0
      poly(
        [
          [side, y0, z0],
          [side, y0, z1],
          [side, y1, z1],
          [side, y1, z0],
        ],
        fill,
        e,
      )
    }
    const label = (text: string, p: V3, a: number, col = INK, align: CanvasTextAlign = 'center') => {
      if (a < 0.05) return
      const [x, y] = P(p[0], p[1], p[2])
      tag(c, text, x, y, dpr, 0.85 * a, align, col)
    }

    // the room
    c.lineWidth = dpr
    c.strokeStyle = `${INK}0.06)`
    c.beginPath()
    for (let x = -W; x <= W; x += 1) {
      const a = P(x, 0, Z0)
      const b = P(x, 0, Z1)
      c.moveTo(a[0], a[1])
      c.lineTo(b[0], b[1])
    }
    for (let z = Z0; z <= Z1; z += 1) {
      const a = P(-W, 0, z)
      const b = P(W, 0, z)
      c.moveTo(a[0], a[1])
      c.lineTo(b[0], b[1])
    }
    c.stroke()
    c.strokeStyle = `${INK}0.16)`
    seg([
      [-W, 0, Z0],
      [-W, 0, Z1],
      [W, 0, Z1],
      [W, 0, Z0],
    ])
    c.stroke()
    seg([
      [-W, 6, Z1],
      [W, 6, Z1],
    ])
    c.stroke()
    seg([
      [-W, 0, Z1],
      [-W, 6, Z1],
    ])
    c.stroke()
    seg([
      [W, 0, Z1],
      [W, 6, Z1],
    ])
    c.stroke()

    // measurements
    if (cur.dims > 0.02) {
      c.strokeStyle = `${BRASS}${0.8 * cur.dims})`
      c.setLineDash([4 * dpr, 4 * dpr])
      seg([[-W, 6.4, Z1], [W, 6.4, Z1]])
      c.stroke()
      seg([[W, 0.02, -1], [W, 0.02, Z1]])
      c.stroke()
      seg([[W + 0.3, 0, Z1], [W + 0.3, 6, Z1]])
      c.stroke()
      c.setLineDash([])
      label('16 m', [0, 6.7, Z1], cur.dims, BRASS)
      label('12.5 m deep', [W - 0.3, 0.35, 2.5], cur.dims, BRASS, 'right')
      label('6 m', [W + 0.5, 3, Z1], cur.dims, BRASS, 'left')
      label('Audience?', [0, 0.2, 0.5], cur.dims * 0.8)
      label('Stage?', [0, 0.2, 5.2], cur.dims * 0.8)
      label('Power?', [DISTRO[0] + 0.4, 0.2, DISTRO[2]], cur.dims * 0.8)
      label('Rigging?', [0, 5.6, TRUSS_Z], cur.dims * 0.8)
    }

    // heat map of the coverage, as measured while tuning
    if (cur.heat > 0.02) {
      for (let x = -W + 0.5; x < W; x += 1)
        for (let z = Z0 + 0.5; z < 3.4; z += 1) {
          let e = 0
          for (const s of SPK) {
            const dx = x - s
            const dz = z - 3.6
            const d = Math.hypot(dx, dz)
            const off = Math.abs(Math.atan2(dx, -dz)) // angle off the speaker's axis
            e += Math.max(0, 1 - off / 1.4) / (0.6 + d * 0.22)
          }
          const val = Math.min(1, e * 0.42)
          c.fillStyle = `rgba(${Math.round(90 + 150 * val)},${Math.round(80 + 110 * val)},${Math.round(70 + 40 * val)},${0.35 * cur.heat * val})`
          seg([
            [x - 0.5, 0.01, z - 0.5],
            [x + 0.5, 0.01, z - 0.5],
            [x + 0.5, 0.01, z + 0.5],
            [x - 0.5, 0.01, z + 0.5],
          ])
          c.fill()
        }
      // the measurement microphone, moving between positions
      const k = Math.floor(t / 1.6) % 5
      const SPOTS: V3[] = [
        [-3, 0, 0],
        [3, 0, 0],
        [0, 0, -1.5],
        [-1.5, 0, 2],
        [1.5, 0, -3],
      ]
      const m = SPOTS[k]
      const [mx, my] = P(m[0], 1.5, m[2])
      const [gx, gy] = P(m[0], 0, m[2])
      c.strokeStyle = `${INK}${cur.heat})`
      c.beginPath()
      c.moveTo(gx, gy)
      c.lineTo(mx, my)
      c.stroke()
      c.fillStyle = `${INK}${cur.heat})`
      c.beginPath()
      c.arc(mx, my, 3 * dpr, 0, Math.PI * 2)
      c.fill()
      label('Measuring', [m[0], 1.85, m[2]], cur.heat, BRASS)
    }

    // plan footprints, dashed
    if (cur.plan > 0.02) {
      c.strokeStyle = `${BRASS}${0.75 * cur.plan})`
      c.setLineDash([5 * dpr, 4 * dpr])
      const rect = (x0: number, z0: number, x1: number, z1: number) => {
        seg([
          [x0, 0.02, z0],
          [x1, 0.02, z0],
          [x1, 0.02, z1],
          [x0, 0.02, z1],
          [x0, 0.02, z0],
        ])
        c.stroke()
      }
      rect(-4.2, 3.6, 4.2, 6.6)
      rect(-1.1, 4.4, 1.1, 5.0)
      for (const s of SPK) rect(s - 0.4, 3.3, s + 0.4, 3.9)
      rect(FOH[0] - 0.8, FOH[2] - 0.4, FOH[0] + 0.8, FOH[2] + 0.4)
      seg([
        [-4.6, 0.02, TRUSS_Z],
        [4.6, 0.02, TRUSS_Z],
      ])
      c.stroke()
      seg([
        [-2.6, 0.02, 6.4],
        [2.6, 0.02, 6.4],
      ])
      c.stroke()
      for (const s of SPK) {
        c.beginPath()
        for (let i = 0; i <= 20; i++) {
          const a = -0.75 + (i / 20) * 1.5 - Math.sign(s) * 0.25
          const [x, y] = P(s + Math.sin(a) * 6, 0.02, 3.6 - Math.cos(a) * 6)
          if (i) c.lineTo(x, y)
          else c.moveTo(x, y)
        }
        c.stroke()
      }
      c.setLineDash([])
      label('Stage', [0, 0.1, 6.2], cur.plan, BRASS)
      label('Booth', [0, 0.1, 4.2], cur.plan, BRASS)
      label('FOH', [FOH[0], 0.1, FOH[2] - 0.6], cur.plan, BRASS)
      label('Truss', [-3, 0.1, TRUSS_Z - 0.3], cur.plan, BRASS)
      label('Coverage', [-2.8, 0.1, -1.2], cur.plan, BRASS)
    }

    // the stage deck
    const stage = cur.show.stage * focusOf.stage
    box(-4.2, 0, 3.6, 4.2, 0.6, 6.6, stage)

    // the visuals: a mesh screen behind the booth, and the projector at the back
    const vis = v('visuals')
    if (vis > 0.02) {
      c.strokeStyle = `${INK}${0.3 * vis})`
      seg([
        [-2.6, 4.3, 6.4],
        [-2.6, 5.6, 6.4],
      ])
      c.stroke()
      seg([
        [2.6, 4.3, 6.4],
        [2.6, 5.6, 6.4],
      ])
      c.stroke()
      const glow = Math.max(cur.lit, cur.test)
      c.lineWidth = dpr
      for (const dir of [1, -1])
        for (let k = -24; k <= 24; k++)
          for (let y = 1.5; y < 4.3; y += 0.14) {
            const x0 = k * 0.22 + dir * (y - 2.9)
            const x1 = x0 + dir * 0.14
            if (Math.abs(x0) > 2.6 || Math.abs(x1) > 2.6) continue
            const mx = (x0 + x1) / 2
            const my = y + 0.07
            let img: number
            if (cur.test > cur.lit) img = fract(mx * 1.2) < 0.08 || fract(my * 1.2) < 0.08 ? 1 : 0.15
            else {
              const r = Math.hypot(mx, (my - 2.9) * 1.3)
              img = fract(r * 1.3 - t * 0.3 - heard.bass * 0.12) < 0.42 ? 1 : 0.1
            }
            const a = vis * (0.1 + 0.85 * glow * img)
            const p0 = P(x0, y, 6.4)
            const p1 = P(x1, y + 0.14, 6.4)
            c.strokeStyle = `rgba(240,240,250,${a})`
            c.beginPath()
            c.moveTo(p0[0], p0[1])
            c.lineTo(p1[0], p1[1])
            c.stroke()
          }
      // the projector, and its throw
      box(PROJ[0] - 0.25, PROJ[1] - 0.15, PROJ[2] - 0.2, PROJ[0] + 0.25, PROJ[1] + 0.15, PROJ[2] + 0.2, vis)
      c.strokeStyle = `${INK}${0.25 * vis})`
      seg([
        [PROJ[0], 0, PROJ[2]],
        [PROJ[0], PROJ[1] - 0.15, PROJ[2]],
      ])
      c.stroke()
      if (glow > 0.05) {
        c.globalCompositeOperation = 'lighter'
        const o = P(PROJ[0], PROJ[1], PROJ[2] + 0.2)
        const corners = [P(-2.6, 1.5, 6.4), P(2.6, 1.5, 6.4), P(2.6, 4.3, 6.4), P(-2.6, 4.3, 6.4)]
        const g = c.createLinearGradient(o[0], o[1], corners[0][0], corners[0][1])
        g.addColorStop(0, `rgba(230,230,245,${0.12 * vis * glow})`)
        g.addColorStop(1, `rgba(230,230,245,0)`)
        c.fillStyle = g
        c.beginPath()
        c.moveTo(o[0], o[1])
        c.lineTo(corners[0][0], corners[0][1])
        c.lineTo(corners[3][0], corners[3][1])
        c.lineTo(o[0], o[1])
        c.lineTo(corners[1][0], corners[1][1])
        c.lineTo(corners[2][0], corners[2][1])
        c.fill()
        c.globalCompositeOperation = 'source-over'
      }
    }

    // the DJ booth
    const dj = v('dj')
    box(-1.1, 0.6, 4.4, 1.1, 1.55, 5.0, dj)
    if (dj > 0.02) {
      for (const x of [-0.75, 0, 0.75]) {
        const w = x ? 0.32 : 0.36
        const p = [P(x - w / 2, 1.56, 4.5), P(x + w / 2, 1.56, 4.5), P(x + w / 2, 1.56, 4.85), P(x - w / 2, 1.56, 4.85)]
        c.fillStyle = `${BRASS}${dj * (0.25 + 0.5 * (x ? flash * cur.lit : cur.lit * 0.6))})`
        c.beginPath()
        p.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)))
        c.fill()
      }
    }

    // the sound system: subwoofers, poles and tops
    const snd = v('sound')
    for (const s of SPK) {
      box(s - 0.4, 0, 3.3, s + 0.4, 0.7, 3.9, snd)
      if (snd > 0.02) {
        c.strokeStyle = `${INK}${0.5 * snd})`
        seg([
          [s, 0.7, 3.6],
          [s, 2.0, 3.6],
        ])
        c.stroke()
      }
      box(s - 0.26, 2.0, 3.4, s + 0.26, 2.9, 3.8, snd)
    }
    // sound, travelling out over the audience
    const waves = snd * Math.max(cur.lit, cur.test * 0.6)
    if (waves > 0.02) {
      c.lineWidth = 1.3 * dpr
      for (const s of SPK)
        for (let k = 0; k < 4; k++) {
          const r = fract(t * 0.55 + k / 4) * 9
          const a = waves * (1 - r / 9) * (0.35 + 0.5 * heard.bass)
          c.strokeStyle = `${BRASS}${a})`
          c.beginPath()
          for (let i = 0; i <= 18; i++) {
            const ang = -0.75 + (i / 18) * 1.5 - Math.sign(s) * 0.25
            const [x, y] = P(s + Math.sin(ang) * r, 0.05, 3.6 - Math.cos(ang) * r)
            if (i) c.lineTo(x, y)
            else c.moveTo(x, y)
          }
          c.stroke()
        }
      c.lineWidth = dpr
    }

    // the truss and its heads
    const lt = v('light')
    if (lt > 0.02) {
      c.strokeStyle = `${INK}${0.5 * lt})`
      for (const x of [-4.6, 4.6]) {
        seg([
          [x, 0, TRUSS_Z],
          [x, TRUSS_Y + 0.3, TRUSS_Z],
        ])
        c.stroke()
      }
      seg([
        [-4.6, TRUSS_Y, TRUSS_Z],
        [4.6, TRUSS_Y, TRUSS_Z],
      ])
      c.stroke()
      seg([
        [-4.6, TRUSS_Y + 0.3, TRUSS_Z],
        [4.6, TRUSS_Y + 0.3, TRUSS_Z],
      ])
      c.stroke()
      c.strokeStyle = `${INK}${0.25 * lt})`
      c.beginPath()
      for (let x = -4.6; x < 4.6; x += 0.46) {
        const a = P(x, TRUSS_Y, TRUSS_Z)
        const b = P(x + 0.23, TRUSS_Y + 0.3, TRUSS_Z)
        const d = P(x + 0.46, TRUSS_Y, TRUSS_Z)
        c.moveTo(a[0], a[1])
        c.lineTo(b[0], b[1])
        c.lineTo(d[0], d[1])
      }
      c.stroke()
      // beams
      const run = Math.max(cur.lit, cur.test * 0.5)
      if (run > 0.02) {
        c.globalCompositeOperation = 'lighter'
        const [r, g, b] = cur.test > cur.lit ? [235, 235, 240] : cur.color.map(Math.round)
        HEADS.forEach((hx, i) => {
          const sweep = cur.test > cur.lit ? 0 : Math.sin(t * 0.7 + i * 0.9) * 2.4
          const reach = cur.test > cur.lit ? 0 : 3.5 + Math.sin(t * 0.5 + i) * 1.5
          const o = P(hx, TRUSS_Y - 0.25, TRUSS_Z)
          const e = P(hx + sweep, 0, TRUSS_Z - reach)
          const nx = -(e[1] - o[1])
          const ny = e[0] - o[0]
          const nl = Math.hypot(nx, ny) || 1
          const sp = 16 * dpr
          const a = lt * run * (0.35 + 0.45 * (cur.test > cur.lit ? 0.5 : flash))
          const grad = c.createLinearGradient(o[0], o[1], e[0], e[1])
          grad.addColorStop(0, `rgba(${r},${g},${b},${a})`)
          grad.addColorStop(1, `rgba(${r},${g},${b},${a * 0.15})`)
          c.fillStyle = grad
          c.beginPath()
          c.moveTo(o[0] - (nx / nl) * 1.5 * dpr, o[1] - (ny / nl) * 1.5 * dpr)
          c.lineTo(e[0] - (nx / nl) * sp, e[1] - (ny / nl) * sp)
          c.lineTo(e[0] + (nx / nl) * sp, e[1] + (ny / nl) * sp)
          c.lineTo(o[0] + (nx / nl) * 1.5 * dpr, o[1] + (ny / nl) * 1.5 * dpr)
          c.fill()
        })
        c.globalCompositeOperation = 'source-over'
      }
      HEADS.forEach((hx) => box(hx - 0.16, TRUSS_Y - 0.4, TRUSS_Z - 0.16, hx + 0.16, TRUSS_Y - 0.05, TRUSS_Z + 0.16, lt))
    }

    // infrastructure: front of house, amplifiers, power, and every cable between them
    const inf = Math.max(v('infra'), cur.xray)
    if (inf > 0.02) {
      box(FOH[0] - 0.8, 0, FOH[2] - 0.4, FOH[0] + 0.8, 0.9, FOH[2] + 0.4, inf)
      box(AMP[0] - 0.3, 0, AMP[2] - 0.3, AMP[0] + 0.3, 1.4, AMP[2] + 0.3, inf)
      box(DISTRO[0] - 0.25, 0, DISTRO[2] - 0.25, DISTRO[0] + 0.25, 0.8, DISTRO[2] + 0.25, inf)
      c.lineWidth = 1.4 * dpr
      CABLES.forEach((cb, k) => {
        c.strokeStyle = `rgba(${CABLE_RGB[cb.kind]},${0.7 * inf})`
        c.setLineDash(cb.kind === 'power' ? [2 * dpr, 3 * dpr] : [])
        seg(cb.pts)
        c.stroke()
        c.setLineDash([])
        if (cb.kind === 'power') return
        // data moving along it
        const lens = cb.pts.slice(1).map((p, i) => Math.hypot(p[0] - cb.pts[i][0], p[1] - cb.pts[i][1], p[2] - cb.pts[i][2]))
        const total = lens.reduce((a, b) => a + b, 0)
        for (let j = 0; j < 3; j++) {
          let d = fract(t * 0.25 + j / 3 + k * 0.11) * total
          let i = 0
          while (i < lens.length - 1 && d > lens[i]) d -= lens[i++]
          const u = d / lens[i]
          const a = cb.pts[i]
          const b = cb.pts[i + 1]
          const [x, y] = P(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u)
          c.fillStyle = `rgba(${CABLE_RGB[cb.kind]},${inf})`
          c.fillRect(x - 2 * dpr, y - 2 * dpr, 4 * dpr, 4 * dpr)
        }
      })
      c.lineWidth = dpr
    }

    // custom tools: information moving between systems, not just cables
    const cus = v('custom')
    if (cus > 0.02) {
      const arc = (a: V3, b: V3, lift: number, k: number) => {
        c.strokeStyle = `${BRASS}${0.7 * cus})`
        c.setLineDash([3 * dpr, 4 * dpr])
        c.beginPath()
        for (let i = 0; i <= 24; i++) {
          const u = i / 24
          const [x, y] = P(
            a[0] + (b[0] - a[0]) * u,
            a[1] + (b[1] - a[1]) * u + Math.sin(u * Math.PI) * lift,
            a[2] + (b[2] - a[2]) * u,
          )
          if (i) c.lineTo(x, y)
          else c.moveTo(x, y)
        }
        c.stroke()
        c.setLineDash([])
        const u = fract(t * 0.4 + k * 0.33)
        const [x, y] = P(
          a[0] + (b[0] - a[0]) * u,
          a[1] + (b[1] - a[1]) * u + Math.sin(u * Math.PI) * lift,
          a[2] + (b[2] - a[2]) * u,
        )
        c.fillStyle = `${INK}${cus})`
        c.beginPath()
        c.arc(x, y, 3 * dpr, 0, Math.PI * 2)
        c.fill()
      }
      arc([0, 1.6, 4.7], [-2.25, TRUSS_Y - 0.3, TRUSS_Z], 1.5, 0)
      arc([0, 1.6, 4.7], [1.5, 3.2, 6.4], 1.2, 1)
      arc([FOH[0], 1, FOH[2]], [0, 1.6, 4.7], 2.2, 2)
      label('Beat → lighting', [-1.5, 4.0, 4.9], cus, BRASS)
      label('Audio → visuals', [1.8, 3.6, 5.8], cus, BRASS)
      label('One control surface', [FOH[0], 2.4, 1], cus, BRASS)
    }

    // the crowd
    if (cur.crowd > 0.02) {
      CROWD.forEach((p) => {
        const bob = cur.lit * (flash * 0.08 + 0.03 * Math.sin(t * 6 + p.p * 9))
        const [x, y, z] = P(p.x, 1.55 + bob, p.z)
        const [, y0] = P(p.x, 1.1 + bob, p.z)
        const s = Math.max(2, (8 - z * 0.15) * dpr * 0.6)
        c.fillStyle = `rgba(10,10,9,${cur.crowd})`
        c.strokeStyle = `${INK}${0.22 * cur.crowd})`
        c.beginPath()
        c.ellipse(x, y0 + s * 0.8, s * 1.6, s, 0, Math.PI, 0)
        c.fill()
        c.stroke()
        c.beginPath()
        c.arc(x, y, s, 0, Math.PI * 2)
        c.fill()
        c.stroke()
      })
    }

    // flight cases, on the floor of the empty room
    if (cur.cases > 0.02) {
      // far row first, so the near row sits in front; labels on top of everything
      const at = CASES.map((name, i) => ({ name, x: -3.6 + (i % 3) * 2.5, z: Math.floor(i / 3) * 2.3 }))
      for (const k of [...at].sort((a, b) => b.z - a.z)) box(k.x, 0, k.z, k.x + 1.4, 1.1, k.z + 1.1, cur.cases, BRASS)
      for (const k of at) label(k.name, [k.x + 0.7, 1.45, k.z + 0.55], cur.cases, BRASS)
    }

    // labels for the whole system
    if (cur.xray > 0.05) {
      const a = cur.xray
      HEADS.forEach((hx, i) =>
        label(`U1 · ${String(1 + i * 16).padStart(3, '0')}`, [hx, TRUSS_Y + 0.65, TRUSS_Z], a, 'rgba(232,98,84,'),
      )
      label('FOH · audio, lighting & visual control', [FOH[0], 1.3, FOH[2]], a)
      label('Amplifiers', [AMP[0], 1.75, AMP[2]], a)
      label('Power distribution', [DISTRO[0], 1.15, DISTRO[2]], a)
      label('Projector', [PROJ[0] - 0.4, PROJ[1] - 0.6, PROJ[2]], a, INK, 'right')
      label('Art-Net node', [4.4, 0.45, 5.0], a, 'rgba(110,170,255,')
      label('DJ booth → FOH', [0, 2.0, 4.7], a)
      for (const s of SPK) label(s < 0 ? 'Left' : 'Right', [s, 3.25, 3.6], a, BRASS)
    }
  }

  return { step, draw }
}

/** The legend for the cable colours, drawn in a corner. */
export function cableLegend(c: CanvasRenderingContext2D, x: number, y: number, dpr: number, a: number) {
  if (a < 0.05) return
  c.font = font(10, dpr)
  CABLE_LEGEND.forEach(([name, rgb], i) => {
    const yy = y + i * 14 * dpr
    c.strokeStyle = `rgba(${rgb},${a})`
    c.setLineDash(name === 'Power' ? [2 * dpr, 3 * dpr] : [])
    c.lineWidth = 2 * dpr
    c.beginPath()
    c.moveTo(x, yy - 3 * dpr)
    c.lineTo(x + 14 * dpr, yy - 3 * dpr)
    c.stroke()
    c.setLineDash([])
    c.lineWidth = dpr
    tag(c, name, x + 20 * dpr, yy, dpr, 0.7 * a)
  })
}
