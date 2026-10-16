import { useEffect, useMemo, useRef, useState } from 'react'
import { camera, smooth, type Draw, type Proj, type V3 } from './draw'
import { makeRig, type Program } from './lightRig'
import { Stage } from './Stage'

// Interactive scenes for the Visuals page. Like the Light page's, they're drawn on a dark stage
// whatever the site's theme, and mostly in black and white: projected light reads on black.

const INK = 'rgba(240,237,229,'
const BRASS = 'rgba(184,164,123,'
const font = (px: number, dpr: number, weight = 600) => `${weight} ${px * dpr}px Manrope, system-ui, sans-serif`
const fract = (x: number) => x - Math.floor(x)
const hash = (n: number) => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453)

function tag(
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
const LEVELS = 12
const buckets = () => Array.from({ length: LEVELS }, () => new Path2D())
function addQuad(b: Path2D[], v: number, pts: readonly (readonly [number, number, number])[]) {
  if (v <= 0.02) return
  const p = b[Math.min(LEVELS - 1, Math.round(v * (LEVELS - 1)))]
  p.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1])
  p.closePath()
}
function addLine(b: Path2D[], v: number, a: readonly number[], z: readonly number[]) {
  if (v <= 0.02) return
  const p = b[Math.min(LEVELS - 1, Math.round(v * (LEVELS - 1)))]
  p.moveTo(a[0], a[1])
  p.lineTo(z[0], z[1])
}
function fillBuckets(c: CanvasRenderingContext2D, b: Path2D[], rgb: string, gain = 1, stroke = false) {
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
function makePixels(W: number, H: number) {
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const x = cv.getContext('2d')!
  const img = x.createImageData(W, H)
  return { cv, W, H, d: img.data, flush: () => x.putImageData(img, 0, 0) }
}

/* ─────────────── listening: a made-up track, or the microphone ─────────────── */

const BPM = 124

type Mic = { an: AnalyserNode; freq: Uint8Array<ArrayBuffer>; stream: MediaStream; ac: AudioContext }
type Heard = {
  bass: number
  mids: number
  highs: number
  level: number
  hit: boolean // a transient this frame
  beats: number
  bar: number
  section: string
}

function makeListener() {
  const s: Heard = { bass: 0, mids: 0, highs: 0, level: 0, hit: false, beats: 0, bar: 0, section: 'Intro' }
  let last = -1
  let avg = 0.1
  let lastHit = -1
  return (t: number, mic: Mic | null): Heard => {
    let bass: number
    let mids: number
    let highs: number
    s.hit = false
    if (mic) {
      mic.an.getByteFrequencyData(mic.freq)
      const hz = mic.ac.sampleRate / mic.an.fftSize
      const band = (lo: number, hi: number) => {
        let sum = 0
        let n = 0
        for (let i = Math.max(1, Math.floor(lo / hz)); i <= Math.min(mic.freq.length - 1, Math.ceil(hi / hz)); i++) {
          sum += mic.freq[i]
          n++
        }
        return n ? sum / n / 255 : 0
      }
      bass = band(30, 160)
      mids = band(300, 2500)
      highs = Math.min(1, band(5000, 14000) * 1.6)
      avg += (bass - avg) * 0.04
      if (bass > avg * 1.2 && bass > 0.3 && t - lastHit > 0.28) {
        s.hit = true
        lastHit = t
        s.beats++
      }
      s.bar = Math.floor(s.beats / 4)
      s.section = 'Listening'
    } else {
      // 32 bars of intro, build, drop and breakdown, looping
      const beatF = (t * BPM) / 60
      const b = Math.floor(beatF)
      const ph = beatF - b
      const bar = Math.floor(b / 4) % 32
      const build = bar < 8 ? 0.3 : bar < 16 ? 0.3 + ((bar - 8 + (b % 4) / 4) / 8) * 0.6 : bar < 28 ? 1 : 0.2
      const kickOn = bar < 28
      bass = kickOn ? Math.exp(-ph * 6) * (bar < 16 ? 0.75 : 1) : 0.05
      highs = bar >= 8 && bar < 28 ? build * (0.3 + 0.6 * Math.exp(-fract(ph + 0.5) * 9)) : 0.06
      mids = 0.2 + 0.55 * build * (0.7 + 0.3 * Math.sin(t * 1.7))
      if (b !== last) {
        last = b
        if (kickOn) {
          s.hit = true
          s.beats = b
        }
      }
      s.bar = bar
      s.section = bar < 8 ? 'Intro' : bar < 16 ? 'Build' : bar < 28 ? 'Drop' : 'Breakdown'
    }
    s.bass += (bass - s.bass) * 0.4
    s.mids += (mids - s.mids) * 0.15
    s.highs += (highs - s.highs) * 0.3
    s.level += (Math.min(1, (bass + mids + highs) / 1.8) - s.level) * 0.05
    return s
  }
}

type MicState = 'off' | 'starting' | 'on' | 'denied'

function useMic() {
  const ref = useRef<Mic | null>(null)
  const [state, setState] = useState<MicState>('off')
  useEffect(
    () => () => {
      ref.current?.stream.getTracks().forEach((tr) => tr.stop())
      void ref.current?.ac.close()
    },
    [],
  )
  const toggle = async () => {
    if (ref.current) {
      ref.current.stream.getTracks().forEach((tr) => tr.stop())
      void ref.current.ac.close()
      ref.current = null
      setState('off')
      return
    }
    try {
      setState('starting')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } })
      const ac = new AudioContext()
      const an = ac.createAnalyser()
      an.fftSize = 1024
      an.smoothingTimeConstant = 0.6
      ac.createMediaStreamSource(stream).connect(an)
      ref.current = { an, freq: new Uint8Array(an.frequencyBinCount), stream, ac }
      setState('on')
    } catch {
      setState('denied')
    }
  }
  return { ref, state, toggle }
}

function MicButton({ mic }: { mic: ReturnType<typeof useMic> }) {
  return (
    <button className={`mic ${mic.state === 'on' ? 'is-on' : ''}`} onClick={mic.toggle} disabled={mic.state === 'starting'}>
      <i aria-hidden />
      {mic.state === 'on' ? 'Stop listening' : mic.state === 'denied' ? 'Microphone blocked' : 'Use my microphone'}
    </button>
  )
}

/* ─────────────── Header: sound → data → motion → environment ─────────────── */

const WORDS = ['Sound', 'Data', 'Motion', 'Environment']

const makeHero = (): Draw => {
  const fb = document.createElement('canvas')
  const listen = makeListener()
  let spin = 0
  let fx = 0.5
  let fy = 0.5
  return ({ c, w, h, t, dt, dpr, pointer }) => {
    if (fb.width !== w || fb.height !== h) Object.assign(fb, { width: w, height: h })
    const a = listen(t, null)
    c.fillStyle = '#000'
    c.fillRect(0, 0, w, h)
    // the last frame, pushed outwards and turned: feedback gives the image its recursive depth
    fx += ((pointer.active ? pointer.x : 0.5 + 0.08 * Math.sin(t * 0.21)) - fx) * 0.05
    fy += ((pointer.active ? pointer.y : 0.5 + 0.06 * Math.cos(t * 0.17)) - fy) * 0.05
    const cx = fx * w
    const cy = fy * h
    const z = 1.03 + a.bass * 0.025
    c.save()
    c.globalAlpha = 0.85
    c.translate(cx, cy)
    c.rotate(0.01 + a.bass * 0.012)
    c.scale(z, z)
    c.translate(-cx, -cy)
    c.drawImage(fb, 0, 0)
    c.restore()
    // a knotted structure: pushed by the bass, frayed by the highs
    spin += dt * (0.22 + a.mids * 0.25)
    const proj = camera({
      cx: w / 2,
      cy: h / 2,
      scale: Math.min(w, h) * 0.15,
      yaw: spin,
      pitch: 0.55 + 0.25 * Math.sin(t * 0.11),
      persp: 9,
    })
    c.strokeStyle = 'rgba(246,243,236,0.95)'
    c.lineWidth = 1.2 * dpr
    c.beginPath()
    const N = 480
    for (let i = 0; i <= N; i++) {
      const u = (i / N) * Math.PI * 2
      const r = 1.55 + 0.55 * Math.cos(3 * u) + a.bass * 0.3 * Math.sin(7 * u + t * 2)
      const j = a.highs * 0.07 * Math.sin(i * 91.7 + t * 37)
      const [x, y] = proj([r * Math.cos(2 * u) + j, 0.75 * Math.sin(3 * u) - j, r * Math.sin(2 * u)])
      if (i) c.lineTo(x, y)
      else c.moveTo(x, y)
    }
    c.stroke()
    const g = fb.getContext('2d')!
    g.clearRect(0, 0, w, h)
    g.drawImage(c.canvas, 0, 0)
    // the caption isn't fed back
    const k = Math.floor(t / 2.2) % WORDS.length
    if (w / dpr < 520) {
      // too narrow for the whole chain: one word at a time
      tag(c, `${k + 1}/4 · ${WORDS[k]}`, w / 2, h - 16 * dpr, dpr, 0.95, 'center', BRASS)
    } else
      WORDS.forEach((word, i) => {
        const x = w * (0.14 + i * 0.24)
        tag(c, word, x, h - 16 * dpr, dpr, i === k ? 0.95 : 0.3, 'center', i === k ? BRASS : INK)
        if (i < 3) tag(c, '→', x + w * 0.12, h - 16 * dpr, dpr, 0.25, 'center')
      })
    tag(c, pointer.active ? 'Steering the feedback' : 'Move to steer the feedback', w / 2, 22 * dpr, dpr, 0.4, 'center')
  }
}

export const VisualsHero = () => <Stage make={makeHero} className="vis-scene vis-scene--hero" />

/* ─────────────── The wall is just the beginning: four surfaces ─────────────── */

export type Surface = 'wall' | 'mesh' | 'scrim' | 'haze'

const SURFACES: { id: Surface; name: string; note: string }[] = [
  { id: 'wall', name: 'Textured wall', note: 'A textured wall turns simple geometry into something that feels architectural.' },
  {
    id: 'mesh',
    name: 'Suspended mesh',
    note: 'A suspended net breaks the image into fragments; what passes through lands, larger and softer, on the wall behind.',
  },
  {
    id: 'scrim',
    name: 'Translucent screen',
    note: 'A translucent screen holds the image and lets it through, so it lives at two depths between the viewer and the wall.',
  },
  {
    id: 'haze',
    name: 'Atmosphere',
    note: 'In haze the light itself becomes visible: the image is drawn through the air on its way to the wall.',
  },
]

