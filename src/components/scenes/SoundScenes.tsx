import { useEffect, useMemo, useRef, useState } from 'react'
import { glow, label, P, rgba, smooth, type Draw } from './draw'
import { Stage } from './Stage'

// Interactive scenes for the Sound service page. They're illustrations built on simple
// physics (distance, directivity, phase), there to show the ideas, not to replace a prediction.

const dB = (x: number) => 20 * Math.log10(Math.max(1e-6, x))

/* ─────────────── A field of sound you can steer (page header) ─────────────── */

const makeWaves = (): Draw => {
  let sx = 0.5
  let sz = 0.4
  return ({ c, w, h, t, dpr, pointer }) => {
    const tx = pointer.active ? pointer.x : 0.5 + 0.28 * Math.sin(t * 0.27)
    const tz = pointer.active ? 1 - pointer.y : 0.45 + 0.22 * Math.cos(t * 0.21)
    sx += (tx - sx) * 0.05
    sz += (tz - sz) * 0.05
    const srcX = (sx - 0.5) * 3
    const srcZ = 0.9 + sz * 2.6
    const f = w * 0.42
    const horizon = h * 0.3
    const proj = (x: number, y: number, z: number) => [w / 2 + (x / z) * f, horizon + ((0.85 - y) / z) * f] as const
    const cols = 54
    const rows = 30
    const height = (x: number, z: number) => {
      const r = Math.hypot(x - srcX, (z - srcZ) * 1.2)
      return (0.22 * Math.sin(r * 9 - t * 4)) / (1 + r * 1.8)
    }
    c.lineWidth = dpr
    for (let j = rows - 1; j >= 0; j--) {
      const z = 0.55 + (j / (rows - 1)) * 3.4
      c.strokeStyle = rgba(j % 5 ? P.brass : P.ink, (1 - j / rows) * 0.75 + 0.05)
      c.beginPath()
      for (let i = 0; i <= cols; i++) {
        const x = -2.2 + (i / cols) * 4.4
        const [px, py] = proj(x, height(x, z), z)
        if (i) c.lineTo(px, py)
        else c.moveTo(px, py)
      }
      c.stroke()
    }
    const [gx, gy] = proj(srcX, 0.25, srcZ)
    glow(c, gx, gy, 60 * dpr, P.ink, 0.5)
    c.fillStyle = rgba(P.ink, 1)
    c.beginPath()
    c.arc(gx, gy, 4 * dpr, 0, Math.PI * 2)
    c.fill()
  }
}

export const SoundField = () => (
  <Stage make={makeWaves} className="sound-scene sound-scene--field" hint="Move to place the source" />
)

/* ─────────────── Read the room: coverage and reflections in four venues ─────────────── */

type RoomId = 'club' | 'warehouse' | 'ballroom' | 'openair'

const ROOMS: Record<RoomId, { name: string; w: number; d: number; refl: number; note: string }> = {
  club: {
    name: 'Club',
    w: 14,
    d: 18,
    refl: 0.15,
    note: 'Treated walls and a tight floor. The control is built in, so the job is consistency from the booth to the bar.',
  },
  warehouse: {
    name: 'Warehouse',
    w: 22,
    d: 32,
    refl: 0.6,
    note: 'Concrete, steel and parallel walls: long reverberation and a hard slap from the back wall. Aim the energy at people, not surfaces.',
  },
  ballroom: {
    name: 'Ballroom',
    w: 20,
    d: 24,
    refl: 0.38,
    note: 'Glass, mirrors and a low ceiling: early reflections that blur speech and the top end. Coverage has to be even at every table.',
  },
  openair: {
    name: 'Open air',
    w: 30,
    d: 36,
    refl: 0,
    note: 'No walls to help. Level falls with distance and the wind moves the sound, so throw and aim decide the back of the crowd.',
  },
}

