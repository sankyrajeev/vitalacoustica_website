import { useEffect, useMemo, useRef, useState } from 'react'
import { box, camera, glow, label, P, ring, rgba, trace, type Draw, type Frame, type Proj, type V3 } from './draw'
import { Stage } from './Stage'

// "Every space has a sound": four venues in 3D, in section and in plan, with the loudspeakers'
// coverage and the room's reflections. Simple physics for illustration: distance, directivity and
// mirror-image reflections, not a full acoustic prediction.

type RoomId = 'club' | 'warehouse' | 'ballroom' | 'openair'
type View = '3d' | 'side' | 'plan'

type Room = { name: string; w: number; d: number; h: number; refl: number; rt: string; note: string }

const ROOMS: Record<RoomId, Room> = {
  club: {
    name: 'Club',
    w: 14,
    d: 18,
    h: 4.5,
    refl: 0.15,
    rt: '0.6 s',
    note: 'Treated walls and a tight floor. The control is built in, so the job is consistency from the booth to the bar.',
  },
  warehouse: {
    name: 'Warehouse',
    w: 22,
    d: 34,
    h: 10,
    refl: 0.6,
    rt: '2.8 s',
    note: 'Concrete, steel and a high roof: long reverberation and a hard slap from the back wall. Aim the energy at people, not surfaces.',
  },
  ballroom: {
    name: 'Ballroom',
    w: 20,
    d: 24,
    h: 5,
    refl: 0.38,
    rt: '1.4 s',
    note: 'Glass, mirrors and a low ceiling: early reflections that blur speech and the top end. Every table should hear the same thing.',
  },
  openair: {
    name: 'Open air',
    w: 30,
    d: 42,
    h: 0,
    refl: 0,
    rt: 'none',
    note: 'No walls to help. Level falls with distance and the wind moves the sound, so a delay tower carries the back of the crowd.',
  },
}

type Source = { x: number; y: number; aim: number; gain: number }

/** Loudspeakers in plan (x across, y = distance from the stage), with where they point. */
function sources(id: RoomId): Source[] {
  const R = ROOMS[id]
  const mains = [-1, 1].map((sd) => {
    const x = R.w / 2 + sd * R.w * 0.32
    const y = 2.6
    return { x, y, aim: Math.atan2(R.d * (id === 'openair' ? 0.32 : 0.55) - y, R.w / 2 - x), gain: 1 }
  })
  if (id !== 'openair') return mains
  // a delay tower part-way back, pointing away from the stage
  return [...mains, ...[-1, 1].map((sd) => ({ x: R.w / 2 + sd * R.w * 0.22, y: R.d * 0.58, aim: Math.PI / 2, gain: 0.5 }))]
}

/** Level in dB at a point on the floor (plan coordinates). */
function levelAt(id: RoomId, x: number, y: number) {
  const R = ROOMS[id]
  let p = 0
  for (const s of sources(id)) {
    const r = Math.max(1, Math.hypot(x - s.x, y - s.y))
    let off = Math.abs(Math.atan2(y - s.y, x - s.x) - s.aim)
    off = Math.min(off, Math.PI * 2 - off)
    const deg = (off * 180) / Math.PI
    const dir = -12 * Math.pow(Math.max(0, deg - 50) / 30, 2)
    p += (s.gain * s.gain * Math.pow(10, Math.max(-30, dir) / 10)) / (r * r)
    if (R.refl) {
      for (const [ix, iy] of [
        [-s.x, s.y],
        [2 * R.w - s.x, s.y],
        [s.x, 2 * R.d - s.y],
      ]) {
        const rr = Math.hypot(x - ix, y - iy)
        p += (R.refl * R.refl * s.gain * s.gain) / (rr * rr)
      }
    }
  }
  return 10 * Math.log10(p)
}

/** Where the audience stands: a grid, or seated around tables in the ballroom. */
function audience(id: RoomId): [number, number][] {
  const R = ROOMS[id]
  const pts: [number, number][] = []
  if (id === 'ballroom') {
    for (const [tx, ty] of tables(R))
      for (let k = 0; k < 7; k++)
        pts.push([tx + Math.cos((k / 7) * Math.PI * 2) * 1.3, ty + Math.sin((k / 7) * Math.PI * 2) * 1.3])
    return pts
  }
  const step = Math.max(1, R.w / 15)
  for (let y = 4; y < R.d - 0.8; y += step * 0.9) for (let x = 1; x < R.w - 0.8; x += step) pts.push([x, y])
  return pts
}