const PJ: V3 = [0, 2.7, -5] // the projector, hung in front of the screen
const BACK = 2.6 // depth of the wall behind a mesh or screen

/** Where a point sits in the projected image: -1 → 1 across the screen plane (z = 0). */
function toImage(x: number, y: number, z: number) {
  const s = -PJ[2] / (z - PJ[2])
  return [(PJ[0] + (x - PJ[0]) * s) / 2, (PJ[1] + (y - PJ[1]) * s - 1.8) / 1.2] as const
}

function surfaceImage(u: number, v: number, t: number) {
  if (Math.abs(u) > 1 || Math.abs(v) > 1) return 0
  const a = t * 0.15
  const ru = u * Math.cos(a) - v * Math.sin(a)
  const rv = u * Math.sin(a) + v * Math.cos(a)
  const sq = Math.max(Math.abs(ru), Math.abs(rv) * 1.4)
  const rings = fract(sq * 4 - t * 0.35) < 0.42 ? 1 : 0
  const band = Math.exp(-(((u + v * 0.5 - Math.sin(t * 0.5) * 1.3) * 3) ** 2))
  return Math.min(1, rings * 0.8 + band * 0.55)
}

const makeSurface = (ctl: { current: Surface }): Draw => {
  let yaw = -0.55
  return ({ c, w, h, t, dpr, pointer }) => {
    const mode = ctl.current
    if (pointer.down) yaw = Math.max(-1.3, Math.min(1.3, yaw + pointer.dx * 2.6))
    else yaw += (-0.55 + 0.18 * Math.sin(t * 0.12) - yaw) * 0.004
    const proj = camera({ cx: w / 2, cy: h * 0.66, scale: Math.min(w, h * 1.5) / 9.5, yaw, pitch: 0.2, persp: 16 })
    const P = (x: number, y: number, z: number) => proj([x, y - 1.6, z])
    // floor
    c.strokeStyle = `${INK}0.06)`
    c.lineWidth = dpr
    c.beginPath()
    for (let x = -5; x <= 5; x += 1) {
      const a = P(x, 0, -6)
      const b = P(x, 0, BACK)
      c.moveTo(a[0], a[1])
      c.lineTo(b[0], b[1])
    }
    for (let z = -6; z <= BACK; z += 1) {
      const a = P(-5, 0, z)
      const b = P(5, 0, z)
      c.moveTo(a[0], a[1])
      c.lineTo(b[0], b[1])
    }
    c.stroke()

    // the wall behind (every surface but the textured wall, which is the wall)
    if (mode !== 'wall') {
      const gain = mode === 'haze' ? 0.8 : mode === 'mesh' ? 0.55 : 0.32
      const back = buckets()
      const nx = 64
      const ny = 30
      for (let i = 0; i < nx; i++)
        for (let j = 0; j < ny; j++) {
          const x0 = -4.6 + (i / nx) * 9.2
          const x1 = -4.6 + ((i + 1) / nx) * 9.2
          const y0 = (j / ny) * 4.4
          const y1 = ((j + 1) / ny) * 4.4
          const [u, v] = toImage((x0 + x1) / 2, (y0 + y1) / 2, BACK)
          let val = surfaceImage(u, v, t) * gain
          // the net's shadow breaks up what comes through
          if (mode === 'mesh') {
            const sx = u * 2
            const sy = v * 1.2 + 1.8
            if (Math.abs(sx) < 2 && sy > 0.6 && sy < 3)
              val *= 0.55 + 0.45 * Math.abs(Math.sin((sx + sy) * 19)) * Math.abs(Math.sin((sx - sy) * 19))
          }
          addQuad(back, val, [P(x0, y0, BACK), P(x1, y0, BACK), P(x1, y1, BACK), P(x0, y1, BACK)])
        }
      c.fillStyle = '#0d0d0c'
      c.beginPath()
      ;[P(-4.6, 0, BACK), P(4.6, 0, BACK), P(4.6, 4.4, BACK), P(-4.6, 4.4, BACK)].forEach(([x, y], i) =>
        i ? c.lineTo(x, y) : c.moveTo(x, y),
      )
      c.fill()
      fillBuckets(c, back, mode === 'scrim' ? '225,228,240' : '245,242,235')
    }

    // the surface itself
    if (mode === 'wall') {
      c.fillStyle = '#121110'
      c.beginPath()
      ;[P(-3.8, 0, 0), P(3.8, 0, 0), P(3.8, 3.9, 0), P(-3.8, 3.9, 0)].forEach(([x, y], i) =>
        i ? c.lineTo(x, y) : c.moveTo(x, y),
      )
      c.fill()
      // bricks, each split into a few cells so the image keeps its detail; the mortar stays dark
      const lit = buckets()
      const BW = 0.5
      const BH = 0.24
      const gap = 0.025
      for (let row = 0; row * BH < 3.9; row++) {
        const off = row % 2 ? BW / 2 : 0
        for (let x = -3.8 - off; x < 3.8; x += BW) {
          const tone = 0.7 + 0.3 * hash(row * 31 + Math.round(x * 4))
          const xa = Math.max(-3.8, x + gap)
          const xb = Math.min(3.8, x + BW - gap)
          if (xb <= xa) continue
          for (let sx = 0; sx < 3; sx++)
            for (let sy = 0; sy < 2; sy++) {
              const x0 = xa + ((xb - xa) * sx) / 3
              const x1 = xa + ((xb - xa) * (sx + 1)) / 3
              const y0 = row * BH + gap + ((BH - 2 * gap) * sy) / 2
              const y1 = row * BH + gap + ((BH - 2 * gap) * (sy + 1)) / 2
              const [u, v] = toImage((x0 + x1) / 2, (y0 + y1) / 2, 0)
              addQuad(lit, 0.06 + surfaceImage(u, v, t) * tone * 0.92, [P(x0, y0, 0), P(x1, y0, 0), P(x1, y1, 0), P(x0, y1, 0)])
            }
        }
      }
      fillBuckets(c, lit, '245,240,230')
    } else if (mode === 'mesh') {
      // a diamond net, hung from a bar
      const net = buckets()
      const S = 0.16
      for (const dir of [1, -1])
        for (let k = -40; k <= 40; k++) {
          // the line x - dir·y = k·S, clipped to the net
          for (let y = 0.6; y < 3; y += 0.08) {
            const x0 = k * S + dir * y
            const x1 = k * S + dir * (y + 0.08)
            if (Math.abs(x0) > 2 || Math.abs(x1) > 2) continue
            const [u, v] = toImage((x0 + x1) / 2, y + 0.04, 0)
            addLine(net, 0.12 + surfaceImage(u, v, t) * 0.88, P(x0, y, 0), P(x1, y + 0.08, 0))
          }
        }
      c.lineWidth = 1.1 * dpr
      fillBuckets(c, net, '250,247,240', 1, true)
      c.strokeStyle = `${INK}0.35)`
      c.lineWidth = 2 * dpr
      c.beginPath()
      const a = P(-2.1, 3.05, 0)
      const b = P(2.1, 3.05, 0)
      c.moveTo(a[0], a[1])
      c.lineTo(b[0], b[1])
      for (const x of [-1.9, 1.9]) {
        const p = P(x, 3.05, 0)
        const q = P(x, 4.4, 0)
        c.moveTo(p[0], p[1])
        c.lineTo(q[0], q[1])
      }
      c.lineWidth = dpr
      c.stroke()
    } else if (mode === 'scrim') {
      const scr = buckets()
      const nx = 40
      const ny = 24
      for (let i = 0; i < nx; i++)
        for (let j = 0; j < ny; j++) {
          const x0 = -2 + (i / nx) * 4
          const x1 = -2 + ((i + 1) / nx) * 4
          const y0 = 0.6 + (j / ny) * 2.4
          const y1 = 0.6 + ((j + 1) / ny) * 2.4
          const [u, v] = toImage((x0 + x1) / 2, (y0 + y1) / 2, 0)
          addQuad(scr, 0.08 + surfaceImage(u, v, t) * 0.62, [P(x0, y0, 0), P(x1, y0, 0), P(x1, y1, 0), P(x0, y1, 0)])
        }
      fillBuckets(c, scr, '240,242,250', 0.85)
      c.strokeStyle = `${INK}0.3)`
      c.beginPath()
      ;[P(-2, 0.6, 0), P(2, 0.6, 0), P(2, 3, 0), P(-2, 3, 0)].forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)))
      c.closePath()
      c.stroke()
    } else {
      // haze: rays through the air
      c.globalCompositeOperation = 'lighter'
      const lens = P(PJ[0], PJ[1], PJ[2] + 0.3)
      const rays = buckets()
      for (let i = 0; i < 26; i++)
        for (let j = 0; j < 14; j++) {
          const u = -1 + (i + 0.5) * (2 / 26)
          const v = -1 + (j + 0.5) * (2 / 14)
          const val = surfaceImage(u, v, t)
          if (val < 0.3) continue
          // the point on the back wall that (u, v) reaches
          const s = (BACK - PJ[2]) / -PJ[2]
          const wx = PJ[0] + (u * 2 - PJ[0]) * s
          const wy = PJ[1] + (v * 1.2 + 1.8 - PJ[1]) * s
          addLine(rays, val * 0.5, lens, P(wx, wy, BACK))
        }
      c.lineWidth = 3 * dpr
      fillBuckets(c, rays, '235,232,225', 0.22, true)
      c.globalCompositeOperation = 'source-over'
      for (let i = 0; i < 40; i++) {
        const [x, y] = P(-3 + fract(hash(i) + t * 0.01 * (1 + hash(i + 5))) * 6, 0.4 + hash(i + 9) * 3.6, -4 + hash(i + 3) * 6)
        c.fillStyle = `${INK}0.05)`
        c.fillRect(x, y, 2 * dpr, 2 * dpr)
      }
    }

    // the projector
    const [px, py] = P(PJ[0], PJ[1], PJ[2])
    c.fillStyle = '#1b1a18'
    c.strokeStyle = `${INK}0.5)`
    c.fillRect(px - 12 * dpr, py - 7 * dpr, 24 * dpr, 14 * dpr)
    c.strokeRect(px - 12 * dpr, py - 7 * dpr, 24 * dpr, 14 * dpr)
    c.fillStyle = `${INK}0.9)`
    c.beginPath()
    c.arc(px, py, 3 * dpr, 0, Math.PI * 2)
    c.fill()
    c.strokeStyle = `${INK}0.1)`
    c.beginPath()
    const far = mode === 'wall' ? 0 : mode === 'haze' ? BACK : 0
    for (const [u, v] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      const s = (far - PJ[2]) / -PJ[2]
      const q = P(PJ[0] + (u * 2 - PJ[0]) * s, PJ[1] + (v * 1.2 + 1.8 - PJ[1]) * s, far)
      c.moveTo(px, py)
      c.lineTo(q[0], q[1])
    }
    c.stroke()
    tag(c, SURFACES.find((s) => s.id === mode)!.name, 14 * dpr, 22 * dpr, dpr, 0.75)
    tag(c, 'Drag to look around', w - 14 * dpr, 22 * dpr, dpr, 0.35, 'right')
  }
}