const makeRoom = (room: { current: RoomId }): Draw => {
  let shown = room.current
  let fade = 1
  return ({ c, w, h, t, dpr, pointer }) => {
    if (shown !== room.current) {
      fade -= 0.08
      if (fade <= 0) {
        shown = room.current
        fade = 0
      }
    } else fade = Math.min(1, fade + 0.06)
    const R = ROOMS[shown]
    const m = 28 * dpr
    const s = Math.min((w - 2 * m) / R.w, (h - 2 * m - 30 * dpr) / R.d)
    const ox = (w - R.w * s) / 2
    const oy = m
    const X = (x: number) => ox + x * s
    const Y = (y: number) => oy + y * s
    c.globalAlpha = fade
    // the room
    c.strokeStyle = rgba(P.ink, R.refl ? 0.5 : 0.25)
    c.lineWidth = (R.refl ? 2 : 1) * dpr
    c.setLineDash(R.refl ? [] : [6 * dpr, 6 * dpr])
    c.strokeRect(X(0), Y(0), R.w * s, R.d * s)
    c.setLineDash([])
    // the stage
    c.fillStyle = rgba(P.ink, 0.06)
    c.fillRect(X(R.w * 0.2), Y(0), R.w * 0.6 * s, 2.2 * s)
    label(c, 'Stage', X(R.w / 2), Y(1.3) + 4 * dpr, dpr, 0.45)
    // loudspeakers, toed in to meet over the audience
    const spk = [-1, 1].map((sd) => {
      const x = R.w / 2 + sd * R.w * 0.32
      const y = 2.6
      const aim = Math.atan2(R.d * 0.55 - y, R.w / 2 - x)
      return { x, y, aim }
    })
    const level = (x: number, y: number) => {
      let p = 0
      for (const k of spk) {
        const r = Math.max(1, Math.hypot(x - k.x, y - k.y))
        let off = Math.abs(Math.atan2(y - k.y, x - k.x) - k.aim)
        off = Math.min(off, Math.PI * 2 - off)
        const deg = (off * 180) / Math.PI
        const dir = -12 * Math.pow(Math.max(0, deg - 50) / 30, 2)
        p += Math.pow(10, (Math.max(-30, dir) - dB(r)) / 10)
        // reflections from the side and back walls add level, and smear
        if (R.refl) {
          for (const [ix, iy] of [
            [-k.x, k.y],
            [2 * R.w - k.x, k.y],
            [k.x, 2 * R.d - k.y],
          ]) {
            const rr = Math.hypot(x - ix, y - iy)
            p += (R.refl * R.refl) / (rr * rr)
          }
        }
      }
      return 10 * Math.log10(p)
    }
    // the audience, coloured by level against the middle of the floor
    const ref = level(R.w / 2, R.d * 0.55)
    let lo = Infinity
    let hi = -Infinity
    const step = Math.max(1, R.w / 16)
    for (let y = 4; y < R.d - 0.8; y += step * 0.9) {
      for (let x = 1; x < R.w - 0.8; x += step) {
        const l = level(x, y) - ref
        lo = Math.min(lo, l)
        hi = Math.max(hi, l)
        const good = Math.abs(l) <= 3
        c.fillStyle = good ? rgba(P.brass, 0.85) : rgba(P.ink, l > 3 ? 0.6 : 0.18)
        c.beginPath()
        c.arc(X(x), Y(y), (good ? 2.6 : 2) * dpr, 0, Math.PI * 2)
        c.fill()
      }
    }
    // wavefronts, and their reflections in walled rooms
    c.save()
    c.beginPath()
    c.rect(X(0), Y(0), R.w * s, R.d * s)
    c.clip()
    const maxR = Math.hypot(R.w, R.d)
    for (const k of spk) {
      const sources: [number, number, number, number][] = [[k.x, k.y, k.aim, 1]]
      if (R.refl) {
        sources.push([-k.x, k.y, Math.PI - k.aim, R.refl])
        sources.push([2 * R.w - k.x, k.y, Math.PI - k.aim, R.refl])
        sources.push([k.x, 2 * R.d - k.y, -k.aim, R.refl * 0.8])
      }
      for (const [sx, sy, aim, a] of sources) {
        for (let n = 0; n < 5; n++) {
          const r = (((t * 0.22 + n / 5) % 1) + 1) % 1
          c.strokeStyle = rgba(a === 1 ? P.brass : P.ink, (1 - r) * 0.5 * a)
          c.lineWidth = dpr
          c.beginPath()
          c.arc(X(sx), Y(sy), r * maxR * s, aim - 0.96, aim + 0.96)
          c.stroke()
        }
      }
    }
    c.restore()
    for (const k of spk) {
      c.save()
      c.translate(X(k.x), Y(k.y))
      c.rotate(k.aim)
      c.fillStyle = rgba(P.ink, 0.95)
      c.fillRect(-5 * dpr, -9 * dpr, 10 * dpr, 18 * dpr)
      c.restore()
    }
    // readouts
    const spread = Math.max(Math.abs(lo), Math.abs(hi))
    label(c, `Level across the floor  ±${spread.toFixed(0)} dB`, X(0), h - 8 * dpr, dpr, 0.75, 'left')
    if (pointer.active) {
      const px = (pointer.x * w - ox) / s
      const py = (pointer.y * h - oy) / s
      if (px > 0 && px < R.w && py > 2.4 && py < R.d) {
        const l = level(px, py) - ref
        label(c, `${l >= 0 ? '+' : '−'}${Math.abs(l).toFixed(1)} dB`, pointer.x * w, pointer.y * h - 12 * dpr, dpr, 0.95)
        c.strokeStyle = rgba(P.ink, 0.8)
        c.beginPath()
        c.arc(pointer.x * w, pointer.y * h, 5 * dpr, 0, Math.PI * 2)
        c.stroke()
      }
    }
    c.globalAlpha = 1
  }
}