function tables(R: Room): [number, number][] {
  const out: [number, number][] = []
  for (let y = 6.5; y < R.d - 2; y += 4.2) for (let x = 3.5; x < R.w - 2; x += 4.3) out.push([x, y])
  return out
}

/** Wavefront arcs from each source (and, in rooms, their mirror images), clipped to the room. */
function wavefronts(id: RoomId, t: number): { pts: [number, number][]; a: number; direct: boolean }[] {
  const R = ROOMS[id]
  const maxR = Math.hypot(R.w, R.d)
  const out: { pts: [number, number][]; a: number; direct: boolean }[] = []
  const inside = (x: number, y: number) => id === 'openair' || (x >= 0 && x <= R.w && y >= 0 && y <= R.d)
  for (const s of sources(id)) {
    const imgs: [number, number, number, number][] = [[s.x, s.y, s.aim, 1]]
    if (R.refl) {
      imgs.push([-s.x, s.y, Math.PI - s.aim, R.refl])
      imgs.push([2 * R.w - s.x, s.y, Math.PI - s.aim, R.refl])
      imgs.push([s.x, 2 * R.d - s.y, -s.aim, R.refl * 0.8])
    }
    for (const [sx, sy, aim, a] of imgs) {
      for (let n = 0; n < 5; n++) {
        const r = (((t * 0.22 + n / 5 + (s.gain < 1 ? 0.5 : 0)) % 1) + 1) % 1
        const rad = r * maxR * (id === 'openair' ? 0.7 : 1)
        let run: [number, number][] = []
        for (let k = 0; k <= 26; k++) {
          const ang = aim - 0.96 + (k / 26) * 1.92
          const x = sx + Math.cos(ang) * rad
          const y = sy + Math.sin(ang) * rad
          if (inside(x, y)) run.push([x, y])
          else if (run.length) {
            out.push({ pts: run, a: (1 - r) * a * s.gain, direct: a === 1 })
            run = []
          }
        }
        if (run.length > 1) out.push({ pts: run, a: (1 - r) * a * s.gain, direct: a === 1 })
      }
    }
  }
  return out
}

const stars = Array.from(
  { length: 60 },
  (_, i) => [((i * 0.618) % 1) * 2 - 1, ((i * 0.377) % 1) * 0.5 + 0.5, (i % 7) / 7] as const,
)

/* ─────────────── 3D ─────────────── */

