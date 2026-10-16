import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { VA_MARK_PATH } from '../../brand/vaMarkPath'
import { makeRig, PALETTES, type Look, type PaletteId, type Program } from './lightRig'
import type { Draw } from './draw'
import { Stage } from './Stage'

// Interactive scenes for the Light page. They're drawn on a dark "stage" whatever the site's
// theme, because that's where light reads.

const INK = 'rgba(240,237,229,'
const font = (px: number, dpr: number, weight = 600) => `${weight} ${px * dpr}px Manrope, system-ui, sans-serif`
function tag(
  c: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  dpr: number,
  a = 0.7,
  align: CanvasTextAlign = 'left',
) {
  c.font = font(10, dpr)
  c.letterSpacing = `${1.8 * dpr}px`
  c.textAlign = align
  c.fillStyle = `${INK}${a})`
  c.fillText(text.toUpperCase(), x, y)
  c.letterSpacing = '0px'
}

/* ─────────────── Header: a rig whose beams follow you ─────────────── */

const HERO_PROGRAMS: Program[] = ['fan', 'circle', 'mirror', 'sweep']

const makeHero = (): Draw => {
  const rig = makeRig()
  return (f) => {
    const { t, dt, pointer, w, h } = f
    const k = Math.floor(t / 7) % HERO_PROGRAMS.length
    const look: Look = pointer.active
      ? { program: 'follow', palette: 'white', dim: 1, speed: 0.4, aim: { x: (pointer.x - 0.5) * 14, z: 3 - pointer.y * 11 } }
      : { program: HERO_PROGRAMS[k], palette: (['amber', 'white', 'ruby', 'ice'] as PaletteId[])[k], dim: 0.95, speed: 0.35 }
    rig.step(look, t, dt, pointer.active ? 9 : 3)
    rig.draw(f, Math.sin(t * 0.1) * 0.12)
    tag(f.c, pointer.active ? 'Following you' : 'Point to take control', w / 2, h - 10 * f.dpr, f.dpr, 0.45, 'center')
  }
}

export const LightHero = () => <Stage make={makeHero} className="light-scene light-scene--hero" />

/* ─────────────── Every light has a purpose: devices, or a system ─────────────── */

const SYSTEM_LOOKS: Look[] = [
  { program: 'fan', palette: 'amber', dim: 1, speed: 0.25 },
  { program: 'mirror', palette: 'amber', dim: 1, speed: 0.3 },
  { program: 'circle', palette: 'white', dim: 1, speed: 0.3 },
  { program: 'chase', palette: 'white', dim: 1, speed: 0.35 },
]

export function PurposeScene() {
  const [system, setSystem] = useState(true)
  const ctl = useRef(system)
  useEffect(() => {
    ctl.current = system
  }, [system])
  const make = useMemo(
    () => (): Draw => {
      const rig = makeRig()
      return (f) => {
        const look: Look = ctl.current
          ? SYSTEM_LOOKS[Math.floor(f.t / 5) % SYSTEM_LOOKS.length]
          : { program: 'chaos', palette: 'amber', dim: 1, speed: 0.6 }
        rig.step(look, f.t, f.dt, ctl.current ? 2.2 : 8)
        rig.draw(f, -0.15)
        tag(
          f.c,
          ctl.current ? `Cue: ${look.program} · ${look.palette}` : 'Six fixtures, six ideas',
          12 * f.dpr,
          20 * f.dpr,
          f.dpr,
          0.6,
        )
      }
    },
    [],
  )
  return (
    <div className="scene-panel">
      <div className="scene-tabs" role="tablist" aria-label="Programming">
        <button role="tab" aria-selected={!system} className={!system ? 'is-on' : ''} onClick={() => setSystem(false)}>
          Individual fixtures
        </button>
        <button role="tab" aria-selected={system} className={system ? 'is-on' : ''} onClick={() => setSystem(true)}>
          A programmed system
        </button>
      </div>
      <Stage make={make} className="light-scene light-scene--rig" />
      <p className="scene-panel__note" aria-live="polite">
        {system
          ? 'One palette, mirrored movement, timed transitions: six fixtures working as one composition.'
          : 'Every fixture doing its own thing: lots of light, no atmosphere.'}
      </p>
    </div>
  )
}

/* ─────────────── The music is the clock: audio-reactive behaviours ─────────────── */

export type Response = 'beat' | 'tempo' | 'phrase' | 'energy' | 'accents' | 'ambient'

const RESPONSES: { id: Response; name: string; note: string }[] = [
  { id: 'beat', name: 'Beat-synchronised', note: 'Lighting events triggered by each detected pulse.' },
  { id: 'tempo', name: 'Tempo-aware', note: 'A chase that steps with the estimated tempo, beat by beat.' },
  { id: 'phrase', name: 'Phrase-based', note: 'Colour changes held for whole musical sections, every eight bars.' },
  { id: 'energy', name: 'Energy-responsive', note: 'Intensity and reach that follow the energy of the track.' },
  { id: 'accents', name: 'Controlled accents', note: 'Only the downbeats and the drop are marked; the rest is left alone.' },
  { id: 'ambient', name: 'Ambient progression', note: 'A slow, evolving state that complements the music without chasing it.' },
]