export function SurfaceScene() {
  const [mode, setMode] = useState<Surface>('mesh')
  const ctl = useRef(mode)
  useEffect(() => {
    ctl.current = mode
  }, [mode])
  const make = useMemo(() => () => makeSurface(ctl), [])
  const s = SURFACES.find((x) => x.id === mode)!
  return (
    <div className="scene-panel">
      <div className="scene-tabs" role="tablist" aria-label="Projection surface">
        {SURFACES.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={x.id === mode}
            className={x.id === mode ? 'is-on' : ''}
            onClick={() => setMode(x.id)}
          >
            {x.name}
          </button>
        ))}
      </div>
      <Stage make={make} className="vis-scene vis-scene--surface" />
      <p className="scene-panel__note" aria-live="polite">
        {s.note}
      </p>
    </div>
  )
}

/* ─────────────── Generative: a system with parameters, not a finished video ─────────────── */

type Gen = { sym: number; dist: number; fb: number; parts: number; seed: number }

function rand(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const makeGenerative = (ctl: { current: Gen }): Draw => {
  const fb = document.createElement('canvas')
  let seedNow = -1
  const rule = { a: 3, b: 5, ph: 0, k: 0.6 }
  const target = { ...rule }
  let variation = 0
  let lastVar = 0
  const ps = Array.from({ length: 900 }, (_, i) => ({ x: hash(i) * 2 - 1, y: hash(i + 99) * 2 - 1 }))
  return ({ c, w, h, t, dt, dpr }) => {
    const g = ctl.current
    if (fb.width !== w || fb.height !== h) Object.assign(fb, { width: w, height: h })
    if (g.seed !== seedNow) {
      seedNow = g.seed
      const r = rand(g.seed)
      Object.assign(target, { a: 1 + Math.floor(r() * 5), b: 2 + Math.floor(r() * 6), ph: r() * 6.28, k: 0.35 + r() * 0.6 })
      variation = 0
      lastVar = t
    }
    // the system keeps producing variations of itself
    if (t - lastVar > 5) {
      lastVar = t
      variation++
      target.ph += 0.9
      target.k = 0.35 + fract(target.k + 0.37) * 0.6
    }
    rule.a += (target.a - rule.a) * 0.02
    rule.b += (target.b - rule.b) * 0.02
    rule.ph += (target.ph - rule.ph) * 0.02
    rule.k += (target.k - rule.k) * 0.02

    c.fillStyle = '#000'
    c.fillRect(0, 0, w, h)
    if (g.fb > 0.01) {
      const z = 1 + 0.018 * g.fb
      c.save()
      c.globalAlpha = g.fb * 0.93
      c.translate(w / 2, h / 2)
      c.rotate(0.004)
      c.scale(z, z)
      c.translate(-w / 2, -h / 2)
      c.drawImage(fb, 0, 0)
      c.restore()
    }
    const R = Math.min(w, h) * 0.4
    const cx = w / 2
    const cy = h / 2
    const n = g.sym
    c.strokeStyle = 'rgba(246,243,236,0.9)'
    c.lineWidth = dpr
    c.beginPath()
    for (let k = 0; k < n; k++)
      for (const m of [1, -1]) {
        const rot = (k / n) * Math.PI * 2
        for (let i = 0; i <= 140; i++) {
          const s = i / 140
          let r = R * s
          let th = rule.k * Math.sin(rule.a * s * Math.PI * 2 + t * 0.25 + rule.ph) * (Math.PI / n)
          r += g.dist * R * 0.14 * Math.sin(s * rule.b * Math.PI * 2 - t * 0.9)
          th += g.dist * 0.3 * Math.sin(t * 0.5 + s * 5) * (Math.PI / n)
          const ang = rot + th * m
          const x = cx + Math.cos(ang) * r
          const y = cy + Math.sin(ang) * r
          if (i) c.lineTo(x, y)
          else c.moveTo(x, y)
        }
      }
    c.stroke()
    // particles drift through a field, and the feedback lets them accumulate
    const count = Math.floor(g.parts * ps.length)
    c.fillStyle = 'rgba(214,196,152,0.9)'
    for (let i = 0; i < count; i++) {
      const p = ps[i]
      const ang = Math.sin(p.x * 3 + rule.ph) * Math.cos(p.y * 3 - t * 0.2) * Math.PI * 2
      p.x += Math.cos(ang) * dt * 0.1
      p.y += Math.sin(ang) * dt * 0.1
      if (Math.abs(p.x) > 1.2 || Math.abs(p.y) > 1.2) {
        p.x = hash(i + t) * 2 - 1
        p.y = hash(i * 3 + t) * 2 - 1
      }
      c.fillRect(cx + p.x * R * 1.15, cy + p.y * R * 1.15, 1.4 * dpr, 1.4 * dpr)
    }
    const fx = fb.getContext('2d')!
    fx.clearRect(0, 0, w, h)
    fx.drawImage(c.canvas, 0, 0)
    tag(c, `Seed ${String(g.seed).padStart(4, '0')} · variation ${variation}`, 14 * dpr, 22 * dpr, dpr, 0.7)
    tag(c, `Symmetry ${n} · distortion ${g.dist.toFixed(2)} · feedback ${g.fb.toFixed(2)}`, 14 * dpr, h - 14 * dpr, dpr, 0.45)
  }
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <label className="scene-slider">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
      <span className="scene-slider__v">{step < 1 ? value.toFixed(2) : value}</span>
    </label>
  )
}

export function GenerativeScene() {
  const [g, setG] = useState<Gen>({ sym: 6, dist: 0.35, fb: 0.7, parts: 0.4, seed: 427 })
  const ctl = useRef(g)
  useEffect(() => {
    ctl.current = g
  }, [g])
  const make = useMemo(() => () => makeGenerative(ctl), [])
  const set = (k: keyof Gen) => (v: number) => setG((x) => ({ ...x, [k]: v }))
  return (
    <div className="scene-panel">
      <Stage make={make} className="vis-scene vis-scene--gen" />
      <div className="gen-controls">
        <Slider label="Symmetry" value={g.sym} min={2} max={12} step={1} onChange={set('sym')} />
        <Slider label="Distortion" value={g.dist} min={0} max={1} step={0.01} onChange={set('dist')} />
        <Slider label="Feedback" value={g.fb} min={0} max={0.97} step={0.01} onChange={set('fb')} />
        <Slider label="Particles" value={g.parts} min={0} max={1} step={0.01} onChange={set('parts')} />
      </div>
      <div className="scene-panel__row">
        <p className="scene-panel__note">
          Four parameters and a seed. Change them, or leave it running: every few seconds the system produces a new variation of
          itself.
        </p>
        <button className="mic" onClick={() => setG((x) => ({ ...x, seed: 1 + Math.floor(Math.random() * 9999) }))}>
          New seed
        </button>
      </div>
    </div>
  )
}

/* ─────────────── Audio-reactive: signals mapped to behaviours ─────────────── */

type Link = 'bass' | 'highs' | 'hits' | 'beats' | 'level'

const LINKS: { id: Link; from: string; to: string; note: string }[] = [
  { id: 'bass', from: 'Bass', to: 'Expansion', note: 'Bass energy drives the expansion of the geometric form.' },
  { id: 'highs', from: 'Highs', to: 'Fine particles', note: 'High-frequency activity introduces fine particle movement.' },
  { id: 'hits', from: 'Transients', to: 'Distortion', note: 'Detected transients slice and distort the image.' },
  { id: 'beats', from: 'Beats', to: 'Transitions', note: 'Every eight beats, the form transitions to the next.' },
  { id: 'level', from: 'Intensity', to: 'Density', note: 'The overall intensity of the music sets the density of the scene.' },
]

const FORMS = [48, 3, 4, 6]