function draw3d(f: Frame, id: RoomId, yaw: number) {
  const { c, w, h, t, dpr } = f
  const R = ROOMS[id]
  const proj = camera({
    cx: w / 2,
    cy: h * 0.58,
    scale: Math.min(w, h * 1.4) / (Math.max(R.w, R.d) * 1.75),
    yaw,
    pitch: 0.62,
    persp: 70,
  })
  // plan (x across, y from stage) to world (x centred, z = towards the back is nearer the camera)
  const W = (x: number, y: number, z = 0): V3 => [x - R.w / 2, z, R.d / 2 - y]
  c.lineWidth = dpr

  if (id === 'openair') {
    for (const [sx, sy, k] of stars) {
      c.fillStyle = rgba(P.ink, 0.15 + k * 0.35 * (0.6 + 0.4 * Math.sin(t + k * 9)))
      c.fillRect(w / 2 + sx * w * 0.5, sy * h * 0.35 - h * 0.12, 1.5 * dpr, 1.5 * dpr)
    }
  }
  // floor grid
  c.strokeStyle = rgba(P.ink, 0.06)
  c.beginPath()
  for (let x = 0; x <= R.w; x += 2) trace(c, proj, [W(x, 0), W(x, R.d)])
  for (let y = 0; y <= R.d; y += 2) trace(c, proj, [W(0, y), W(R.w, y)])
  c.stroke()
  // walls and ceiling
  if (R.h) {
    c.fillStyle = rgba(P.ink, 0.035)
    c.beginPath()
    trace(c, proj, [W(0, 0), W(R.w, 0), W(R.w, 0, R.h), W(0, 0, R.h)], true)
    c.fill()
    c.strokeStyle = rgba(P.ink, 0.2 + R.refl * 0.4)
    box(c, proj, W(0, R.d), W(R.w, 0, R.h))
  } else {
    c.setLineDash([5 * dpr, 6 * dpr])
    c.strokeStyle = rgba(P.ink, 0.25)
    c.beginPath()
    trace(c, proj, [W(0, 0), W(R.w, 0), W(R.w, R.d), W(0, R.d)], true)
    c.stroke()
    c.setLineDash([])
  }
  // room features
  c.strokeStyle = rgba(P.ink, 0.3)
  if (id === 'warehouse') {
    c.beginPath()
    for (const x of [R.w * 0.25, R.w * 0.75]) for (let y = 8; y < R.d; y += 8) trace(c, proj, [W(x, y), W(x, y, R.h)])
    for (let y = 4; y < R.d; y += 4) trace(c, proj, [W(0, y, R.h), W(R.w / 2, y, R.h + 1.2), W(R.w, y, R.h)])
    c.stroke()
  }
  if (id === 'club') {
    c.fillStyle = rgba(P.brass, 0.12)
    for (let y = 4; y < R.d - 1; y += 3)
      for (const x of [0, R.w]) {
        c.beginPath()
        trace(c, proj, [W(x, y, 1), W(x, y + 2, 1), W(x, y + 2, 3), W(x, y, 3)], true)
        c.fill()
      }
  }
  if (id === 'ballroom') {
    for (const [tx, ty] of tables(R)) {
      c.strokeStyle = rgba(P.ink, 0.35)
      ring(c, proj, tx - R.w / 2, 0.75, R.d / 2 - ty, 0.8, 18)
      c.stroke()
    }
    for (const x of [R.w * 0.3, R.w * 0.7])
      for (const y of [R.d * 0.4, R.d * 0.75]) {
        const [px, py] = proj(W(x, y, R.h - 0.8))
        glow(c, px, py, 26 * dpr, P.brass, 0.5)
        c.strokeStyle = rgba(P.ink, 0.25)
        c.beginPath()
        trace(c, proj, [W(x, y, R.h), W(x, y, R.h - 0.8)])
        c.stroke()
      }
  }
  // stage
  c.strokeStyle = rgba(P.ink, 0.45)
  box(c, proj, W(R.w * 0.2, 0), W(R.w * 0.8, 2.2, 0.8))
  // audience, lit by level
  const ref = levelAt(id, R.w / 2, R.d * (id === 'openair' ? 0.4 : 0.55))
  let lo = Infinity
  let hi = -Infinity
  for (const [x, y] of audience(id)) {
    const l = levelAt(id, x, y) - ref
    lo = Math.min(lo, l)
    hi = Math.max(hi, l)
    const good = Math.abs(l) <= 3
    const [px, py, z] = proj(W(x, y, 0.05))
    c.fillStyle = good ? rgba(P.brass, 0.9) : rgba(P.ink, l > 3 ? 0.6 : 0.2)
    c.beginPath()
    c.arc(px, py, (good ? 2.4 : 1.8) * dpr * (60 / (60 + z)), 0, Math.PI * 2)
    c.fill()
  }
  // sound moving through the room at ear height
  for (const arc of wavefronts(id, t)) {
    c.strokeStyle = rgba(arc.direct ? P.brass : P.ink, arc.a * (arc.direct ? 0.6 : 0.45))
    c.beginPath()
    trace(
      c,
      proj,
      arc.pts.map(([x, y]) => W(x, y, 1.6)),
    )
    c.stroke()
  }
  // loudspeakers on stands (and the delay tower), subwoofers in front of the stage
  for (const s of sources(id)) {
    const top = s.gain < 1 ? 5 : 2.9
    c.strokeStyle = rgba(P.ink, 0.6)
    c.beginPath()
    trace(c, proj, [W(s.x, s.y), W(s.x, s.y, top - 0.6)])
    c.stroke()
    c.strokeStyle = rgba(P.ink, 0.95)
    box(c, proj, W(s.x - 0.3, s.y - 0.25, top - 0.6), W(s.x + 0.3, s.y + 0.25, top + 0.2))
  }
  c.strokeStyle = rgba(P.brass, 0.8)
  for (const x of [R.w / 2 - 1.2, R.w / 2 + 0.2]) box(c, proj, W(x, 2.3), W(x + 1, 3.1, 0.6))
  return Math.max(Math.abs(lo), Math.abs(hi))
}

/* ─────────────── section ─────────────── */