const BPM = 124
const SECTIONS: [number, string][] = [
  [0, 'Intro'],
  [8, 'Build'],
  [16, 'Drop'],
  [28, 'Breakdown'],
]

type Mic = { an: AnalyserNode; buf: Float32Array<ArrayBuffer>; stream: MediaStream; ac: AudioContext }

const makeAudio = (ctl: { current: { mode: Response; mic: Mic | null } }): Draw => {
  const hist: number[] = []
  let avg = 0.02
  let lastBeat = -1
  const onsets: number[] = []
  let micBpm = 0
  let beats = 0
  let flash = 0
  let energyS = 0
  const lights = Array.from({ length: 8 }, () => ({ v: 0, c: [255, 200, 120] as number[] }))
  return ({ c, w, h, t, dt, dpr }) => {
    const { mode, mic } = ctl.current
    const T = 60 / BPM
    let energy: number
    let beatNow = false
    let bar = 0
    let section = ''
    let bpmText: string
    if (mic) {
      mic.an.getFloatTimeDomainData(mic.buf)
      let sum = 0
      for (let i = 0; i < mic.buf.length; i++) sum += mic.buf[i] * mic.buf[i]
      const rms = Math.sqrt(sum / mic.buf.length)
      avg += (rms - avg) * 0.02
      energy = Math.min(1, rms * 6)
      if (rms > avg * 1.35 && rms > 0.015 && t - lastBeat > 0.28) {
        if (lastBeat > 0) onsets.push(t - lastBeat)
        if (onsets.length > 12) onsets.shift()
        lastBeat = t
        beatNow = true
        beats++
        const sorted = [...onsets].sort((a, b) => a - b)
        let bpm = sorted.length ? 60 / sorted[Math.floor(sorted.length / 2)] : 0
        while (bpm && bpm < 80) bpm *= 2
        while (bpm > 170) bpm /= 2
        micBpm = bpm
      }
      bar = Math.floor(beats / 4)
      section = 'Listening'
      bpmText = micBpm ? `${micBpm.toFixed(1)} BPM` : 'Finding the beat…'
      hist.push(rms * 4)
    } else {
      // a made-up track: 32 bars of intro, build, drop and breakdown, looping
      const beatF = t / T
      const b = Math.floor(beatF)
      bar = Math.floor(b / 4) % 32
      section = [...SECTIONS].reverse().find(([s]) => bar >= s)![1]
      const base = bar < 8 ? 0.35 : bar < 16 ? 0.35 + ((bar - 8 + (b % 4) / 4) / 8) * 0.45 : bar < 28 ? 1 : 0.22
      const kickOn = bar < 28
      const ph = beatF - b
      const kick = kickOn ? Math.exp(-ph * 9) : 0
      energy = Math.min(1, base * (0.55 + 0.45 * kick))
      if (b !== lastBeat) {
        lastBeat = b
        if (kickOn) {
          beatNow = true
          beats = b
        }
      }
      bpmText = `${(BPM + Math.sin(t * 0.7) * 0.15).toFixed(1)} BPM`
      hist.push(kick * base + 0.12 * base * Math.random())
    }
    while (hist.length > 220) hist.shift()
    energyS += (energy - energyS) * 0.08
    if (beatNow) flash = 1
    flash = Math.max(0, flash - dt * 6)

    // waveform, newest on the right
    const top = h * 0.08
    const wh = h * 0.26
    c.fillStyle = `${INK}0.04)`
    c.fillRect(12 * dpr, top, w - 24 * dpr, wh)
    const step = (w - 24 * dpr) / 220
    hist.forEach((v, i) => {
      const a = Math.min(1, v) * wh * 0.48
      c.fillStyle = `rgba(184,164,123,${0.35 + Math.min(0.6, v)})`
      c.fillRect(12 * dpr + i * step, top + wh / 2 - a, Math.max(1, step - 0.5), a * 2)
    })
    if (flash > 0.6) {
      c.fillStyle = `${INK}${flash * 0.8})`
      c.fillRect(w - 14 * dpr, top, 2 * dpr, wh)
    }
    tag(c, bpmText, 14 * dpr, top - 8 * dpr, dpr, 0.85)
    tag(
      c,
      mic ? section : `${section} · bar ${bar + 1} · beat ${(beats % 4) + 1}`,
      w - 14 * dpr,
      top - 8 * dpr,
      dpr,
      0.6,
      'right',
    )

    // the lights
    const n = lights.length
    const palIdx = Math.floor(bar / 8) % 4
    const pal = (['amber', 'ruby', 'ice', 'violet'] as PaletteId[])[palIdx]
    lights.forEach((L, i) => {
      let v = 0
      let col = PALETTES.amber[i % 2] as number[]
      switch (mode) {
        case 'beat':
          v = flash
          break
        case 'tempo': {
          const at = beats % n
          v = i === at ? 1 : i === (at + n - 1) % n ? 0.35 * (0.5 + flash * 0.5) : 0.05
          break
        }
        case 'phrase':
          v = 0.75
          col = PALETTES[mic ? (['amber', 'ruby', 'ice', 'violet'] as PaletteId[])[Math.floor(beats / 32) % 4] : pal][i % 2]
          break
        case 'energy':
          v = Math.min(1, 0.08 + energyS * 1.05)
          col = PALETTES.white[i % 2]
          break
        case 'accents':
          v = beats % 4 === 0 ? flash : 0.06
          if (!mic && bar === 16 && beats % 16 === 0) v = flash
          col = PALETTES.white[0]
          break
        case 'ambient': {
          v = 0.35 + 0.2 * Math.sin(t * 0.4 + i * 0.6)
          const hue = (t * 0.03 + i * 0.04) % 1
          col = [200 + 55 * Math.sin(hue * 6.28), 120 + 60 * Math.sin(hue * 6.28 + 2), 160 + 90 * Math.sin(hue * 6.28 + 4)]
          break
        }
      }
      L.v += (v - L.v) * (mode === 'ambient' || mode === 'phrase' ? 0.04 : 0.5)
      for (let j = 0; j < 3; j++) L.c[j] += (col[j] - L.c[j]) * 0.06
      const x = w * (0.1 + (i / (n - 1)) * 0.8)
      const base = h * 0.92
      const reach = h * (0.32 + (mode === 'energy' ? energyS * 0.25 : 0.18))
      const [r, g, b] = L.c.map(Math.round)
      c.globalCompositeOperation = 'lighter'
      const grad = c.createLinearGradient(x, base, x, base - reach)
      grad.addColorStop(0, `rgba(${r},${g},${b},${0.7 * L.v})`)
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
      c.fillStyle = grad
      c.beginPath()
      c.moveTo(x - 6 * dpr, base)
      c.lineTo(x - 26 * dpr, base - reach)
      c.lineTo(x + 26 * dpr, base - reach)
      c.lineTo(x + 6 * dpr, base)
      c.fill()
      const lg = c.createRadialGradient(x, base, 0, x, base, 20 * dpr)
      lg.addColorStop(0, `rgba(${r},${g},${b},${L.v})`)
      lg.addColorStop(1, `rgba(${r},${g},${b},0)`)
      c.fillStyle = lg
      c.fillRect(x - 20 * dpr, base - 20 * dpr, 40 * dpr, 40 * dpr)
      c.globalCompositeOperation = 'source-over'
      c.fillStyle = '#1d1c1a'
      c.fillRect(x - 9 * dpr, base, 18 * dpr, 8 * dpr)
    })
  }
}