const makeAudioVisual = (ctl: { current: { on: Set<Link>; mic: { current: Mic | null } } }): Draw => {
  const listen = makeListener()
  let flash = 0
  let hits = 0
  let form = 0
  let trans = 0
  let pulse = 0
  return ({ c, w, h, t, dt, dpr }) => {
    const { on, mic } = ctl.current
    const a = listen(t, mic.current)
    if (a.hit) {
      flash = 1
      hits++
      pulse = 1
    }
    flash = Math.max(0, flash - dt * 4)
    pulse = Math.max(0, pulse - dt * 3)
    const nextForm = on.has('beats') ? Math.floor(a.beats / 8) % FORMS.length : 0
    if (nextForm !== form) {
      form = nextForm
      trans = 1
    }
    trans = Math.max(0, trans - dt * 1.5)
    c.fillStyle = '#000'
    c.fillRect(0, 0, w, h)

    // the signals
    const values: Record<Link, number> = { bass: a.bass, highs: a.highs, hits: flash, beats: pulse, level: a.level }
    const narrow = w / dpr < 520
    const mx = 14 * dpr
    const mw = w * (narrow ? 0.24 : 0.2)
    const vx = w * (narrow ? 0.73 : 0.7)
    const vy = h * 0.53
    const R = Math.min(w * (narrow ? 0.22 : 0.27), h * 0.4)
    LINKS.forEach((l, i) => {
      const y = h * (0.2 + i * 0.165)
      const live = on.has(l.id)
      tag(c, l.from, mx, y - 7 * dpr, dpr, 0.65)
      c.fillStyle = `${INK}0.08)`
      c.fillRect(mx, y, mw, 5 * dpr)
      c.fillStyle = `${BRASS}0.9)`
      c.fillRect(mx, y, mw * Math.min(1, values[l.id]), 5 * dpr)
      // the wire, from signal to behaviour
      const x0 = mx + mw + 6 * dpr
      const x1 = w * (narrow ? 0.4 : 0.35)
      c.strokeStyle = live ? `${BRASS}0.75)` : `${INK}0.1)`
      c.setLineDash(live ? [] : [3 * dpr, 4 * dpr])
      c.lineWidth = dpr
      c.beginPath()
      c.moveTo(x0, y + 2.5 * dpr)
      c.lineTo(x1, y + 2.5 * dpr)
      c.stroke()
      c.setLineDash([])
      if (live) {
        const u = fract(t * 0.6 + i * 0.2)
        c.fillStyle = `${INK}${0.4 + values[l.id] * 0.6})`
        c.fillRect(x0 + (x1 - x0) * u - 2 * dpr, y, 4 * dpr, 5 * dpr)
      }
      // on a phone the buttons above name the behaviours
      if (!narrow) tag(c, l.to, x1 + 6 * dpr, y + 6 * dpr, dpr, live ? 0.85 : 0.25)
    })

    // the image
    const sides = FORMS[form]
    const rings = on.has('level') ? 4 + Math.round(a.level * 16) : 9
    const scale = on.has('bass') ? 0.72 + a.bass * 0.38 : 0.85
    const glitch = on.has('hits') ? flash : 0
    c.strokeStyle = 'rgba(246,243,236,0.9)'
    c.lineWidth = 1.2 * dpr
    c.beginPath()
    for (let j = 0; j < rings; j++) {
      const rr = (R * scale * (j + 1)) / rings
      const rot = trans * (Math.PI / sides) * (j % 2 ? 1 : -1) + t * 0.05 * (j % 2 ? 1 : -1) - Math.PI / 2
      const steps = sides > 12 ? sides : sides * 10
      for (let i = 0; i <= steps; i++) {
        // points along the polygon's edges
        const e = Math.floor(i / (steps / sides))
        const u = (i - (e * steps) / sides) / (steps / sides)
        const a0 = rot + (e / sides) * Math.PI * 2
        const a1 = rot + ((e + 1) / sides) * Math.PI * 2
        let x = vx + rr * (Math.cos(a0) * (1 - u) + Math.cos(a1) * u)
        const y = vy + rr * (Math.sin(a0) * (1 - u) + Math.sin(a1) * u)
        // a transient slices the image into shifted bands
        if (glitch > 0.05) x += (hash(Math.floor(y / (R * 0.09)) + hits * 7) - 0.5) * glitch * R * 0.35
        if (i) c.lineTo(x, y)
        else c.moveTo(x, y)
      }
    }
    c.stroke()
    if (on.has('highs')) {
      c.fillStyle = `${INK}${0.3 + a.highs * 0.7})`
      for (let i = 0; i < 260; i++) {
        const ang = hash(i) * Math.PI * 2 + t * 0.1
        const rr = R * scale * (0.15 + hash(i + 7) * 0.95)
        const jx = (hash(i + Math.floor(t * 30)) - 0.5) * a.highs * R * 0.12
        const jy = (hash(i * 3 + Math.floor(t * 30)) - 0.5) * a.highs * R * 0.12
        c.fillRect(vx + Math.cos(ang) * rr + jx, vy + Math.sin(ang) * rr + jy, 1.5 * dpr, 1.5 * dpr)
      }
    }
    tag(c, mic.current ? 'Microphone · listening' : `Track · ${a.section} · bar ${a.bar + 1}`, mx, 22 * dpr, dpr, 0.6)
    tag(c, `${a.beats} beats`, w - 14 * dpr, 22 * dpr, dpr, 0.35, 'right')
  }
}