export function RoomPlanner() {
  const [room, setRoom] = useState<RoomId>('warehouse')
  const ref = useRef(room)
  useEffect(() => {
    ref.current = room
  }, [room])
  const make = useMemo(() => () => makeRoom(ref), [])
  return (
    <div className="scene-panel">
      <div className="scene-tabs" role="tablist" aria-label="Venue">
        {(Object.keys(ROOMS) as RoomId[]).map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={room === id}
            className={room === id ? 'is-on' : ''}
            onClick={() => setRoom(id)}
          >
            {ROOMS[id].name}
          </button>
        ))}
      </div>
      <Stage make={make} className="sound-scene sound-scene--plan" />
      <p className="scene-panel__note" aria-live="polite">
        <strong>{ROOMS[room].name}.</strong> {ROOMS[room].note}
      </p>
    </div>
  )
}

/* ─────────────── Tune on site: the room as we find it, and as we leave it ─────────────── */

const F_MIN = Math.log10(20)
const F_MAX = Math.log10(20000)
// what the room does to the system before tuning: [centre Hz, dB, width in octaves]
const ROOM_MODES: [number, number, number][] = [
  [45, 8, 0.5],
  [90, -7, 0.35],
  [160, 4, 0.4],
  [260, 3.5, 0.7],
  [2500, 3, 0.9],
  [8000, -4, 1.2],
]
const target = (f: number) => 3 * (1 - smooth(60, 600, f)) - 2 * smooth(3000, 16000, f)
const deviation = (f: number) =>
  ROOM_MODES.reduce((sum, [fc, g, bw]) => sum + g * Math.exp(-Math.pow(Math.log2(f / fc) / bw, 2)), 0) +
  1.2 * Math.sin(Math.log2(f) * 7.3)