export function AudioReactive() {
  const [mode, setMode] = useState<Response>('beat')
  const [mic, setMic] = useState<'off' | 'starting' | 'on' | 'denied'>('off')
  const ctl = useRef<{ mode: Response; mic: Mic | null }>({ mode, mic: null })
  useEffect(() => {
    ctl.current.mode = mode
  }, [mode])
  useEffect(
    () => () => {
      const m = ctl.current.mic
      m?.stream.getTracks().forEach((tr) => tr.stop())
      void m?.ac.close()
    },
    [],
  )
  const make = useMemo(() => () => makeAudio(ctl), [])
  const toggleMic = async () => {
    if (ctl.current.mic) {
      ctl.current.mic.stream.getTracks().forEach((tr) => tr.stop())
      void ctl.current.mic.ac.close()
      ctl.current.mic = null
      setMic('off')
      return
    }
    try {
      setMic('starting')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } })
      const ac = new AudioContext()
      const an = ac.createAnalyser()
      an.fftSize = 1024
      ac.createMediaStreamSource(stream).connect(an)
      ctl.current.mic = { an, buf: new Float32Array(new ArrayBuffer(an.fftSize * 4)), stream, ac }
      setMic('on')
    } catch {
      setMic('denied')
    }
  }
  const r = RESPONSES.find((x) => x.id === mode)!
  return (
    <div className="scene-panel">
      <div className="scene-tabs scene-tabs--small" role="tablist" aria-label="Response">
        {RESPONSES.map((x) => (
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
      <Stage make={make} className="light-scene light-scene--audio" />
      <div className="scene-panel__row">
        <p className="scene-panel__note" aria-live="polite">
          <strong>{r.name}.</strong> {r.note}
        </p>
        <button className={`mic ${mic === 'on' ? 'is-on' : ''}`} onClick={toggleMic} disabled={mic === 'starting'}>
          <i aria-hidden />
          {mic === 'on' ? 'Stop listening' : mic === 'denied' ? 'Microphone blocked' : 'Use my microphone'}
        </button>
      </div>
    </div>
  )
}

/* ─────────────── We build our own tools: the software, as a patch ─────────────── */

const NODES = [
  {
    id: 'audio',
    x: 0.03,
    y: 0.12,
    name: 'Audio input',
    sub: 'line or microphone',
    body: 'The music comes in: from the mixer, the DJ’s output or a microphone.',
  },
  {
    id: 'tempo',
    x: 0.27,
    y: 0.04,
    name: 'Tempo & beats',
    sub: 'onset detection',
    body: 'Our own code estimates the tempo and tracks beats, bars and phrases.',
  },
  {
    id: 'energy',
    x: 0.27,
    y: 0.3,
    name: 'Energy',
    sub: 'level & spectrum',
    body: 'How hard the music is pushing, and where in the spectrum.',
  },
  {
    id: 'midi',
    x: 0.03,
    y: 0.62,
    name: 'MIDI surface',
    sub: 'pads & faders',
    body: 'An operator’s hands on the show: notes and control changes, mapped with intent.',
  },
  {
    id: 'logic',
    x: 0.51,
    y: 0.17,
    name: 'Control logic',
    sub: 'custom software',
    body: 'Mapping musical events and controls onto lighting decisions.',
  },
  {
    id: 'cues',
    x: 0.51,
    y: 0.55,
    name: 'Cue engine',
    sub: 'Lightkey · QLC+',
    body: 'Scenes, cues and transitions, programmed and played back.',
  },
  { id: 'pixel', x: 0.51, y: 0.82, name: 'Pixel mapping', sub: 'Madrix', body: 'Visual content turned into data for every LED.' },
  {
    id: 'net',
    x: 0.76,
    y: 0.42,
    name: 'Art-Net · sACN',
    sub: 'network to DMX',
    body: 'Control data over the network, out to DMX universes.',
  },
  {
    id: 'fix',
    x: 0.76,
    y: 0.74,
    name: 'Fixtures',
    sub: 'heads, bars, panels',
    body: 'The rig, every channel addressed and accounted for.',
  },
] as const
const WIRES: [string, string][] = [
  ['audio', 'tempo'],
  ['audio', 'energy'],
  ['tempo', 'logic'],
  ['energy', 'logic'],
  ['midi', 'logic'],
  ['midi', 'cues'],
  ['logic', 'cues'],
  ['cues', 'net'],
  ['pixel', 'net'],
  ['net', 'fix'],
]

const makeGraph =
  (): Draw =>
  ({ c, w, h, t, dpr, pointer }) => {
    const bw = w * 0.21
    const bh = Math.max(40 * dpr, h * 0.12)
    const at = (id: string) => NODES.find((n) => n.id === id)!
    const box = (n: (typeof NODES)[number]) => ({ x: n.x * w, y: n.y * h + 20 * dpr, w: bw, h: bh })
    let focus: string = NODES[Math.floor(t / 2.4) % NODES.length].id
    if (pointer.active) {
      const hit = NODES.find((n) => {
        const b = box(n)
        return pointer.x * w > b.x && pointer.x * w < b.x + b.w && pointer.y * h > b.y && pointer.y * h < b.y + b.h
      })
      if (hit) focus = hit.id
    }
    // wires
    WIRES.forEach(([a, b], k) => {
      const A = box(at(a))
      const B = box(at(b))
      const x0 = A.x + A.w
      const y0 = A.y + A.h / 2
      const x1 = B.x
      const y1 = B.y + B.h / 2
      const on = a === focus || b === focus
      c.strokeStyle = on ? 'rgba(184,164,123,0.85)' : `${INK}0.18)`
      c.lineWidth = (on ? 1.6 : 1) * dpr
      c.beginPath()
      c.moveTo(x0, y0)
      const mx = (x0 + x1) / 2
      c.bezierCurveTo(mx, y0, mx, y1, x1, y1)
      c.stroke()
      // data travelling
      for (let j = 0; j < 2; j++) {
        const u = (t * 0.45 + k * 0.13 + j * 0.5) % 1
        const iu = 1 - u
        const px = iu ** 3 * x0 + 3 * iu * iu * u * mx + 3 * iu * u * u * mx + u ** 3 * x1
        const py = iu ** 3 * y0 + 3 * iu * iu * u * y0 + 3 * iu * u * u * y1 + u ** 3 * y1
        c.fillStyle = on ? 'rgba(240,237,229,0.95)' : 'rgba(184,164,123,0.6)'
        c.fillRect(px - 2 * dpr, py - 2 * dpr, 4 * dpr, 4 * dpr)
      }
    })
    // nodes
    NODES.forEach((n) => {
      const b = box(n)
      const on = n.id === focus
      c.fillStyle = on ? 'rgba(184,164,123,0.16)' : 'rgba(30,29,27,0.95)'
      c.strokeStyle = on ? 'rgba(184,164,123,0.9)' : `${INK}0.25)`
      c.lineWidth = dpr
      c.beginPath()
      c.roundRect(b.x, b.y, b.w, b.h, 4 * dpr)
      c.fill()
      c.stroke()
      c.fillStyle = `${INK}${on ? 1 : 0.8})`
      c.font = font(Math.max(10, Math.min(13, w / dpr / 48)), dpr, 650)
      c.textAlign = 'left'
      c.fillText(n.name, b.x + 9 * dpr, b.y + b.h * 0.45, b.w - 14 * dpr)
      c.fillStyle = on ? 'rgba(184,164,123,1)' : `${INK}0.45)`
      c.font = font(Math.max(9, Math.min(11, w / dpr / 58)), dpr, 500)
      c.fillText(n.sub, b.x + 9 * dpr, b.y + b.h * 0.78, b.w - 14 * dpr)
      // ports
      c.fillStyle = `${INK}0.6)`
      c.fillRect(b.x - 2 * dpr, b.y + b.h / 2 - 2 * dpr, 4 * dpr, 4 * dpr)
      c.fillRect(b.x + b.w - 2 * dpr, b.y + b.h / 2 - 2 * dpr, 4 * dpr, 4 * dpr)
    })
    const f = NODES.find((n) => n.id === focus)!
    c.font = font(13, dpr, 500)
    c.fillStyle = `${INK}0.85)`
    c.textAlign = 'left'
    c.fillText(f.body, 12 * dpr, h - 12 * dpr, w - 24 * dpr)
    tag(c, 'Point at a node', w - 12 * dpr, 14 * dpr, dpr, 0.4, 'right')
  }

export const ToolsGraph = () => <Stage make={makeGraph} className="light-scene light-scene--graph" />

/* ─────────────── MIDI: a controller you can play ─────────────── */

const PADS: { label: string; note: number; set: Partial<Look> | 'strobe' | 'blackout' }[] = [
  { label: 'Sweep', note: 36, set: { program: 'sweep' } },
  { label: 'Mirror', note: 37, set: { program: 'mirror' } },
  { label: 'Fan', note: 38, set: { program: 'fan' } },
  { label: 'Circle', note: 39, set: { program: 'circle' } },
  { label: 'Amber', note: 40, set: { palette: 'amber' } },
  { label: 'Ruby', note: 41, set: { palette: 'ruby' } },
  { label: 'Ice', note: 42, set: { palette: 'ice' } },
  { label: 'Violet', note: 43, set: { palette: 'violet' } },
  { label: 'Chase', note: 44, set: { program: 'chase' } },
  { label: 'Still', note: 45, set: { program: 'static' } },
  { label: 'Strobe', note: 46, set: 'strobe' },
  { label: 'Blackout', note: 47, set: 'blackout' },
]

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
const noteName = (n: number) => `${NOTE_NAMES[n % 12]}${Math.floor(n / 12) - 1}`

function VFader({ label, cc, value, onChange }: { label: string; cc: number; value: number; onChange: (v: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const set = (e: RPointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    onChange(Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height)))
  }
  return (
    <div className="vfader">
      <div
        ref={ref}
        className="vfader__track"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={127}
        aria-valuenow={Math.round(value * 127)}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          set(e)
        }}
        onPointerMove={(e) => e.buttons && set(e)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') onChange(Math.min(1, value + 0.05))
          else if (e.key === 'ArrowDown') onChange(Math.max(0, value - 0.05))
        }}
      >
        <span className="vfader__fill" style={{ height: `${value * 100}%` }} />
        <span className="vfader__cap" style={{ bottom: `${value * 100}%` }} />
      </div>
      <span className="vfader__label">{label}</span>
      <span className="vfader__cc">CC {cc}</span>
    </div>
  )
}