export function AudioVisualScene() {
  const [on, setOn] = useState<Set<Link>>(() => new Set(LINKS.map((l) => l.id)))
  const mic = useMic()
  const ctl = useRef({ on, mic: mic.ref })
  useEffect(() => {
    ctl.current.on = on
  }, [on])
  const make = useMemo(() => () => makeAudioVisual(ctl), [])
  const toggle = (id: Link) =>
    setOn((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  return (
    <div className="scene-panel">
      <div className="scene-tabs scene-tabs--small" role="group" aria-label="Mappings">
        {LINKS.map((l) => (
          <button key={l.id} aria-pressed={on.has(l.id)} className={on.has(l.id) ? 'is-on' : ''} onClick={() => toggle(l.id)}>
            {l.from} → {l.to}
          </button>
        ))}
      </div>
      <Stage make={make} className="vis-scene vis-scene--audio" />
      <div className="scene-panel__row">
        <p className="scene-panel__note">
          Switch a mapping off and that part of the image stops listening. Or play your own music into the microphone.
        </p>
        <MicButton mic={mic} />
      </div>
    </div>
  )
}

/* ─────────────── TouchDesigner: a network you can bypass ─────────────── */

type Fam = 'CHOP' | 'SOP' | 'TOP'
type Op = { id: string; fam: Fam; col: number; row: number; by?: boolean; note: string }

const OPS: Op[] = [
  { id: 'audiodevin1', fam: 'CHOP', col: 0, row: 0, note: 'Audio in: the mixer feed or a microphone.' },
  { id: 'audiospectrum1', fam: 'CHOP', col: 0, row: 1, by: true, note: 'The spectrum, split into bands.' },
  { id: 'trigger1', fam: 'CHOP', col: 0, row: 2, by: true, note: 'Transients become triggers.' },
  { id: 'sphere1', fam: 'SOP', col: 1, row: 0, note: 'Procedural geometry.' },
  { id: 'noise1', fam: 'SOP', col: 1, row: 1, by: true, note: 'Displaces the geometry, driven by the spectrum.' },
  { id: 'noise2', fam: 'TOP', col: 1, row: 2, by: true, note: 'A generated texture.' },
  { id: 'render1', fam: 'TOP', col: 2, row: 0, note: 'Renders the geometry to an image.' },
  { id: 'comp1', fam: 'TOP', col: 2, row: 1, note: 'Layers the render, the texture and the feedback.' },
  { id: 'feedback1', fam: 'TOP', col: 2, row: 2, by: true, note: 'The last frame, fed back in.' },
  { id: 'level1', fam: 'TOP', col: 3, row: 0, by: true, note: 'An inversion on every trigger.' },
  { id: 'out1', fam: 'TOP', col: 3, row: 1, note: 'The output, to the projector.' },
]

const WIRES: [string, string, boolean?][] = [
  ['audiodevin1', 'audiospectrum1'],
  ['audiodevin1', 'trigger1'],
  ['sphere1', 'noise1'],
  ['audiospectrum1', 'noise1', true],
  ['noise1', 'render1'],
  ['render1', 'comp1'],
  ['noise2', 'comp1'],
  ['feedback1', 'comp1'],
  ['comp1', 'feedback1'],
  ['comp1', 'level1'],
  ['trigger1', 'level1', true],
  ['level1', 'out1'],
]

const FAM: Record<Fam, string> = { CHOP: '95,184,112', SOP: '96,140,224', TOP: '160,112,226' }

/** A wireframe sphere, pushed in and out by `disp`. */
function sphere(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  spin: number,
  disp: (lat: number, lon: number) => number,
) {
  const proj = camera({ cx, cy, scale: R, yaw: spin, pitch: 0.35, persp: 6 })
  const at = (lat: number, lon: number): V3 => {
    const r = disp(lat, lon)
    return [Math.cos(lat) * Math.cos(lon) * r, Math.sin(lat) * r, Math.cos(lat) * Math.sin(lon) * r]
  }
  c.beginPath()
  for (let i = 1; i < 8; i++) {
    const lat = -Math.PI / 2 + (i / 8) * Math.PI
    for (let j = 0; j <= 28; j++) {
      const [x, y] = proj(at(lat, (j / 28) * Math.PI * 2))
      if (j) c.lineTo(x, y)
      else c.moveTo(x, y)
    }
  }
  for (let k = 0; k < 12; k++) {
    const lon = (k / 12) * Math.PI * 2
    for (let j = 0; j <= 20; j++) {
      const [x, y] = proj(at(-Math.PI / 2 + (j / 20) * Math.PI, lon))
      if (j) c.lineTo(x, y)
      else c.moveTo(x, y)
    }
  }
  c.stroke()
}

const makeNetwork = (ctl: { current: { by: Set<string>; toggle: (id: string) => void; mic: { current: Mic | null } } }): Draw => {
  const listen = makeListener()
  const O = document.createElement('canvas')
  const F = document.createElement('canvas')
  O.width = O.height = F.width = F.height = 320
  const o = O.getContext('2d')!
  const fctx = F.getContext('2d')!
  // a tileable texture
  const N = document.createElement('canvas')
  N.width = N.height = 64
  const nctx = N.getContext('2d')!
  const img = nctx.createImageData(64, 64)
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      let v = 0
      for (let k = 0; k < 5; k++) {
        const kx = Math.round(hash(k) * 6) - 3
        const ky = Math.round(hash(k + 11) * 6) - 3
        v += Math.sin(((kx * x + ky * y) / 64) * Math.PI * 2 + hash(k + 3) * 6) / 5
      }
      const g = Math.round(128 + v * 250)
      img.data.set([g, g, g, 255], (y * 64 + x) * 4)
    }
  nctx.putImageData(img, 0, 0)
  let flash = 0
  let spin = 0
  let wasDown = false
  const trig: number[] = []
  return ({ c, w, h, t, dt, dpr, pointer }) => {
    const { by, toggle, mic } = ctl.current
    const a = listen(t, mic.current)
    if (a.hit && !by.has('trigger1')) flash = 1
    flash = Math.max(0, flash - dt * 5)
    trig.push(by.has('trigger1') ? 0 : flash)
    if (trig.length > 40) trig.shift()
    spin += dt * 0.35
    const audio = !by.has('audiospectrum1')
    const amount = by.has('noise1') ? 0 : audio ? 0.08 + a.bass * 0.4 : 0.1
    const disp = (lat: number, lon: number) => 1 + amount * Math.sin(lat * 4 + t * 2) * Math.cos(lon * 3 - t * 1.3)

    // the network's output, built up in the order the operators run
    o.globalAlpha = 1
    o.globalCompositeOperation = 'source-over'
    o.fillStyle = '#000'
    o.fillRect(0, 0, 320, 320)
    if (!by.has('feedback1')) {
      o.save()
      o.globalAlpha = 0.86
      o.translate(160, 160)
      o.rotate(0.02)
      o.scale(1.045, 1.045)
      o.drawImage(F, -160, -160)
      o.restore()
    }
    if (!by.has('noise2')) {
      o.globalAlpha = 0.22
      const s = (t * 12) % 64
      for (let x = -64; x < 320; x += 64) for (let y = -64; y < 320; y += 64) o.drawImage(N, x + s, y + s * 0.5)
      o.globalAlpha = 1
    }
    o.strokeStyle = 'rgba(248,246,240,0.95)'
    o.lineWidth = 1.3
    sphere(o, 160, 160, 95, spin, disp)
    fctx.clearRect(0, 0, 320, 320)
    fctx.drawImage(O, 0, 0)
    if (!by.has('level1') && flash > 0.05) {
      o.globalCompositeOperation = 'difference'
      o.fillStyle = `rgba(255,255,255,${flash})`
      o.fillRect(0, 0, 320, 320)
      o.globalCompositeOperation = 'source-over'
    }

    // the network editor
    c.fillStyle = '#1c1c1c'
    c.fillRect(0, 0, w, h)
    c.fillStyle = 'rgba(255,255,255,0.035)'
    for (let x = 12 * dpr; x < w; x += 18 * dpr) for (let y = 12 * dpr; y < h; y += 18 * dpr) c.fillRect(x, y, dpr, dpr)
    const bw = w * 0.2
    const bh = h * 0.24
    const box = (op: Op) => {
      const x = w * 0.025 + op.col * w * 0.245
      const y = h * 0.04 + op.row * h * 0.3
      return op.id === 'out1' ? { x, y, w: bw, h: h * 0.54 } : { x, y, w: bw, h: bh }
    }
    const byId = (id: string) => OPS.find((op) => op.id === id)!
    // click to bypass
    if (pointer.down && !wasDown) {
      const hit = OPS.find((op) => {
        const b = box(op)
        return op.by && pointer.x * w > b.x && pointer.x * w < b.x + b.w && pointer.y * h > b.y && pointer.y * h < b.y + b.h
      })
      if (hit) toggle(hit.id)
    }
    wasDown = pointer.down
    // wires
    WIRES.forEach(([from, to, exp], k) => {
      const A = box(byId(from))
      const B = box(byId(to))
      const back = B.x <= A.x
      const x0 = A.x + A.w
      const y0 = A.y + A.h / 2
      const x1 = B.x
      const y1 = B.y + B.h / 2
      const dead = by.has(from)
      c.strokeStyle = exp ? `rgba(${FAM.CHOP},${dead ? 0.2 : 0.7})` : `rgba(${FAM[byId(from).fam]},${dead ? 0.2 : 0.75})`
      c.setLineDash(exp ? [4 * dpr, 4 * dpr] : [])
      c.lineWidth = 1.4 * dpr
      c.beginPath()
      c.moveTo(x0, y0)
      if (back) {
        // the feedback loop runs back round the outside
        c.bezierCurveTo(x0 + 30 * dpr, y0, x0 + 30 * dpr, B.y + B.h + 10 * dpr, (x0 + x1) / 2, B.y + B.h + 10 * dpr)
        c.bezierCurveTo(x1 - 30 * dpr, B.y + B.h + 10 * dpr, x1 - 30 * dpr, y1, x1, y1)
      } else {
        const mxw = (x0 + x1) / 2
        c.bezierCurveTo(mxw, y0, mxw, y1, x1, y1)
      }
      c.stroke()
      c.setLineDash([])
      if (!dead && !back) {
        const u = fract(t * 0.5 + k * 0.17)
        const iu = 1 - u
        const mxw = (x0 + x1) / 2
        const px = iu ** 3 * x0 + 3 * iu * iu * u * mxw + 3 * iu * u * u * mxw + u ** 3 * x1
        const py = iu ** 3 * y0 + 3 * iu * iu * u * y0 + 3 * iu * u * u * y1 + u ** 3 * y1
        c.fillStyle = 'rgba(255,255,255,0.8)'
        c.fillRect(px - 1.5 * dpr, py - 1.5 * dpr, 3 * dpr, 3 * dpr)
      }
    })
    // operators
    let hover: Op | undefined
    OPS.forEach((op) => {
      const b = box(op)
      const off = by.has(op.id)
      const over =
        pointer.active && pointer.x * w > b.x && pointer.x * w < b.x + b.w && pointer.y * h > b.y && pointer.y * h < b.y + b.h
      if (over) hover = op
      const strip = 15 * dpr
      c.fillStyle = '#111'
      c.fillRect(b.x, b.y, b.w, b.h)
      // the viewer
      const vx = b.x + 3 * dpr
      const vy = b.y + 3 * dpr
      const vw = b.w - 6 * dpr
      const vh = b.h - strip - 6 * dpr
      c.save()
      c.beginPath()
      c.rect(vx, vy, vw, vh)
      c.clip()
      c.fillStyle = '#000'
      c.fillRect(vx, vy, vw, vh)
      c.strokeStyle = 'rgba(248,246,240,0.85)'
      c.lineWidth = dpr
      const mid = vy + vh / 2
      switch (op.id) {
        case 'audiodevin1': {
          c.strokeStyle = `rgba(${FAM.CHOP},0.95)`
          c.beginPath()
          for (let i = 0; i <= 60; i++) {
            const y =
              (a.bass * Math.sin(i * 0.3 + t * 20) +
                a.highs * 0.4 * Math.sin(i * 2.1 + t * 50) +
                a.mids * 0.5 * Math.sin(i * 0.9 + t * 31)) *
              vh *
              0.4
            if (i) c.lineTo(vx + (i / 60) * vw, mid + y)
            else c.moveTo(vx, mid + y)
          }
          c.stroke()
          break
        }
        case 'audiospectrum1':
          c.fillStyle = `rgba(${FAM.CHOP},0.9)`
          for (let i = 0; i < 20; i++) {
            const band = i < 5 ? a.bass : i < 13 ? a.mids : a.highs
            const v = Math.min(1, band * (0.75 + 0.35 * hash(i + Math.floor(t * 14))))
            c.fillRect(vx + (i / 20) * vw + dpr, vy + vh * (1 - v), vw / 20 - 2 * dpr, vh * v)
          }
          break
        case 'trigger1':
          c.strokeStyle = `rgba(${FAM.CHOP},0.95)`
          c.beginPath()
          trig.forEach((v, i) => {
            const x = vx + (i / 39) * vw
            const y = vy + vh * (0.85 - v * 0.7)
            if (i) c.lineTo(x, y)
            else c.moveTo(x, y)
          })
          c.stroke()
          break
        case 'sphere1':
          sphere(c, vx + vw / 2, mid, vh * 0.36, spin, () => 1)
          break
        case 'noise1':
        case 'render1':
          sphere(c, vx + vw / 2, mid, vh * 0.36, spin, disp)
          break
        case 'noise2': {
          const s = ((t * 12) % 64) * (vw / 120)
          c.globalAlpha = 0.9
          for (let x = -vw; x < vw * 2; x += vw / 2) c.drawImage(N, vx + x + s, vy, vw / 2, vh)
          c.globalAlpha = 1
          break
        }
        case 'comp1':
          c.drawImage(F, vx + (vw - vh) / 2, vy, vh, vh)
          break
        case 'feedback1':
          c.drawImage(F, 40, 40, 240, 240, vx + (vw - vh) / 2, vy, vh, vh)
          break
        default: {
          const s = Math.min(vw, vh)
          c.drawImage(O, vx + (vw - s) / 2, vy + (vh - s) / 2, s, s)
        }
      }
      if (off) {
        c.fillStyle = 'rgba(28,28,28,0.75)'
        c.fillRect(vx, vy, vw, vh)
        c.strokeStyle = 'rgba(255,214,90,0.35)'
        c.beginPath()
        for (let x = -vh; x < vw; x += 9 * dpr) {
          c.moveTo(vx + x, vy + vh)
          c.lineTo(vx + x + vh, vy)
        }
        c.stroke()
      }
      c.restore()
      c.strokeStyle = off ? 'rgba(255,214,90,0.7)' : `rgba(${FAM[op.fam]},${over ? 1 : 0.65})`
      c.lineWidth = (over ? 2 : 1) * dpr
      c.strokeRect(b.x, b.y, b.w, b.h)
      c.fillStyle = `rgba(${FAM[op.fam]},0.25)`
      c.fillRect(b.x, b.y + b.h - strip, b.w, strip)
      c.font = font(Math.max(9, Math.min(11.5, w / dpr / 62)), dpr, 600)
      c.textAlign = 'left'
      c.fillStyle = off ? 'rgba(255,214,90,0.9)' : 'rgba(240,237,229,0.9)'
      c.fillText(off ? `${op.id} · bypass` : op.id, b.x + 5 * dpr, b.y + b.h - 4 * dpr, b.w - 10 * dpr)
      if (b.w / dpr > 120) {
        c.fillStyle = `rgba(${FAM[op.fam]},0.95)`
        c.textAlign = 'right'
        c.fillText(op.fam, b.x + b.w - 5 * dpr, b.y + b.h - 4 * dpr)
      }
    })
    const note = hover ? `${hover.id}: ${hover.note}${hover.by ? ' Click to bypass.' : ''}` : 'Click an operator to bypass it.'
    const ob = box(byId('out1'))
    c.font = font(11.5, dpr, 500)
    c.fillStyle = `${INK}0.75)`
    c.textAlign = 'left'
    c.fillText(note, w * 0.025, h - 8 * dpr, ob.x - w * 0.05)
  }
}

export function NetworkScene() {
  const [by, setBy] = useState<Set<string>>(() => new Set())
  const mic = useMic()
  const toggle = (id: string) =>
    setBy((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const ctl = useRef({ by, toggle, mic: mic.ref })
  useEffect(() => {
    ctl.current.by = by
  }, [by])
  const make = useMemo(() => () => makeNetwork(ctl), [])
  return (
    <div className="scene-panel">
      <Stage make={make} className="vis-scene vis-scene--td" />
      <div className="scene-tabs scene-tabs--small" role="group" aria-label="Bypass operators">
        {OPS.filter((op) => op.by).map((op) => (
          <button key={op.id} aria-pressed={by.has(op.id)} className={by.has(op.id) ? '' : 'is-on'} onClick={() => toggle(op.id)}>
            {op.id}
          </button>
        ))}
      </div>
      <div className="scene-panel__row">
        <p className="scene-panel__note">
          A simplified network in the style of TouchDesigner: audio analysis (CHOPs, green) drives geometry (SOPs, blue), rendered
          and layered as images (TOPs, purple). Bypass an operator and watch what the output loses.
        </p>
        <MicButton mic={mic} />
      </div>
    </div>
  )
}

/* ─────────────── AI-assisted: from an idea to a running shader ─────────────── */

type Idea = 'rings' | 'fold' | 'tunnel' | 'cells'
type Shade = (x: number, y: number, t: number, bass: number) => number

const IDEAS: { id: Idea; prompt: string; draft: string; built: string }[] = [
  {
    id: 'rings',
    prompt: 'Concentric rings that break into fragments when the bass hits',
    draft: `float r = length(uv);
float a = atan(uv.y, uv.x);
float seg = floor((a + PI) / TAU * 16.0);
float off = hash(seg) * 0.15 * step(0.0, sin(time * 3.0));
float v = step(0.5, fract(r * 7.0 - time * 0.8 + off));
gl_FragColor = vec4(vec3(v), 1.0);`,
    built: `uniform float uBass;   // bass energy, smoothed 0–1
uniform float uSpeed;  // 0.25, set at the desk
float r = length(uv);
float a = atan(uv.y, uv.x);
float seg = floor((a + PI) / TAU * 16.0);
float off = hash(seg) * 0.25 * uBass;  // fragments open on the kick
float f = fract(r * 7.0 - time * uSpeed + off);
float v = smoothstep(0.46, 0.5, f) - smoothstep(0.96, 1.0, f);
gl_FragColor = vec4(vec3(v * (1.0 - r * 0.55)), 1.0);`,
  },
  {
    id: 'fold',
    prompt: 'A grid folding like fabric in a slow wind',
    draft: `float y = uv.y + sin(uv.x * 2.6 + time * 1.5) * 0.3;
vec2 g = abs(fract(vec2(uv.x, y) * 6.0) - 0.5);
float v = step(min(g.x, g.y), 0.05);
gl_FragColor = vec4(vec3(v), 1.0);`,
    built: `uniform float uBass;  // bass energy, smoothed 0–1
float wave = sin(uv.x * 2.6 + time * 0.5);
float y = uv.y + wave * (0.18 + uBass * 0.12);  // the wind picks up with the music
vec2 g = abs(fract(vec2(uv.x, y) * 6.0) - 0.5);
float line = 1.0 - smoothstep(0.02, 0.06, min(g.x, g.y));
float light = 0.55 + 0.45 * cos(uv.x * 2.6 + time * 0.5);  // light across the folds
gl_FragColor = vec4(vec3(line * light), 1.0);`,
  },
  {
    id: 'tunnel',
    prompt: 'An endless black-and-white tunnel, slowly turning',
    draft: `float r = length(uv);
float a = atan(uv.y, uv.x) / TAU;
vec2 p = vec2(0.6 / r - time * 1.4, a * 8.0);
float v = mod(floor(p.x * 2.0) + floor(p.y), 2.0);
gl_FragColor = vec4(vec3(v), 1.0);`,
    built: `uniform float uSpeed;  // 0.35
float r = length(uv);
float a = atan(uv.y, uv.x) / TAU;
float z = 0.6 / r;
vec2 p = vec2(z - time * uSpeed, a * 12.0 + time * 0.05 + z * 0.15);  // a slow twist
float v = mod(floor(p.x * 2.0) + floor(p.y), 2.0);
gl_FragColor = vec4(vec3(v * min(1.0, r * 1.4)), 1.0);  // depth fades to black`,
  },
  {
    id: 'cells',
    prompt: 'Cells spreading like lichen across metal',
    draft: `vec2 f = voronoi(uv * 3.0, time);   // nearest, second nearest
float v = step(f.y - f.x, 0.08);
gl_FragColor = vec4(vec3(v), 1.0);`,
    built: `uniform float uBass;  // bass energy, smoothed 0–1
vec2 f = voronoi(uv * 3.0, time * 0.3);
float edge = f.y - f.x;
float grow = 0.55 + 0.25 * sin(time * 0.3) + uBass * 0.15;  // the colony breathes
float metal = 0.85 - f.x * 0.6;
float v = edge < 0.05 ? 0.15 : (f.x < grow * 0.6 ? metal : 0.08);
gl_FragColor = vec4(vec3(v), 1.0);`,
  },
]

const SHADERS: Record<Idea, (built: boolean) => Shade> = {
  rings: (built) => (x, y, t, b) => {
    const r = Math.hypot(x, y)
    const a = Math.atan2(y, x)
    const seg = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 16)
    const off = built ? hash(seg) * 0.25 * b : hash(seg) * 0.15 * (Math.sin(t * 3) > 0 ? 1 : 0)
    const f = fract(r * 7 - t * (built ? 0.25 : 0.8) + off)
    return built ? (smooth(0.46, 0.5, f) - smooth(0.96, 1, f)) * Math.max(0, 1 - r * 0.55) : f > 0.5 ? 1 : 0
  },
  fold: (built) => (x, y, t, b) => {
    const wave = Math.sin(x * 2.6 + t * (built ? 0.5 : 1.5))
    const yy = y + wave * (built ? 0.18 + b * 0.12 : 0.3)
    const line = Math.min(Math.abs(fract(x * 6) - 0.5), Math.abs(fract(yy * 6) - 0.5))
    if (!built) return line < 0.05 ? 1 : 0
    return (1 - smooth(0.02, 0.06, line)) * (0.55 + 0.45 * Math.cos(x * 2.6 + t * 0.5))
  },
  tunnel: (built) => (x, y, t) => {
    const r = Math.hypot(x, y) + 1e-3
    const a = Math.atan2(y, x) / (Math.PI * 2)
    const z = 0.6 / r
    const u = z - t * (built ? 0.35 : 1.4)
    const v = built ? a * 12 + t * 0.05 + z * 0.15 : a * 8
    const check = (Math.floor(u * 2) + Math.floor(v)) & 1
    return built ? check * Math.min(1, r * 1.4) : check
  },
  cells: (built) => (x, y, t, b) => {
    const sx = x * 3
    const sy = y * 3
    const ix = Math.floor(sx)
    const iy = Math.floor(sy)
    let f1 = 9
    let f2 = 9
    const tt = t * (built ? 0.3 : 1)
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) {
        const cx = ix + dx
        const cy = iy + dy
        const h1 = hash(cx * 17.3 + cy * 91.1)
        const h2 = hash(cx * 53.7 + cy * 13.9)
        const px = cx + 0.5 + 0.4 * Math.sin(tt + h1 * 6.28)
        const py = cy + 0.5 + 0.4 * Math.cos(tt * 0.8 + h2 * 6.28)
        const d = Math.hypot(sx - px, sy - py)
        if (d < f1) {
          f2 = f1
          f1 = d
        } else if (d < f2) f2 = d
      }
    const edge = f2 - f1
    if (!built) return edge < 0.08 ? 1 : 0
    const grow = 0.55 + 0.25 * Math.sin(t * 0.3) + b * 0.15
    return edge < 0.05 ? 0.15 : f1 < grow * 0.6 ? 0.85 - f1 * 0.6 : 0.08
  },
}

const makeAi = (ctl: { current: { idea: Idea; built: boolean } }): Draw => {
  let pix = makePixels(150, 150)
  const listen = makeListener()
  return ({ c, w, h, t, dpr }) => {
    const { idea, built } = ctl.current
    const a = listen(t, null)
    const shade = SHADERS[idea](built)
    // the image keeps the canvas's proportions, about 150 pixels tall
    const aspect = w / h
    if (Math.abs(pix.W / pix.H - aspect) > 0.02) pix = makePixels(Math.round(150 * aspect), 150)
    const { d, W, H } = pix
    for (let j = 0; j < H; j++)
      for (let i = 0; i < W; i++) {
        const v = shade(((i / W) * 2 - 1) * aspect, (j / H) * 2 - 1, t, a.bass)
        const g = Math.max(0, Math.min(255, v * 245))
        const k = (j * W + i) * 4
        d[k] = g
        d[k + 1] = g * 0.985
        d[k + 2] = g * 0.95
        d[k + 3] = 255
      }
    pix.flush()
    c.imageSmoothingEnabled = true
    c.drawImage(pix.cv, 0, 0, w, h)
    c.fillStyle = 'rgba(0,0,0,0.55)'
    c.fillRect(0, 0, w, 32 * dpr)
    tag(c, built ? 'Engineered · live' : 'AI draft', 12 * dpr, 20 * dpr, dpr, 0.85, 'left', built ? BRASS : INK)
    if (built) tag(c, `uBass ${a.bass.toFixed(2)}`, w - 12 * dpr, 20 * dpr, dpr, 0.7, 'right')
  }
}

function Typed({ text }: { text: string }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setN((k) => (k >= text.length ? k : k + 4)), 16)
    return () => window.clearInterval(id)
  }, [text])
  return (
    <code>
      {text.slice(0, n)}
      {n < text.length && <span className="ai__caret" aria-hidden />}
    </code>
  )
}