function drawSide(f: Frame, id: RoomId) {
  const { c, w, h, t, dpr, pointer } = f
  const R = ROOMS[id]
  const Hs = R.h || 12
  const m = 24 * dpr
  // sections are drawn with the height stretched, so a low room still reads
  const sx = (w - 2 * m) / R.d
  const sy = Math.min(sx * 3, (h - 2 * m - 60 * dpr) / (Hs + 1))
  const ox = m
  const base = (h + Hs * sy) / 2 + 10 * dpr
  const X = (d: number) => ox + d * sx
  const Y = (z: number) => base - z * sy
  c.lineWidth = dpr
  // floor, ceiling, walls
  c.strokeStyle = rgba(P.ink, 0.55)
  c.beginPath()
  c.moveTo(X(0), Y(0))
  c.lineTo(X(R.d), Y(0))
  c.stroke()
  if (R.h) {
    c.strokeStyle = rgba(P.ink, 0.25 + R.refl * 0.5)
    c.lineWidth = 2 * dpr
    c.strokeRect(X(0), Y(R.h), R.d * sx, R.h * sy)
    c.lineWidth = dpr
    label(c, `Ceiling ${R.h} m`, X(R.d) - 6 * dpr, Y(R.h) + 14 * dpr, dpr, 0.5, 'right')
  } else {
    for (const [px, py, k] of stars) {
      c.fillStyle = rgba(P.ink, 0.12 + k * 0.3)
      c.fillRect(ox + ((px + 1) / 2) * R.d * sx, Y(Hs * py), 1.4 * dpr, 1.4 * dpr)
    }
  }
  // the stage
  c.fillStyle = rgba(P.ink, 0.08)
  c.fillRect(X(0), Y(0.8), 2.2 * sx, 0.8 * sy)
  label(c, 'Stage', X(1.1), Y(0.8) - 6 * dpr, dpr, 0.5)
  // the loudspeakers in section
  const srcs = sources(id).filter((v, i, a) => a.findIndex((u) => u.y === v.y) === i)
  const H0 = 2.9
  const items = srcs.map((src) => {
    const z = src.gain < 1 ? 5 : H0
    const target = src.gain < 1 ? R.d * 0.85 : R.d * (id === 'openair' ? 0.4 : 0.6)
    return { d: src.y, z, aim: Math.atan2(z - 1.6, target - src.y), gain: src.gain }
  })
  // sound as rays: straight to the listener, and the longer paths off the ceiling and the back wall
  const path = (pts: [number, number][], a: number, col: readonly number[], speed: number, phase: number) => {
    c.strokeStyle = rgba(col, a * 0.35)
    c.beginPath()
    pts.forEach(([d, z], i) => (i ? c.lineTo(X(d), Y(z)) : c.moveTo(X(d), Y(z))))
    c.stroke()
    // a pulse travelling along it
    const len = pts.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0)
    let u = (((t * speed) / len + phase) % 1) * len
    for (let i = 1; i < pts.length; i++) {
      const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
      if (u <= seg) {
        const k = u / seg
        const px = X(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k)
        const py = Y(pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k)
        glow(c, px, py, 8 * dpr, col, a)
        break
      }
      u -= seg
    }
  }
  for (const it of items) {
    const from = it.d
    const heads = []
    for (let d = Math.max(4, from + 2); d < R.d - 1; d += it.gain < 1 ? 3 : 4.5) heads.push(d)
    heads.forEach((d, i) => {
      path(
        [
          [from, it.z],
          [d, 1.6],
        ],
        0.9 * it.gain,
        P.brass,
        9,
        i * 0.17,
      )
      if (R.h) {
        // off the ceiling: the mirror image of the loudspeaker above it gives the bounce point
        const iz = 2 * R.h - it.z
        const k = (iz - R.h) / (iz - 1.6)
        const bd = from + (d - from) * k
        path(
          [
            [from, it.z],
            [bd, R.h],
            [d, 1.6],
          ],
          R.refl,
          P.ink,
          9,
          i * 0.17 + 0.4,
        )
      }
    })
    if (R.h) {
      // off the back wall, returning towards the front of the room
      const d = R.d * 0.7
      const iw = 2 * R.d - from
      const k = (R.d - from) / (iw - from)
      const bz = it.z + (1.6 - it.z) * k
      path(
        [
          [from, it.z],
          [R.d, bz],
          [d, 1.6],
        ],
        R.refl * 0.9,
        P.ink,
        9,
        0.7,
      )
    }
  }
  // the audience along the centre line, lit by level
  const ref = levelAt(id, R.w / 2, R.d * (id === 'openair' ? 0.4 : 0.55))
  for (let d = 4; d < R.d - 0.8; d += 0.9) {
    const l = levelAt(id, R.w / 2, d) - ref
    const good = Math.abs(l) <= 3
    c.fillStyle = good ? rgba(P.brass, 0.9) : rgba(P.ink, l > 3 ? 0.6 : 0.2)
    c.beginPath()
    c.arc(X(d), Y(1.6), 2.6 * dpr, 0, Math.PI * 2)
    c.fill()
    c.fillRect(X(d) - 0.5 * dpr, Y(1.5), 1 * dpr, 1.5 * sy)
  }
  for (const it of items) {
    c.strokeStyle = rgba(P.ink, 0.7)
    c.beginPath()
    c.moveTo(X(it.d), Y(0))
    c.lineTo(X(it.d), Y(it.z))
    c.stroke()
    c.save()
    c.translate(X(it.d), Y(it.z))
    c.rotate(it.aim)
    c.fillStyle = rgba(P.ink, 0.95)
    c.fillRect(-4 * dpr, -7 * dpr, 10 * dpr, 14 * dpr)
    c.restore()
  }
  if (id === 'openair') label(c, 'Delay tower', X(R.d * 0.58), Y(5) - 14 * dpr, dpr, 0.6)
  if (pointer.active) {
    const d = (pointer.x * w - ox) / sx
    if (d > 3 && d < R.d) {
      const l = levelAt(id, R.w / 2, d) - ref
      label(c, `${l >= 0 ? '+' : '−'}${Math.abs(l).toFixed(1)} dB`, pointer.x * w, Y(1.6) - 18 * dpr, dpr, 0.95)
    }
  }
}