export function MidiScene() {
  const [look, setLook] = useState<Look>({ program: 'fan', palette: 'amber', dim: 0.9, speed: 0.4, width: 0.45 })
  const [held, setHeld] = useState<'strobe' | 'blackout' | null>(null)
  const [log, setLog] = useState<string[]>(['Ready. Press a pad or move a fader.'])
  const ctl = useRef({ look, held })
  useEffect(() => {
    ctl.current = { look, held }
  }, [look, held])
  const make = useMemo(
    () => (): Draw => {
      const rig = makeRig()
      return (f) => {
        const { look: l, held: hd } = ctl.current
        const live: Look = { ...l, strobe: hd === 'strobe', dim: hd === 'blackout' ? 0 : l.dim }
        rig.step(live, f.t, f.dt, 7)
        rig.draw(f, 0.1)
      }
    },
    [],
  )
  const say = (m: string) => setLog((x) => [m, ...x].slice(0, 4))
  const press = (p: (typeof PADS)[number]) => {
    say(`Note On ${noteName(p.note)} (${p.note}) vel 127  →  ${p.label}`)
    if (p.set === 'strobe' || p.set === 'blackout') setHeld(p.set)
    else setLook((l) => ({ ...l, ...(p.set as Partial<Look>) }))
  }
  const release = (p: (typeof PADS)[number]) => {
    if (p.set === 'strobe' || p.set === 'blackout') {
      setHeld(null)
      say(`Note Off ${noteName(p.note)} (${p.note})  →  ${p.label} released`)
    }
  }
  const fader = (key: 'dim' | 'speed' | 'width', cc: number, name: string) => (v: number) => {
    setLook((l) => ({ ...l, [key]: v }))
    say(`CC ${cc} = ${Math.round(v * 127)}  →  ${name} ${Math.round(v * 100)}%`)
  }
  return (
    <div className="midi">
      <Stage make={make} className="light-scene light-scene--rig" />
      <div className="midi__deck">
        <div className="midi__pads">
          {PADS.map((p) => {
            const on =
              p.set === 'strobe' || p.set === 'blackout'
                ? held === p.set
                : Object.entries(p.set).every(([k, v]) => look[k as keyof Look] === v)
            return (
              <button
                key={p.label}
                className={`pad ${on ? 'is-on' : ''} ${typeof p.set === 'string' ? 'pad--hold' : ''}`}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId)
                  press(p)
                }}
                onPointerUp={() => release(p)}
                onPointerCancel={() => release(p)}
                onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && !e.repeat && press(p)}
                onKeyUp={(e) => (e.key === ' ' || e.key === 'Enter') && release(p)}
              >
                <span>{p.label}</span>
                <small>{noteName(p.note)}</small>
              </button>
            )
          })}
        </div>
        <div className="midi__faders">
          <VFader label="Intensity" cc={7} value={look.dim} onChange={fader('dim', 7, 'Intensity')} />
          <VFader label="Speed" cc={1} value={look.speed} onChange={fader('speed', 1, 'Speed')} />
          <VFader label="Beam" cc={2} value={look.width ?? 0.5} onChange={fader('width', 2, 'Beam width')} />
        </div>
        <ol className="midi__log" aria-live="polite">
          {log.map((l, i) => (
            <li key={i + l}>{l}</li>
          ))}
        </ol>
      </div>
    </div>
  )
}