const makeTune = (ctl: { current: { v: number; touched: boolean } }): Draw => {
  let v = 0
  return ({ c, w, h, t, dpr }) => {
    const goal = ctl.current.touched ? ctl.current.v : 0.5 - 0.5 * Math.cos(t * 0.45)
    v += (goal - v) * 0.08
    const m = { l: 34 * dpr, r: 12 * dpr, t: 22 * dpr, b: 26 * dpr }
    const gw = w - m.l - m.r
    const gh = h - m.t - m.b
    const X = (f: number) => m.l + ((Math.log10(f) - F_MIN) / (F_MAX - F_MIN)) * gw
    const Y = (d: number) => m.t + gh / 2 - (d / 15) * (gh / 2)
    // grid
    c.lineWidth = dpr
    c.font = `${10 * dpr}px Manrope, sans-serif`
    c.fillStyle = rgba(P.ink, 0.45)
    for (const [f, txt] of [
      [20, '20'],
      [100, '100'],
      [1000, '1k'],
      [10000, '10k'],
      [20000, '20k'],
    ] as const) {
      c.strokeStyle = rgba(P.ink, 0.08)
      c.beginPath()
      c.moveTo(X(f), m.t)
      c.lineTo(X(f), m.t + gh)
      c.stroke()
      c.textAlign = 'center'
      c.fillText(txt, X(f), h - 8 * dpr)
    }
    for (const d of [-12, -6, 0, 6, 12]) {
      c.strokeStyle = rgba(P.ink, d ? 0.06 : 0.18)
      c.beginPath()
      c.moveTo(m.l, Y(d))
      c.lineTo(m.l + gw, Y(d))
      c.stroke()
      c.textAlign = 'right'
      c.fillText(`${d > 0 ? '+' : ''}${d}`, m.l - 6 * dpr, Y(d) + 3 * dpr)
    }
    // the target band
    c.fillStyle = rgba(P.brass, 0.08)
    c.beginPath()
    for (let i = 0; i <= 100; i++) {
      const f = Math.pow(10, F_MIN + (i / 100) * (F_MAX - F_MIN))
      c.lineTo(X(f), Y(target(f) + 3))
    }
    for (let i = 100; i >= 0; i--) {
      const f = Math.pow(10, F_MIN + (i / 100) * (F_MAX - F_MIN))
      c.lineTo(X(f), Y(target(f) - 3))
    }
    c.fill()
    // the measurement
    let worst = 0
    const pts: [number, number][] = []
    for (let i = 0; i <= 220; i++) {
      const f = Math.pow(10, F_MIN + (i / 220) * (F_MAX - F_MIN))
      const live = Math.sin(t * 3 + i * 0.7) * 0.35 + Math.sin(t * 5.3 + i * 1.3) * 0.25
      const d = target(f) + deviation(f) * (1 - v * 0.88) + live * (1 - v * 0.5)
      worst = Math.max(worst, Math.abs(d - target(f)))
      pts.push([X(f), Y(d)])
    }
    for (const [lw, a] of [
      [6, 0.12],
      [1.8, 0.95],
    ] as const) {
      c.strokeStyle = rgba(v > 0.6 ? P.brass : P.ink, a)
      c.lineWidth = lw * dpr
      c.beginPath()
      pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)))
      c.stroke()
    }
    // the corrections being applied
    for (const [fc, g] of ROOM_MODES) {
      const applied = -g * v * 0.88
      if (Math.abs(applied) < 0.3) continue
      const x = X(fc)
      c.strokeStyle = rgba(P.brass, 0.7)
      c.beginPath()
      c.arc(x, Y(target(fc)), 7 * dpr * Math.min(1, Math.abs(applied) / 6 + 0.3), 0, Math.PI * 2)
      c.stroke()
    }
    label(c, v > 0.6 ? 'Tuned for the room' : 'As we arrive', m.l, 12 * dpr, dpr, 0.8, 'left')
    label(c, `${w > 520 * dpr ? 'Off target  ' : ''}±${worst.toFixed(1)} dB`, w - m.r, 12 * dpr, dpr, 0.6, 'right')
  }
}

export function TuneScene() {
  const [v, setV] = useState(0)
  const ctl = useRef({ v: 0, touched: false })
  const make = useMemo(() => () => makeTune(ctl), [])
  return (
    <div className="scene-panel">
      <Stage make={make} className="sound-scene sound-scene--graph" />
      <label className="scene-slider">
        <span>As we arrive</span>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(v * 100)}
          onChange={(e) => {
            const x = +e.target.value / 100
            setV(x)
            ctl.current = { v: x, touched: true }
          }}
          aria-label="Tuning"
        />
        <span>Tuned</span>
      </label>
    </div>
  )
}

/* ─────────────── Source to output: the signal chain, with its network ─────────────── */