/* ─────────────── plan ─────────────── */

function drawPlan(f: Frame, id: RoomId) {
  const { c, w, h, t, dpr, pointer } = f
  const R = ROOMS[id]
  const m = 24 * dpr
  const s = Math.min((w - 2 * m) / R.w, (h - 2 * m - 30 * dpr) / R.d)
  const ox = (w - R.w * s) / 2
  const oy = m
  const X = (x: number) => ox + x * s
  const Y = (y: number) => oy + y * s
  c.lineWidth = (R.refl ? 2 : 1) * dpr
  c.strokeStyle = rgba(P.ink, R.refl ? 0.25 + R.refl * 0.5 : 0.25)
  c.setLineDash(R.refl ? [] : [6 * dpr, 6 * dpr])
  c.strokeRect(X(0), Y(0), R.w * s, R.d * s)
  c.setLineDash([])
  c.lineWidth = dpr
  c.fillStyle = rgba(P.ink, 0.06)
  c.fillRect(X(R.w * 0.2), Y(0), R.w * 0.6 * s, 2.2 * s)
  label(c, 'Stage', X(R.w / 2), Y(1.3) + 4 * dpr, dpr, 0.45)
  if (id === 'warehouse') {
    c.fillStyle = rgba(P.ink, 0.4)
    for (const x of [R.w * 0.25, R.w * 0.75])
      for (let y = 8; y < R.d; y += 8) c.fillRect(X(x) - 3 * dpr, Y(y) - 3 * dpr, 6 * dpr, 6 * dpr)
  }
  if (id === 'ballroom') {
    c.strokeStyle = rgba(P.ink, 0.3)
    for (const [tx, ty] of tables(R)) {
      c.beginPath()
      c.arc(X(tx), Y(ty), 0.8 * s, 0, Math.PI * 2)
      c.stroke()
    }
  }
  if (id === 'club') {
    c.fillStyle = rgba(P.brass, 0.35)
    for (let y = 4; y < R.d - 1; y += 3) {
      c.fillRect(X(0), Y(y), 4 * dpr, 2 * s)
      c.fillRect(X(R.w) - 4 * dpr, Y(y), 4 * dpr, 2 * s)
    }
  }
  const ref = levelAt(id, R.w / 2, R.d * (id === 'openair' ? 0.4 : 0.55))
  for (const [x, y] of audience(id)) {
    const l = levelAt(id, x, y) - ref
    const good = Math.abs(l) <= 3
    c.fillStyle = good ? rgba(P.brass, 0.85) : rgba(P.ink, l > 3 ? 0.6 : 0.18)
    c.beginPath()
    c.arc(X(x), Y(y), (good ? 2.6 : 2) * dpr, 0, Math.PI * 2)
    c.fill()
  }
  for (const arc of wavefronts(id, t)) {
    c.strokeStyle = rgba(arc.direct ? P.brass : P.ink, arc.a * 0.55)
    c.beginPath()
    arc.pts.forEach(([x, y], i) => (i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y))))
    c.stroke()
  }
  for (const k of sources(id)) {
    c.save()
    c.translate(X(k.x), Y(k.y))
    c.rotate(k.aim)
    c.fillStyle = rgba(P.ink, 0.95)
    c.fillRect(-5 * dpr, -9 * dpr, 10 * dpr, 18 * dpr)
    c.restore()
  }
  if (pointer.active) {
    const px = (pointer.x * w - ox) / s
    const py = (pointer.y * h - oy) / s
    if (px > 0 && px < R.w && py > 2.4 && py < R.d) {
      const l = levelAt(id, px, py) - ref
      label(c, `${l >= 0 ? '+' : '−'}${Math.abs(l).toFixed(1)} dB`, pointer.x * w, pointer.y * h - 12 * dpr, dpr, 0.95)
    }
  }
}