/* ─────────────── Every cue is a decision: a cue list with a GO button ─────────────── */

const CUES: { name: string; look: Look }[] = [
  { name: 'Doors', look: { program: 'static', palette: 'amber', dim: 0.4, speed: 0.1, width: 0.7 } },
  { name: 'Warm-up', look: { program: 'sweep', palette: 'amber', dim: 0.65, speed: 0.15, width: 0.5 } },
  { name: 'Build', look: { program: 'fan', palette: 'white', dim: 0.85, speed: 0.45, width: 0.35 } },
  { name: 'Drop', look: { program: 'circle', palette: 'ruby', dim: 1, speed: 0.8, width: 0.25 } },
  { name: 'Breakdown', look: { program: 'mirror', palette: 'ice', dim: 0.55, speed: 0.12, width: 0.6 } },
  { name: 'Last track', look: { program: 'static', palette: 'white', dim: 0.75, speed: 0.1, width: 0.8 } },
]

export function CueScene() {
  const [cue, setCue] = useState(0)
  const [fade, setFade] = useState(2.5)
  const [count, setCount] = useState(0) // GO presses, so pressing GO on the same cue restarts the fade
  const ctl = useRef({ cue, fade, count })
  useEffect(() => {
    ctl.current = { cue, fade, count }
  }, [cue, fade, count])
  const bar = useRef<HTMLSpanElement>(null)
  const make = useMemo(
    () => (): Draw => {
      const rig = makeRig()
      let seen = -1
      let started = 0
      return (f) => {
        const { cue: q, fade: fd, count: n } = ctl.current
        if (n !== seen) {
          seen = n
          started = f.t
        }
        rig.step(CUES[q].look, f.t, f.dt, 3.2 / Math.max(0.3, fd))
        rig.draw(f, -0.08)
        const p = Math.min(1, (f.t - started) / fd)
        bar.current?.style.setProperty('--p', String(p))
      }
    },
    [],
  )
  const go = (i = (cue + 1) % CUES.length) => {
    setCue(i)
    setCount((n) => n + 1)
  }
  return (
    <div className="cues">
      <Stage make={make} className="light-scene light-scene--rig" />
      <div className="cues__desk">
        <ol className="cues__list">
          {CUES.map((q, i) => (
            <li key={q.name}>
              <button className={i === cue ? 'is-on' : ''} onClick={() => go(i)}>
                <span className="cues__n">{i + 1}</span>
                <span className="cues__name">{q.name}</span>
                <span className="cues__meta">
                  {q.look.program} · {q.look.palette} · {Math.round(q.look.dim * 100)}%
                </span>
              </button>
            </li>
          ))}
        </ol>
        <div className="cues__controls">
          <label className="cues__fade">
            <span>Fade</span>
            <input
              type="range"
              min={0.3}
              max={6}
              step={0.1}
              value={fade}
              onChange={(e) => setFade(+e.target.value)}
              aria-label="Fade time"
            />
            <output>{fade.toFixed(1)} s</output>
          </label>
          <span ref={bar} className="cues__progress" aria-hidden />
          <button className="cues__go" onClick={() => go()}>
            GO
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────── Pixel mapping: the LED surface as a canvas ─────────────── */

type Fx = 'gradient' | 'travel' | 'ripple' | 'mark'

// the pixel palette: amber, ruby, violet and ice, blended around a loop
const WARM = [
  [255, 168, 64],
  [235, 40, 62],
  [150, 84, 255],
  [150, 205, 255],
]
function warm(u: number) {
  const x = (((u % 1) + 1) % 1) * WARM.length
  const i = Math.floor(x)
  const k = x - i
  const a = WARM[i]
  const b = WARM[(i + 1) % WARM.length]
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
}

const makePixels = (ctl: { current: Fx }): Draw => {
  const cols = 48
  const rows = 18
  const ripples: { x: number; y: number; t: number }[] = []
  let lastAdd = 0
  let mark: boolean[] | null = null
  return ({ c, w, h, t, dpr, pointer }) => {
    if (!mark) {
      const off = document.createElement('canvas')
      off.width = cols
      off.height = rows
      const o = off.getContext('2d')!
      const k = (rows * 0.8) / 806
      o.translate(cols / 2 - (1485 * k) / 2, rows * 0.1)
      o.scale(k, k)
      o.fillStyle = '#fff'
      o.fill(new Path2D(VA_MARK_PATH), 'evenodd')
      const d = o.getImageData(0, 0, cols, rows).data
      mark = Array.from({ length: cols * rows }, (_, i) => d[i * 4 + 3] > 90)
    }
    const fx = ctl.current
    if (pointer.active && t - lastAdd > 0.08) {
      ripples.push({ x: pointer.x * cols, y: pointer.y * rows, t })
      lastAdd = t
    }
    if (!pointer.active && fx === 'ripple' && t - lastAdd > 1.1) {
      ripples.push({ x: Math.random() * cols, y: Math.random() * rows, t })
      lastAdd = t
    }
    while (ripples.length && t - ripples[0].t > 3) ripples.shift()
    const gap = Math.min(w / cols, (h - 30 * dpr) / rows)
    const ox = (w - gap * cols) / 2
    const oy = (h - 24 * dpr - gap * rows) / 2
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        let v = 0
        let hue = 0
        if (fx === 'gradient') {
          hue = (i / cols) * 0.75 + t * 0.05
          v = 0.55 + 0.45 * Math.sin(i * 0.15 + j * 0.25 + t)
        } else if (fx === 'travel') {
          const band = (i - t * 14) % 12
          v = Math.max(0, 1 - Math.abs(((band + 12) % 12) - 6) / 2.2)
          hue = 0.08
        } else if (fx === 'mark') {
          const sweep = Math.exp(-Math.pow((i - ((t * 16) % (cols + 20)) + 10) / 4, 2))
          v = mark[j * cols + i] ? 0.55 + 0.45 * sweep : sweep * 0.25
          hue = 0.1
        }
        for (const r of ripples) {
          const age = t - r.t
          const d = Math.hypot(i - r.x, (j - r.y) * 1.2)
          v += Math.max(0, 1 - Math.abs(d - age * 14) / 2) * (1 - age / 3)
          hue = fx === 'ripple' ? 0.03 + d * 0.004 : hue
        }
        v = Math.min(1, v)
        const [r, g, b] = warm(hue)
        c.fillStyle = v > 0.04 ? `rgba(${r | 0},${g | 0},${b | 0},${0.1 + v * 0.9})` : `${INK}0.06)`
        c.beginPath()
        c.arc(ox + (i + 0.5) * gap, oy + (j + 0.5) * gap, gap * 0.36, 0, Math.PI * 2)
        c.fill()
      }
    }
    tag(c, `${cols * rows} pixels · ${Math.ceil((cols * rows * 3) / 510)} universes`, 12 * dpr, h - 8 * dpr, dpr, 0.5)
    tag(c, 'Draw on it', w - 12 * dpr, h - 8 * dpr, dpr, 0.4, 'right')
  }
}