const CHAIN = [
  { name: 'Source', kit: 'CDJ-3000X · inputs', body: 'Players, microphones and inputs: where the music enters the system.' },
  { name: 'Mixing', kit: 'DJM-V10-LF · DM3', body: 'Input management and mixing, with gain set for headroom, not volume.' },
  { name: 'Processing', kit: 'DSP · alignment', body: 'Crossovers, EQ, delay and limiting, aligned to the room on site.' },
  { name: 'Amplification', kit: 'd&b D40', body: 'Amplifiers running the matching loudspeaker presets, with headroom to spare.' },
  { name: 'Loudspeakers', kit: 'V10P · B22 · RCF', body: 'Tops and subwoofers, placed and aimed for even coverage.' },
]
const CONTROL = {
  name: 'Control',
  kit: 'R1 · StageMix',
  body: 'Configuration and monitoring over the network, from the mix position or a tablet.',
}

const makeChain = (): Draw => {
  return ({ c, w, h, t, dpr, pointer }) => {
    // a column of stages on the left, the control position on the right
    const n = CHAIN.length
    const pos = CHAIN.map((_, i) => ({ x: w * 0.1, y: h * (0.08 + (i / (n - 1)) * 0.68) }))
    const ctrl = { x: w * 0.68, y: h * 0.42 }
    const net = [1, 2, 3]
    // which node is in focus: the one under the pointer, otherwise each in turn
    let focus = Math.floor(t / 2.6) % (n + 1)
    if (pointer.active) {
      let best = Infinity
      ;[...pos, ctrl].forEach((p, i) => {
        const d = Math.hypot(p.x - pointer.x * w, p.y - pointer.y * h)
        if (d < best) {
          best = d
          focus = i
        }
      })
    }
    // the network, dashed
    c.setLineDash([4 * dpr, 6 * dpr])
    c.lineWidth = dpr
    net.forEach((i) => {
      c.strokeStyle = rgba(P.ink, focus === n || focus === i ? 0.5 : 0.18)
      c.beginPath()
      c.moveTo(pos[i].x, pos[i].y)
      c.lineTo(ctrl.x, ctrl.y)
      c.stroke()
    })
    c.setLineDash([])
    // the audio path
    c.strokeStyle = rgba(P.brass, 0.5)
    c.lineWidth = 2 * dpr
    c.beginPath()
    pos.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)))
    c.stroke()
    // signal moving through it
    for (let k = 0; k < 14; k++) {
      const u = (((t * 0.16 + k / 14) % 1) + 1) % 1
      const seg = u * (n - 1)
      const i = Math.min(n - 2, Math.floor(seg))
      const f = seg - i
      const x = pos[i].x + (pos[i + 1].x - pos[i].x) * f
      const y = pos[i].y + (pos[i + 1].y - pos[i].y) * f
      glow(c, x, y, 10 * dpr, P.brass, 0.6)
    }
    // control messages, both ways
    net.forEach((i, j) => {
      const u = (t * 0.35 + j * 0.33) % 1
      const back = j % 2 ? 1 - u : u
      const x = ctrl.x + (pos[i].x - ctrl.x) * back
      const y = ctrl.y + (pos[i].y - ctrl.y) * back
      c.fillStyle = rgba(P.ink, 0.7)
      c.fillRect(x - 2 * dpr, y - 2 * dpr, 4 * dpr, 4 * dpr)
    })
    // the nodes
    const node = (p: { x: number; y: number }, item: { name: string; kit: string }, on: boolean, square = false) => {
      if (on) glow(c, p.x, p.y, 46 * dpr, P.brass, 0.35)
      c.fillStyle = rgba(on ? P.ink : P.brass, on ? 1 : 0.9)
      c.beginPath()
      if (square) c.rect(p.x - 6 * dpr, p.y - 6 * dpr, 12 * dpr, 12 * dpr)
      else c.arc(p.x, p.y, (on ? 7 : 5) * dpr, 0, Math.PI * 2)
      c.fill()
      const tx = p.x + 16 * dpr
      const ty = p.y + 4 * dpr
      label(c, item.name, tx, ty, dpr, on ? 0.95 : 0.6, 'left')
      c.font = `${10.5 * dpr}px Manrope, sans-serif`
      c.fillStyle = rgba(P.ink, on ? 0.7 : 0.4)
      c.textAlign = 'left'
      c.fillText(item.kit, tx, ty + 15 * dpr)
    }
    pos.forEach((p, i) => node(p, CHAIN[i], focus === i))
    node(ctrl, CONTROL, focus === n, true)
    label(c, 'Dante · AES67 network', (pos[2].x + ctrl.x) / 2 + 40 * dpr, ctrl.y - 34 * dpr, dpr, 0.4)
    // what the focused part does
    const item = focus === n ? CONTROL : CHAIN[focus]
    c.font = `${13 * dpr}px Manrope, sans-serif`
    c.fillStyle = rgba(P.ink, 0.8)
    c.textAlign = 'center'
    c.textAlign = 'left'
    c.fillText(item.body, w * 0.06, h - 14 * dpr, w * 0.9)
  }
}