const makeRoom = (ctl: { current: { room: RoomId; view: View } }): Draw => {
  let shown = { ...ctl.current }
  let fade = 1
  let yaw = 0.5
  let spin = 0
  return (f) => {
    const { c, w, h, dpr, t, pointer, dt } = f
    if (shown.room !== ctl.current.room || shown.view !== ctl.current.view) {
      fade -= 0.1
      if (fade <= 0) {
        shown = { ...ctl.current }
        fade = 0
      }
    } else fade = Math.min(1, fade + 0.07)
    if (pointer.down) spin = pointer.dx * 30
    else spin += (0 - spin) * 0.05
    yaw += spin * dt
    c.globalAlpha = fade
    const R = ROOMS[shown.room]
    if (shown.view === '3d') {
      const spread = draw3d(f, shown.room, yaw + Math.sin(t * 0.18) * 0.35)
      label(c, `Level across the floor  ±${spread.toFixed(0)} dB`, 8 * dpr, h - 8 * dpr, dpr, 0.75, 'left')
      if (w > 520 * dpr) label(c, 'Drag to turn', w - 8 * dpr, h - 8 * dpr, dpr, 0.4, 'right')
    } else if (shown.view === 'side') drawSide(f, shown.room)
    else drawPlan(f, shown.room)
    label(c, `${R.w} × ${R.d}${R.h ? ` × ${R.h}` : ''} m`, 8 * dpr, 14 * dpr, dpr, 0.6, 'left')
    label(c, `Reverb  ${R.rt}`, w - 8 * dpr, 14 * dpr, dpr, 0.6, 'right')
    c.globalAlpha = 1
  }
}

const VIEWS: [View, string][] = [
  ['3d', '3D'],
  ['side', 'Section'],
  ['plan', 'Plan'],
]

export function RoomPlanner() {
  const [room, setRoom] = useState<RoomId>('warehouse')
  const [view, setView] = useState<View>('3d')
  const ctl = useRef({ room, view })
  useEffect(() => {
    ctl.current = { room, view }
  }, [room, view])
  const make = useMemo(() => () => makeRoom(ctl), [])
  return (
    <div className="scene-panel">
      <div className="scene-bar">
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
        <div className="scene-switch" role="group" aria-label="View">
          {VIEWS.map(([v, name]) => (
            <button key={v} aria-pressed={view === v} className={view === v ? 'is-on' : ''} onClick={() => setView(v)}>
              {name}
            </button>
          ))}
        </div>
      </div>
      <Stage make={make} className={`sound-scene sound-scene--room sound-scene--${view}`} />
      <p className="scene-panel__note" aria-live="polite">
        <strong>{ROOMS[room].name}.</strong> {ROOMS[room].note}
      </p>
    </div>
  )
}

/* ─────────────── Designed around the event: three kinds of night ─────────────── */

export type EventId = 'private' | 'dj' | 'corporate'