export function PixelScene() {
  const [fx, setFx] = useState<Fx>('gradient')
  const ctl = useRef(fx)
  useEffect(() => {
    ctl.current = fx
  }, [fx])
  const make = useMemo(() => () => makePixels(ctl), [])
  const FX: [Fx, string][] = [
    ['gradient', 'Gradient'],
    ['travel', 'Travelling'],
    ['ripple', 'Ripples'],
    ['mark', 'Our mark'],
  ]
  return (
    <div className="scene-panel">
      <div className="scene-tabs" role="tablist" aria-label="Pixel effect">
        {FX.map(([id, name]) => (
          <button key={id} role="tab" aria-selected={fx === id} className={fx === id ? 'is-on' : ''} onClick={() => setFx(id)}>
            {name}
          </button>
        ))}
      </div>
      <Stage make={make} className="light-scene light-scene--pixels" />
    </div>
  )
}

/* ─────────────── The control system: a DMX patch, live ─────────────── */

type Patch = { name: string; start: number; count: number; chans: string[] }

const BEAM_CH = [
  'Colour',
  'Strobe',
  'Dimmer',
  'Gobo',
  'Prism',
  'Prism rotate',
  'Focus',
  'Pan',
  'Pan fine',
  'Tilt',
  'Tilt fine',
  'Function',
  'Reset',
  'Lamp',
  'P/T speed',
  'Frost',
]
const RGBW = (n: number) => Array.from({ length: n }, (_, i) => `${['Red', 'Green', 'Blue'][i % 3]} ${Math.floor(i / 3) + 1}`)