export const SignalChain = () => (
  <Stage make={makeChain} className="sound-scene sound-scene--chain" hint="Point at a part of the chain" />
)

/* ─────────────── Low frequencies: where the bass goes, with and without a cardioid array ─────────────── */

type SubMode = 'standard' | 'cardioid'

const GW = 120
const GH = 80
const FIELD_W = 24 // metres
const FIELD_H = 16
const SUB_Y = 5.4
const K = (2 * Math.PI * 63) / 343 // 63 Hz

function field(mode: SubMode) {
  const d = Math.PI / 2 / K // a quarter wavelength
  const subs =
    mode === 'standard'
      ? [
          { x: 11.3, y: SUB_Y, delay: 0, pol: 1 },
          { x: 12.7, y: SUB_Y, delay: 0, pol: 1 },
        ]
      : [
          { x: 11.3, y: SUB_Y, delay: 0, pol: 1 },
          { x: 12.7, y: SUB_Y, delay: 0, pol: 1 },
          // rear boxes behind, delayed by the spacing, inverted and level-matched for the stage: they cancel backwards
          { x: 11.3, y: SUB_Y - d, delay: K * d, pol: -0.7 },
          { x: 12.7, y: SUB_Y - d, delay: K * d, pol: -0.7 },
        ]
  const re = new Float32Array(GW * GH)
  const im = new Float32Array(GW * GH)
  for (let j = 0; j < GH; j++) {
    for (let i = 0; i < GW; i++) {
      const x = ((i + 0.5) / GW) * FIELD_W
      const y = ((j + 0.5) / GH) * FIELD_H
      let a = 0
      let b = 0
      for (const s of subs) {
        const r = Math.max(0.4, Math.hypot(x - s.x, y - s.y))
        const ph = -K * r - s.delay
        a += (s.pol * Math.cos(ph)) / r
        b += (s.pol * Math.sin(ph)) / r
      }
      re[j * GW + i] = a
      im[j * GW + i] = b
    }
  }
  return { re, im }
}