function eventScene(f: Frame, id: EventId, yaw: number) {
  const { c, w, h, t, dpr } = f
  const Wd = 18
  const Dd = 16
  const proj: Proj = camera({ cx: w / 2, cy: h * 0.5, scale: Math.min(w, h * 1.4) / 27, yaw, pitch: 0.6, persp: 60 })
  const Wp = (x: number, y: number, z = 0): V3 => [x - Wd / 2, z, Dd / 2 - y]
  c.lineWidth = dpr
  // the floor
  c.strokeStyle = rgba(P.ink, 0.07)
  c.beginPath()
  for (let x = 0; x <= Wd; x += 2) trace(c, proj, [Wp(x, 0), Wp(x, Dd)])
  for (let y = 0; y <= Dd; y += 2) trace(c, proj, [Wp(0, y), Wp(Wd, y)])
  c.stroke()
  const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * (124 / 60))), 6)
  const spk = (x: number, y: number, top: number, tall = false) => {
    c.strokeStyle = rgba(P.ink, 0.6)
    c.beginPath()
    trace(c, proj, [Wp(x, y), Wp(x, y, top - (tall ? 1.8 : 0.6))])
    c.stroke()
    c.strokeStyle = rgba(P.ink, 0.95)
    box(c, proj, Wp(x - 0.3, y - 0.25, top - (tall ? 1.8 : 0.6)), Wp(x + 0.3, y + 0.25, top + 0.2))
  }
  const rings = (x: number, y: number, z: number, aim: number, spread: number, speed: number, a: number) => {
    for (let n = 0; n < 4; n++) {
      const r = (((t * speed + n / 4) % 1) + 1) % 1
      c.strokeStyle = rgba(P.brass, (1 - r) * a)
      c.beginPath()
      trace(
        c,
        proj,
        Array.from({ length: 21 }, (_, k) => {
          const ang = aim - spread + (k / 20) * spread * 2
          return Wp(x + Math.cos(ang) * r * 14, y + Math.sin(ang) * r * 14, z)
        }),
      )
      c.stroke()
    }
  }

  if (id === 'private') {
    // string lights overhead
    for (let k = 0; k < 4; k++) {
      const y = 4 + k * 3.2
      const pts: V3[] = Array.from({ length: 19 }, (_, i) => Wp((i / 18) * Wd, y, 4.2 - Math.sin((i / 18) * Math.PI) * 0.9))
      c.strokeStyle = rgba(P.ink, 0.15)
      c.beginPath()
      trace(c, proj, pts)
      c.stroke()
      pts.forEach((p, i) => {
        const [px, py] = proj(p)
        glow(c, px, py, 9 * dpr, P.brass, 0.5 + 0.25 * Math.sin(t * 2 + i + k))
      })
    }
    // a dance floor, then round tables with guests
    c.fillStyle = rgba(P.brass, 0.07)
    c.beginPath()
    trace(c, proj, [Wp(6, 2.6), Wp(12, 2.6), Wp(12, 6), Wp(6, 6)], true)
    c.fill()
    for (const [tx, ty] of [
      [3.5, 8],
      [9, 8.5],
      [14.5, 8],
      [5, 12.5],
      [13, 12.5],
      [9, 13.5],
    ]) {
      c.strokeStyle = rgba(P.ink, 0.45)
      ring(c, proj, tx - Wd / 2, 0.75, Dd / 2 - ty, 0.9, 18)
      c.stroke()
      for (let k = 0; k < 7; k++) {
        const [px, py] = proj(Wp(tx + Math.cos((k / 7) * 6.28) * 1.35, ty + Math.sin((k / 7) * 6.28) * 1.35, 1.1))
        c.fillStyle = rgba(P.ink, 0.6)
        c.beginPath()
        c.arc(px, py, 2 * dpr, 0, Math.PI * 2)
        c.fill()
      }
    }
    spk(2.5, 1.8, 2.6)
    spk(15.5, 1.8, 2.6)
    rings(2.5, 1.8, 1.5, 0.9, 0.7, 0.16, 0.35)
    rings(15.5, 1.8, 1.5, Math.PI - 0.9, 0.7, 0.16, 0.35)
    return
  }

  if (id === 'dj') {
    // the booth on a riser, with truss behind
    c.strokeStyle = rgba(P.ink, 0.45)
    box(c, proj, Wp(4, 0), Wp(14, 3, 0.8))
    c.strokeStyle = rgba(P.brass, 0.9)
    box(c, proj, Wp(7.5, 1), Wp(10.5, 2, 1.8))
    const [dx, dy] = proj(Wp(9, 1.4, 2.5))
    c.fillStyle = rgba(P.ink, 0.9)
    c.beginPath()
    c.arc(dx, dy - beat * 3 * dpr, 4 * dpr, 0, Math.PI * 2)
    c.fill()
    c.strokeStyle = rgba(P.ink, 0.3)
    c.beginPath()
    trace(c, proj, [Wp(3, 0.2), Wp(3, 0.2, 5.5), Wp(15, 0.2, 5.5), Wp(15, 0.2)])
    c.stroke()
    // beams from the truss into the room
    c.globalCompositeOperation = P.add
    for (let k = 0; k < 6; k++) {
      const x = 4 + k * 2
      const sweep = Math.sin(t * 0.8 + k) * 5
      const [ax, ay] = proj(Wp(x, 0.2, 5.4))
      const [bx, by] = proj(Wp(x + sweep, 11, 0.2))
      const g = c.createLinearGradient(ax, ay, bx, by)
      g.addColorStop(0, rgba(k % 2 ? P.ink : P.brass, 0.5))
      g.addColorStop(1, rgba(P.brass, 0))
      c.strokeStyle = g
      c.lineWidth = 3 * dpr
      c.beginPath()
      c.moveTo(ax, ay)
      c.lineTo(bx, by)
      c.stroke()
    }
    c.globalCompositeOperation = 'source-over'
    c.lineWidth = dpr
    // stacks: subs on the floor, tops on poles
    for (const x of [2, 16]) {
      c.strokeStyle = rgba(P.brass, 0.85)
      box(c, proj, Wp(x - 0.7, 2.2), Wp(x + 0.7, 3.2, 1.1))
      spk(x, 2.7, 3.4)
    }
    rings(9, 3.2, 0.3, Math.PI / 2, 1.1, 0.5, 0.25 + beat * 0.3)
    // the crowd, moving
    for (let i = 0; i < 160; i++) {
      const hx = Math.sin(i * 12.9898) * 43758.5453
      const hy = Math.sin(i * 78.233) * 12345.6789
      const x = 2.5 + (hx - Math.floor(hx)) * 13
      const y = 4.5 + Math.pow(hy - Math.floor(hy), 1.4) * 10
      const [px, py] = proj(Wp(x, y, 1.6 + beat * 0.25 * ((i % 3) / 2)))
      c.fillStyle = rgba(i % 6 ? P.brass : P.ink, 0.75)
      c.beginPath()
      c.arc(px, py, 2 * dpr, 0, Math.PI * 2)
      c.fill()
    }
    return
  }

  // corporate: screen, lectern, column loudspeakers and seated rows
  c.fillStyle = rgba(P.ink, 0.1)
  c.strokeStyle = rgba(P.ink, 0.6)
  c.beginPath()
  trace(c, proj, [Wp(5, 0.3, 1.6), Wp(13, 0.3, 1.6), Wp(13, 0.3, 6), Wp(5, 0.3, 6)], true)
  c.fill()
  c.stroke()
  const [sx, sy] = proj(Wp(9, 0.3, 3.8))
  glow(c, sx, sy, 90 * dpr, P.brass, 0.18)
  c.strokeStyle = rgba(P.ink, 0.45)
  box(c, proj, Wp(4, 0), Wp(14, 3, 0.6))
  c.strokeStyle = rgba(P.brass, 0.9)
  box(c, proj, Wp(4.8, 1.4), Wp(5.6, 2, 1.8))
  const [lx, ly] = proj(Wp(5.2, 1.7, 2.4))
  c.fillStyle = rgba(P.ink, 0.9)
  c.beginPath()
  c.arc(lx, ly, 4 * dpr, 0, Math.PI * 2)
  c.fill()
  // speech, carried evenly
  for (const x of [3, 15]) {
    spk(x, 2.5, 3.2, true)
    rings(x, 2.5, 1.2, x < 9 ? 1.1 : Math.PI - 1.1, 0.75, 0.24, 0.35)
  }
  for (let r = 0; r < 7; r++)
    for (let k = 0; k < 12; k++) {
      const x = 3.2 + k * 1.05 + (k > 5 ? 0.8 : 0)
      const y = 5 + r * 1.4
      c.strokeStyle = rgba(P.ink, 0.35)
      box(c, proj, Wp(x, y), Wp(x + 0.5, y + 0.5, 0.5))
    }
  // the words, as a waveform travelling out
  c.strokeStyle = rgba(P.ink, 0.7)
  c.beginPath()
  for (let i = 0; i <= 60; i++) {
    const u = i / 60
    const env = Math.abs(Math.sin(u * 9 + t * 3)) * Math.sin(u * Math.PI)
    const p = proj(Wp(5.2 + u * 8, 2 + u * 2, 2.6 + Math.sin(u * 60 - t * 12) * 0.35 * env))
    if (i) c.lineTo(p[0], p[1])
    else c.moveTo(p[0], p[1])
  }
  c.stroke()
}

const makeEvent = (ctl: { current: EventId }): Draw => {
  let shown = ctl.current
  let fade = 1
  let yaw = -0.35
  let spin = 0
  return (f) => {
    if (shown !== ctl.current) {
      fade -= 0.1
      if (fade <= 0) {
        shown = ctl.current
        fade = 0
      }
    } else fade = Math.min(1, fade + 0.07)
    if (f.pointer.down) spin = f.pointer.dx * 30
    else spin += (0 - spin) * 0.05
    yaw += spin * f.dt
    f.c.globalAlpha = fade
    eventScene(f, shown, yaw + Math.sin(f.t * 0.16) * 0.3)
    label(f.c, 'Drag to turn', f.w - 8 * f.dpr, f.h - 8 * f.dpr, f.dpr, 0.4, 'right')
    f.c.globalAlpha = 1
  }
}

export function EventScene({ id }: { id: EventId }) {
  const ctl = useRef(id)
  useEffect(() => {
    ctl.current = id
  }, [id])
  const make = useMemo(() => () => makeEvent(ctl), [])
  return <Stage make={make} className="sound-scene sound-scene--event" />
}