const UNIVERSES: { name: string; patch: Patch[] }[] = [
  {
    name: 'Universe 1',
    patch: [
      ...[0, 1, 2, 3].map((k) => ({ name: `Beam moving head ${k + 1}`, start: 1 + k * 16, count: 16, chans: BEAM_CH })),
      ...[0, 1].map((k) => ({
        name: `Retro 3-blade fan ${k + 1}`,
        start: 65 + k * 12,
        count: 12,
        chans: ['Dimmer', 'Strobe', 'Rotate', 'Speed', ...RGBW(6), 'Macro', 'Mode'],
      })),
      ...[0, 1].map((k) => ({
        name: `Retro hex light ${k + 1}`,
        start: 89 + k * 10,
        count: 10,
        chans: ['Dimmer', 'Strobe', ...RGBW(6), 'Macro', 'Mode'],
      })),
      ...[0, 1].map((k) => ({
        name: `Warcraft retro light ${k + 1}`,
        start: 109 + k * 8,
        count: 8,
        chans: ['Dimmer', 'Strobe', 'Pan', 'Tilt', 'Warm', 'Amber', 'Effect', 'Speed'],
      })),
      ...[0, 1, 2, 3].map((k) => ({ name: `LED wall washer ${k + 1}`, start: 129 + k * 12, count: 12, chans: RGBW(12) })),
    ],
  },
  {
    name: 'Universe 2',
    patch: [
      ...[0, 1].map((k) => ({ name: `LED matrix panel ${k + 1}`, start: 1 + k * 75, count: 75, chans: RGBW(75) })),
      ...[0, 1, 2, 3].map((k) => ({ name: `LED pixel bar ${k + 1}`, start: 151 + k * 48, count: 48, chans: RGBW(48) })),
      { name: 'LED neon flex', start: 343, count: 3, chans: RGBW(3) },
    ],
  },
]