const makeSubs = (mode: { current: SubMode }): Draw => {
  const fields = { standard: field('standard'), cardioid: field('cardioid') }
  let mix = mode.current === 'cardioid' ? 1 : 0
  const img = new ImageData(GW, GH)
  const off = document.createElement('canvas')
  off.width = GW
  off.height = GH
  const octx = off.getContext('2d')!
  const at = (fx: number, fy: number, m: number) => {
    const i = Math.max(0, Math.min(GW - 1, Math.floor((fx / FIELD_W) * GW)))
    const j = Math.max(0, Math.min(GH - 1, Math.floor((fy / FIELD_H) * GH)))
    const k = j * GW + i
    const a = fields.standard.re[k] * (1 - m) + fields.cardioid.re[k] * m
    const b = fields.standard.im[k] * (1 - m) + fields.cardioid.im[k] * m
    return { a, b, mag: Math.hypot(a, b) }
  }
  return ({ c, w, h, t, dpr, pointer }) => {
    mix += ((mode.current === 'cardioid' ? 1 : 0) - mix) * 0.06
    const ref = at(12, 11, mix).mag
    const ph = t * Math.PI * 2 * 0.7
    const cos = Math.cos(ph)
    const sin = Math.sin(ph)
    const [ir, ig, ib] = P.brass
    for (let k = 0; k < GW * GH; k++) {
      const a = fields.standard.re[k] * (1 - mix) + fields.cardioid.re[k] * mix
      const b = fields.standard.im[k] * (1 - mix) + fields.cardioid.im[k] * mix
      const mag = Math.hypot(a, b)
      const level = Math.max(0, Math.min(1, (dB(mag / ref) + 24) / 30))
      const wave = 0.6 + 0.4 * ((a * cos - b * sin) / (mag || 1))
      const v = level * wave
      img.data[k * 4] = ir
      img.data[k * 4 + 1] = ig
      img.data[k * 4 + 2] = ib
      img.data[k * 4 + 3] = Math.round(v * 235)
    }
    octx.putImageData(img, 0, 0)
    c.imageSmoothingEnabled = true
    c.drawImage(off, 0, 0, w, h)
    const X = (x: number) => (x / FIELD_W) * w
    const Y = (y: number) => (y / FIELD_H) * h
    // the stage and the floor
    c.strokeStyle = rgba(P.ink, 0.5)
    c.lineWidth = dpr
    c.strokeRect(X(7), Y(0.6), X(10), Y(3.2))
    label(c, 'Stage', X(12), Y(2.3), dpr, 0.85)
    label(c, 'Dance floor', X(12), Y(13.5), dpr, 0.6)
    // the subwoofers
    const boxes =
      mix > 0.5
        ? [
            [11.3, SUB_Y],
            [12.7, SUB_Y],
            [11.3, SUB_Y - Math.PI / 2 / K],
            [12.7, SUB_Y - Math.PI / 2 / K],
          ]
        : [
            [11.3, SUB_Y],
            [12.7, SUB_Y],
          ]
    c.fillStyle = rgba(P.ink, 0.95)
    for (const [x, y] of boxes) c.fillRect(X(x) - 7 * dpr, Y(y) - 5 * dpr, 14 * dpr, 10 * dpr)
    // readouts
    const onStage = dB(at(12, 2.2, mix).mag / ref)
    label(c, `On stage  ${onStage.toFixed(0)} dB`, 12 * dpr, h - 12 * dpr, dpr, 0.9, 'left')
    label(c, 'On the floor  0 dB', w - 12 * dpr, h - 12 * dpr, dpr, 0.9, 'right')
    if (pointer.active) {
      const l = dB(at(pointer.x * FIELD_W, pointer.y * FIELD_H, mix).mag / ref)
      label(c, `${l >= 0 ? '+' : '−'}${Math.abs(l).toFixed(0)} dB`, pointer.x * w, pointer.y * h - 12 * dpr, dpr, 0.95)
    }
  }
}

export function SubArray() {
  const [mode, setMode] = useState<SubMode>('standard')
  const ref = useRef(mode)
  useEffect(() => {
    ref.current = mode
  }, [mode])
  const make = useMemo(() => () => makeSubs(ref), [])
  return (
    <div className="scene-panel">
      <div className="scene-tabs" role="tablist" aria-label="Subwoofer array">
        <button
          role="tab"
          aria-selected={mode === 'standard'}
          className={mode === 'standard' ? 'is-on' : ''}
          onClick={() => setMode('standard')}
        >
          Side by side
        </button>
        <button
          role="tab"
          aria-selected={mode === 'cardioid'}
          className={mode === 'cardioid' ? 'is-on' : ''}
          onClick={() => setMode('cardioid')}
        >
          Cardioid array
        </button>
      </div>
      <Stage make={make} className="sound-scene sound-scene--field-map" />
      <p className="scene-panel__note" aria-live="polite">
        {mode === 'standard'
          ? 'Subwoofers radiate in every direction: as much bass on the stage as on the floor, muddying monitors and the booth.'
          : 'Rear boxes, delayed and inverted, cancel the energy behind the array: the floor keeps its weight, the stage goes quiet.'}{' '}
        <span className="muted">Illustration at 63 Hz, plan view.</span>
      </p>
    </div>
  )
}