export function AiScene() {
  const [idea, setIdea] = useState<Idea>('rings')
  const [built, setBuilt] = useState(true)
  const ctl = useRef({ idea, built })
  useEffect(() => {
    ctl.current = { idea, built }
  }, [idea, built])
  const make = useMemo(() => () => makeAi(ctl), [])
  const it = IDEAS.find((x) => x.id === idea)!
  return (
    <div className="scene-panel ai">
      <div className="scene-tabs scene-tabs--small" role="tablist" aria-label="Idea">
        {IDEAS.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={x.id === idea}
            className={x.id === idea ? 'is-on' : ''}
            onClick={() => setIdea(x.id)}
          >
            {x.prompt.split(' ').slice(0, 3).join(' ')}…
          </button>
        ))}
      </div>
      <p className="ai__prompt">
        <span className="label">Idea</span>“{it.prompt}”
      </p>
      <div className="ai__body">
        <div className="ai__code">
          <div className="scene-switch" role="tablist" aria-label="Stage">
            <button role="tab" aria-selected={!built} className={!built ? 'is-on' : ''} onClick={() => setBuilt(false)}>
              AI draft
            </button>
            <button role="tab" aria-selected={built} className={built ? 'is-on' : ''} onClick={() => setBuilt(true)}>
              Engineered
            </button>
          </div>
          <pre aria-label="Shader code">
            <Typed key={`${idea}-${built}`} text={built ? it.built : it.draft} />
          </pre>
        </div>
        <Stage make={make} className="vis-scene vis-scene--ai" />
      </div>
      <p className="scene-panel__note" aria-live="polite">
        {built
          ? 'Refined by hand: smooth edges, a calmer tempo, and parameters exposed so the music and the operator can drive them.'
          : 'A quick first pass from an idea. It runs, but it’s hard-edged, hurried and deaf to the music.'}
      </p>
    </div>
  )
}