const makePatch =
  (ctl: { current: number }): Draw =>
  ({ c, w, h, t, dpr, pointer }) => {
    const U = UNIVERSES[ctl.current]
    const cols = 32
    const rows = 16
    const top = 34 * dpr
    const cell = Math.min((w - 20 * dpr) / cols, (h - top - 30 * dpr) / rows)
    const ox = (w - cell * cols) / 2
    const find = (ch: number) => U.patch.find((p) => ch >= p.start && ch < p.start + p.count)
    let hover: { ch: number; p?: Patch } | null = null
    if (pointer.active) {
      const i = Math.floor((pointer.x * w - ox) / cell)
      const j = Math.floor((pointer.y * h - top) / cell)
      if (i >= 0 && i < cols && j >= 0 && j < rows) hover = { ch: j * cols + i + 1, p: find(j * cols + i + 1) }
    }
    const auto = hover ?? { ch: 1 + ((Math.floor(t * 0.5) * 37) % 360), p: undefined }
    const focus = hover?.p ?? find(auto.ch)
    for (let ch = 1; ch <= 512; ch++) {
      const i = (ch - 1) % cols
      const j = Math.floor((ch - 1) / cols)
      const p = find(ch)
      const x = ox + i * cell
      const y = top + j * cell
      if (!p) {
        c.fillStyle = `${INK}0.04)`
        c.fillRect(x + 1, y + 1, cell - 2, cell - 2)
        continue
      }
      const idx = U.patch.indexOf(p)
      const val = 0.5 + 0.5 * Math.sin(t * (0.7 + (ch % 7) * 0.31) + ch)
      const on = p === focus
      c.fillStyle =
        idx % 2 ? `rgba(184,164,123,${0.18 + val * (on ? 0.7 : 0.35)})` : `rgba(240,237,229,${0.1 + val * (on ? 0.6 : 0.25)})`
      c.fillRect(x + 1, y + 1, cell - 2, cell - 2)
      if (on) {
        c.strokeStyle = 'rgba(184,164,123,0.9)'
        c.lineWidth = dpr
        c.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1)
      }
    }
    if (hover) {
      c.strokeStyle = `${INK}1)`
      c.lineWidth = 2 * dpr
      c.strokeRect(ox + ((hover.ch - 1) % cols) * cell, top + Math.floor((hover.ch - 1) / cols) * cell, cell, cell)
    }
    const f = focus
    const pad = (n: number) => String(n).padStart(3, '0')
    if (f) {
      const ch = hover?.p ? hover.ch : f.start
      const fn = f.chans[(ch - f.start) % f.chans.length]
      const val = Math.round(255 * (0.5 + 0.5 * Math.sin(t * (0.7 + (ch % 7) * 0.31) + ch)))
      tag(c, `${f.name}  ·  ${pad(f.start)}–${pad(f.start + f.count - 1)}  ·  ${f.count} ch`, ox, 20 * dpr, dpr, 0.9)
      tag(c, `ch ${pad(ch)} ${fn}  ${val}`, w - ox, 20 * dpr, dpr, 0.6, 'right')
    } else if (hover) tag(c, `ch ${pad(hover.ch)}  ·  free`, ox, 20 * dpr, dpr, 0.6)
    const used = U.patch.reduce((s, p) => s + p.count, 0)
    tag(c, `${U.name} · Art-Net · ${used} of 512 channels used`, ox, h - 8 * dpr, dpr, 0.5)
  }

export function PatchScene() {
  const [u, setU] = useState(0)
  const ctl = useRef(u)
  useEffect(() => {
    ctl.current = u
  }, [u])
  const make = useMemo(() => () => makePatch(ctl), [])
  return (
    <div className="scene-panel">
      <div className="scene-tabs" role="tablist" aria-label="Universe">
        {UNIVERSES.map((x, i) => (
          <button key={x.name} role="tab" aria-selected={u === i} className={u === i ? 'is-on' : ''} onClick={() => setU(i)}>
            {x.name}
          </button>
        ))}
      </div>
      <Stage make={make} className="light-scene light-scene--patch" />
      <p className="scene-panel__note">
        An example patch for our own rig. Hover any channel to see what it controls; the values move as a show would drive them.
      </p>
    </div>
  )
}