/* ─────────────── Abstraction: precision against unpredictability ─────────────── */

type Tone = 'mono' | 'metal' | 'brass'

const makeAbstract = (ctl: { current: { chaos: number; tone: Tone } }): Draw => {
  let chaos = 0.3
  return ({ c, w, h, t, dpr }) => {
    const { tone } = ctl.current
    chaos += (ctl.current.chaos - chaos) * 0.06
    c.fillStyle = '#000'
    c.fillRect(0, 0, w, h)
    const N = 44
    const M = 150
    const cx = w * (0.5 + 0.1 * Math.sin(t * 0.07))
    const cy = h * (0.5 + 0.08 * Math.cos(t * 0.09))
    const R = Math.min(w, h) * 0.34
    const line = (i: number) => {
      const y0 = h * (-0.1 + (1.2 * i) / (N - 1))
      const pts: number[] = []
      for (let j = 0; j < M; j++) {
        const x = (w * j) / (M - 1)
        const d = Math.hypot(x - cx, y0 - cy) / R
        // precision: a lens that bends the lines into a sphere
        const lens = d < 1.3 ? 1 - smooth(0, 1.3, d) : 0
        let y = y0 + (y0 - cy) * lens * (0.55 + 0.1 * Math.sin(t * 0.4))
        // unpredictability: a slow flow, and blocks that slide out of line
        const u = x / w
        y += chaos * h * 0.05 * Math.sin(u * 9 + t * 0.3 + i * 0.4) * Math.cos(u * 14 - t * 0.21 + i * 0.23)
        const blk = Math.floor(j / 12)
        const gate = hash(blk * 7 + Math.floor(i / 3) * 13)
        if (gate < chaos * 0.5) y += Math.sin(t * 0.5 + gate * 40) * chaos * h * 0.07
        pts.push(x, y)
      }
      return pts
    }
    let fill: string | CanvasGradient = '#f3f0e9'
    if (tone !== 'mono') {
      const g = c.createLinearGradient(0, 0, w, h)
      const stops =
        tone === 'metal'
          ? ['#55585c', '#eef0f2', '#76797d', '#f8f9fa', '#45474a']
          : ['#5f4e2e', '#e6cf96', '#86704a', '#f0dcaa', '#4d3f25']
      stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s))
      fill = g
    }
    c.fillStyle = fill
    let prev = line(0)
    for (let i = 1; i < N; i++) {
      const next = line(i)
      if (i % 2) {
        c.beginPath()
        for (let j = 0; j < M; j++) c[j ? 'lineTo' : 'moveTo'](prev[j * 2], prev[j * 2 + 1])
        for (let j = M - 1; j >= 0; j--) c.lineTo(next[j * 2], next[j * 2 + 1])
        c.closePath()
        c.fill()
      }
      prev = next
    }
    tag(
      c,
      chaos < 0.33 ? 'Precise' : chaos < 0.66 ? 'Deforming' : 'Unpredictable',
      14 * dpr,
      h - 14 * dpr,
      dpr,
      0.6,
      'left',
      BRASS,
    )
  }
}

export function AbstractScene() {
  const [chaos, setChaos] = useState(0.3)
  const [tone, setTone] = useState<Tone>('mono')
  const ctl = useRef({ chaos, tone })
  useEffect(() => {
    ctl.current = { chaos, tone }
  }, [chaos, tone])
  const make = useMemo(() => () => makeAbstract(ctl), [])
  return (
    <div className="scene-panel">
      <div className="scene-bar">
        <div className="scene-switch" role="tablist" aria-label="Palette">
          {(
            [
              ['mono', 'Black & white'],
              ['metal', 'Metallic'],
              ['brass', 'Restrained'],
            ] as [Tone, string][]
          ).map(([id, name]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tone === id}
              className={tone === id ? 'is-on' : ''}
              onClick={() => setTone(id)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      <Stage make={make} className="vis-scene vis-scene--abstract" />
      <label className="scene-slider">
        <span>Precision</span>
        <input type="range" min={0} max={1} step={0.01} value={chaos} onChange={(e) => setChaos(+e.target.value)} />
        <span>Unpredictability</span>
      </label>
    </div>
  )
}

/* ─────────────── Projection mapping: the room, not the rectangle ─────────────── */

export type MapMode = 'rect' | 'mask' | 'mapped'

const MAP_MODES: { id: MapMode; name: string; note: string }[] = [
  {
    id: 'rect',
    name: 'A rectangle',
    note: 'A video thrown at a building: it ignores the architecture, spills past the edges and bends into every recess.',
  },
  { id: 'mask', name: 'Masked', note: 'The same content, cut to the facade: tidier, but still a picture laid over a building.' },
  {
    id: 'mapped',
    name: 'Mapped',
    note: 'Content built from the facade’s own geometry: edges traced, windows filled, arches and columns brought to life.',
  },
]

const DOORS = [-2.6, 0, 2.6]
const COLS = [-3.9, -1.3, 1.3, 3.9]
const REC = 0.35 // how deep the doors and windows are set

function archPts(cx: number, z: number, s = 1): V3[] {
  const hw = 0.65 * s
  const top = 1.7 * s
  const pts: V3[] = [[cx - hw, 0, z]]
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI - (i / 16) * Math.PI
    pts.push([cx + Math.cos(a) * hw, top + Math.sin(a) * hw, z])
  }
  pts.push([cx + hw, 0, z])
  return pts
}
const winPts = (cx: number, z: number): V3[] => [
  [cx - 0.45, 2.75, z],
  [cx + 0.45, 2.75, z],
  [cx + 0.45, 3.85, z],
  [cx - 0.45, 3.85, z],
  [cx - 0.45, 2.75, z],
]
const colPts = (cx: number): V3[] => [
  [cx - 0.16, 0, -0.05],
  [cx + 0.16, 0, -0.05],
  [cx + 0.16, 4.3, -0.05],
  [cx - 0.16, 4.3, -0.05],
  [cx - 0.16, 0, -0.05],
]
const OUTLINE: V3[] = [
  [-4.2, 0, 0],
  [4.2, 0, 0],
  [4.2, 4.3, 0],
  [4.4, 4.55, -0.1],
  [4.2, 5.2, 0],
  [-4.2, 5.2, 0],
  [-4.4, 4.55, -0.1],
  [-4.2, 4.3, 0],
  [-4.2, 0, 0],
]

/** Is this point of the facade plane inside a door or window opening? */
function inOpening(x: number, y: number) {
  for (const d of DOORS) {
    if (Math.abs(x - d) < 0.65 && (y < 1.7 || Math.hypot(x - d, y - 1.7) < 0.65)) return true
    if (Math.abs(x - d) < 0.45 && y > 2.75 && y < 3.85) return true
  }
  return false
}

const MPJ: V3 = [0.4, 2.2, -9]

const makeMapping = (ctl: { current: MapMode }): Draw => {
  let yaw = 0.35
  return ({ c, w, h, t, dpr, pointer }) => {
    const mode = ctl.current
    if (pointer.down) yaw = Math.max(-1.1, Math.min(1.1, yaw + pointer.dx * 2.4))
    else yaw += (0.35 + 0.12 * Math.sin(t * 0.1) - yaw) * 0.004
    const proj: Proj = camera({ cx: w / 2, cy: h * 0.8, scale: Math.min(w, h * 1.5) / 11, yaw, pitch: 0.12, persp: 18 })
    const strokePts = (pts: readonly V3[], frac = 1) => {
      const n = Math.max(1, Math.floor((pts.length - 1) * frac))
      c.beginPath()
      for (let i = 0; i <= n; i++) {
        const [x, y] = proj(pts[i])
        if (i) c.lineTo(x, y)
        else c.moveTo(x, y)
      }
      c.stroke()
    }
    // the building: dark stone, its openings darker still
    c.fillStyle = '#121110'
    c.beginPath()
    OUTLINE.forEach((p, i) => {
      const [x, y] = proj(p)
      if (i) c.lineTo(x, y)
      else c.moveTo(x, y)
    })
    c.fill()
    c.fillStyle = '#050505'
    for (const d of DOORS) {
      c.beginPath()
      archPts(d, 0).forEach((p, i) => {
        const [x, y] = proj(p)
        if (i) c.lineTo(x, y)
        else c.moveTo(x, y)
      })
      c.fill()
      c.beginPath()
      winPts(d, 0).forEach((p, i) => {
        const [x, y] = proj(p)
        if (i) c.lineTo(x, y)
        else c.moveTo(x, y)
      })
      c.fill()
    }

    const lit = buckets()
    const cells = (
      x0: number,
      x1: number,
      y0: number,
      y1: number,
      nx: number,
      ny: number,
      val: (x: number, y: number) => number,
      mask: boolean,
    ) => {
      for (let i = 0; i < nx; i++)
        for (let j = 0; j < ny; j++) {
          const xa = x0 + ((x1 - x0) * i) / nx
          const xb = x0 + ((x1 - x0) * (i + 1)) / nx
          const ya = y0 + ((y1 - y0) * j) / ny
          const yb = y0 + ((y1 - y0) * (j + 1)) / ny
          const mx = (xa + xb) / 2
          const my = (ya + yb) / 2
          const facade = Math.abs(mx) < 4.2 && my < 5.2
          if (mask && (!facade || inOpening(mx, my))) continue
          if (!facade) continue
          // light falling into a recess lands deeper, and further along: the image tears
          const z = inOpening(mx, my) ? REC : 0
          const s = (z - MPJ[2]) / -MPJ[2]
          const sh = (v: number, o: number) => o + (v - o) * s
          addQuad(lit, val(mx, my) * (z ? 0.6 : 1), [
            proj([sh(xa, MPJ[0]), sh(ya, MPJ[1]), z]),
            proj([sh(xb, MPJ[0]), sh(ya, MPJ[1]), z]),
            proj([sh(xb, MPJ[0]), sh(yb, MPJ[1]), z]),
            proj([sh(xa, MPJ[0]), sh(yb, MPJ[1]), z]),
          ])
        }
    }
    if (mode !== 'mapped') {
      // generic content: stripes and a drifting circle, made for no building in particular
      const content = (x: number, y: number) => {
        const stripes = fract((x * 0.5 + y * 0.8) * 1.6 - t * 0.25) < 0.45 ? 0.75 : 0.12
        const circ = Math.hypot(x - Math.sin(t * 0.4) * 2, y - 2.6) < 1.1 ? 0.9 : 0
        return Math.max(stripes, circ)
      }
      cells(
        mode === 'rect' ? -3.4 : -4.2,
        mode === 'rect' ? 4.6 : 4.2,
        mode === 'rect' ? 0.4 : 0,
        mode === 'rect' ? 5.6 : 5.2,
        44,
        30,
        content,
        mode === 'mask',
      )
      fillBuckets(c, lit, '245,241,232')
    } else {
      // a twelve-second sequence designed for this facade
      const tl = t % 12
      if (tl > 9) {
        // a wave across the stonework
        const k = (tl - 9) * 4 - 2
        cells(-4.2, 4.2, 0, 5.2, 34, 21, (x, y) => Math.max(0, 1 - Math.abs(x * 0.35 + y * 0.3 - k) * 2.2) * 0.85, true)
        fillBuckets(c, lit, '245,241,232')
      }
      c.lineCap = 'round'
      // windows fill from the bottom, one after another
      if (tl > 3 && tl < 9.5) {
        DOORS.forEach((d, i) => {
          const f = Math.max(0, Math.min(1, (tl - 3.4 - i * 0.6) / 1.2))
          if (!f) return
          const top = 2.75 + 1.1 * f
          c.fillStyle = `rgba(245,241,232,${0.85 * Math.min(1, (9.5 - tl) * 2)})`
          c.beginPath()
          ;(
            [
              [d - 0.45, 2.75, 0],
              [d + 0.45, 2.75, 0],
              [d + 0.45, top, 0],
              [d - 0.45, top, 0],
            ] as V3[]
          ).forEach((p, j) => {
            const [x, y] = proj(p)
            if (j) c.lineTo(x, y)
            else c.moveTo(x, y)
          })
          c.fill()
        })
        // columns sweep upwards
        COLS.forEach((cx, i) => {
          const y = ((tl - 3 + i * 0.3) * 1.6) % 5
          const g = 0.9 * Math.min(1, (9.5 - tl) * 2)
          c.fillStyle = `rgba(245,241,232,${g})`
          c.beginPath()
          ;(
            [
              [cx - 0.16, y, -0.05],
              [cx + 0.16, y, -0.05],
              [cx + 0.16, Math.min(4.3, y + 0.9), -0.05],
              [cx - 0.16, Math.min(4.3, y + 0.9), -0.05],
            ] as V3[]
          ).forEach((p, j) => {
            const [x, yy] = proj(p)
            if (j) c.lineTo(x, yy)
            else c.moveTo(x, yy)
          })
          c.fill()
        })
      }
      // arches: rings travelling inwards
      if (tl > 5.5 && tl < 10) {
        c.strokeStyle = `rgba(245,241,232,${0.8 * Math.min(1, (10 - tl) * 2)})`
        c.lineWidth = 1.6 * dpr
        DOORS.forEach((d, i) => {
          for (let k = 0; k < 3; k++) strokePts(archPts(d, REC, 1 - fract(t * 0.45 + k / 3 + i * 0.15)))
        })
      }
      // the outlines trace themselves at the start, and stay
      const trace = Math.min(1, tl / 2.5)
      c.strokeStyle = 'rgba(250,247,240,0.95)'
      c.lineWidth = 1.8 * dpr
      strokePts(OUTLINE, trace)
      DOORS.forEach((d) => {
        strokePts(archPts(d, 0), trace)
        strokePts(winPts(d, 0), trace)
      })
      COLS.forEach((cx) => strokePts(colPts(cx), trace))
      c.lineCap = 'butt'
    }
    // the architecture, always faintly there
    c.strokeStyle = `${INK}0.16)`
    c.lineWidth = dpr
    strokePts(OUTLINE)
    DOORS.forEach((d) => {
      strokePts(archPts(d, 0))
      strokePts(archPts(d, REC))
      strokePts(winPts(d, 0))
    })
    COLS.forEach((cx) => strokePts(colPts(cx)))
    // the projector
    const [px, py] = proj(MPJ)
    c.fillStyle = `${INK}0.9)`
    c.beginPath()
    c.arc(px, py, 3 * dpr, 0, Math.PI * 2)
    c.fill()
    tag(c, MAP_MODES.find((m) => m.id === mode)!.name, 14 * dpr, 22 * dpr, dpr, 0.75)
    tag(c, 'Drag to look around', w - 14 * dpr, 22 * dpr, dpr, 0.35, 'right')
  }
}

export function MappingScene() {
  const [mode, setMode] = useState<MapMode>('mapped')
  const ctl = useRef(mode)
  useEffect(() => {
    ctl.current = mode
  }, [mode])
  const make = useMemo(() => () => makeMapping(ctl), [])
  const m = MAP_MODES.find((x) => x.id === mode)!
  return (
    <div className="scene-panel">
      <div className="scene-tabs" role="tablist" aria-label="Projection">
        {MAP_MODES.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={x.id === mode}
            className={x.id === mode ? 'is-on' : ''}
            onClick={() => setMode(x.id)}
          >
            {x.name}
          </button>
        ))}
      </div>
      <Stage make={make} className="vis-scene vis-scene--map" />
      <p className="scene-panel__note" aria-live="polite">
        {m.note}
      </p>
    </div>
  )
}

/* ─────────────── The vision: sound, light and image as one environment ─────────────── */

const VISION_PROGRAMS: Program[] = ['fan', 'mirror', 'circle', 'sweep']

const makeVision = (): Draw => {
  const rig = makeRig()
  const listen = makeListener()
  let wave = 0
  return (f) => {
    const { c, w, h, t, dt, dpr } = f
    const a = listen(t, null)
    if (a.hit) wave = 1
    wave = Math.max(0, wave - dt * 1.6)
    const yaw = Math.sin(t * 0.07) * 0.22
    rig.step(
      {
        program: VISION_PROGRAMS[Math.floor(a.bar / 8) % 4],
        palette: a.section === 'Drop' ? 'white' : 'amber',
        dim: 0.35 + 0.55 * a.level + 0.2 * a.bass,
        speed: 0.3,
      },
      t,
      dt,
      3,
    )
    rig.draw(f, yaw)
    const proj = camera({ cx: w / 2, cy: h * 0.62, scale: Math.min(w, h * 1.5) / 14, yaw, pitch: 0.34, persp: 22 })
    // a suspended mesh, with the image evolving across it
    const net = buckets()
    const S = 0.22
    const img = (x: number, y: number) => {
      const r = Math.hypot(x, (y - 2.9) * 1.2)
      const rings = fract(r * 1.4 - t * 0.3 - a.bass * 0.15) < 0.4 ? 1 : 0
      return 0.08 + 0.9 * rings * Math.max(0, 1 - r / 4.2)
    }
    for (const dir of [1, -1])
      for (let k = -40; k <= 40; k++)
        for (let y = 1.3; y < 4.5; y += 0.12) {
          const x0 = k * S + dir * y
          const x1 = k * S + dir * (y + 0.12)
          if (Math.abs(x0) > 3.4 || Math.abs(x1) > 3.4) continue
          const v = img((x0 + x1) / 2, y + 0.06)
          addLine(net, v, proj([x0, y, 1]), proj([x1, y + 0.12, 1]))
        }
    c.globalCompositeOperation = 'lighter'
    c.lineWidth = 1.1 * dpr
    fillBuckets(c, net, '246,243,236', 0.9, true)
    // speakers, breathing out on the kick
    for (const s of [-1, 1]) {
      const [x0, y0] = proj([s * 5.2, 0, 1.5])
      const [, y1] = proj([s * 5.2, 1.7, 1.5])
      c.globalCompositeOperation = 'source-over'
      c.fillStyle = '#1a1917'
      c.strokeStyle = `${INK}0.35)`
      const bw = 18 * dpr
      c.fillRect(x0 - bw / 2, y1, bw, y0 - y1)
      c.strokeRect(x0 - bw / 2, y1, bw, y0 - y1)
      c.globalCompositeOperation = 'lighter'
      for (let k = 0; k < 3; k++) {
        const r = (1 - wave + k * 0.33) % 1
        c.strokeStyle = `${BRASS}${0.35 * (1 - r)})`
        c.beginPath()
        c.arc(
          x0,
          (y0 + y1) / 2,
          14 * dpr + r * 90 * dpr,
          s > 0 ? Math.PI * 0.6 : -Math.PI * 0.4,
          s > 0 ? Math.PI * 1.4 : Math.PI * 0.4,
        )
        c.stroke()
      }
    }
    c.globalCompositeOperation = 'source-over'
  }
}

export const VisionScene = () => <Stage make={makeVision} className="vis-scene vis-scene--vision" />
