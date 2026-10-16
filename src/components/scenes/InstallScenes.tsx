import { useEffect, useMemo, useRef, useState } from 'react'
import type { Draw } from './draw'
import { BRASS, fract, hash, INK, tag } from './kit'
import { Stage } from './Stage'

// The Installations page's scene: a lounge bar with a permanent system, run from a wall keypad
// through the day. Drawn on a dark stage like the other service scenes.

export type Preset = 'open' | 'service' | 'evening' | 'late' | 'close'

type Look = {
  name: string
  time: string
  hour: number // when the automation recalls it
  temp: readonly number[] // colour of the white light
  down: number // downlights
  cove: number // the cove line in the ceiling
  coveCol: readonly number[]
  wash: number // wall washers
  shelf: number // back-bar shelves
  music: [number, number, number] // levels in the lounge, at the bar, on the terrace
  visual: number // the visual wall
  note: string
}

const COOL = [235, 240, 255] as const
const WARM = [255, 196, 140] as const
const AMBER = [255, 150, 70] as const
const VIOLET = [170, 110, 255] as const

const PRESETS: Record<Preset, Look> = {
  open: {
    name: 'Open',
    time: '10:00',
    hour: 10,
    temp: COOL,
    down: 0.8,
    cove: 0.3,
    coveCol: COOL,
    wash: 0.4,
    shelf: 0.5,
    music: [0.25, 0.2, 0.3],
    visual: 0,
    note: 'Daylight whites, background music at a conversational level, the visual wall resting.',
  },
  service: {
    name: 'Service',
    time: '13:00',
    hour: 13,
    temp: WARM,
    down: 0.65,
    cove: 0.5,
    coveCol: WARM,
    wash: 0.55,
    shelf: 0.75,
    music: [0.4, 0.45, 0.35],
    visual: 0.35,
    note: 'Warmer light for lunch, a little more music at the bar, a slow image on the wall.',
  },
  evening: {
    name: 'Evening',
    time: '19:30',
    hour: 19.5,
    temp: WARM,
    down: 0.35,
    cove: 0.75,
    coveCol: AMBER,
    wash: 0.7,
    shelf: 0.9,
    music: [0.55, 0.6, 0.45],
    visual: 0.7,
    note: 'Lower, warmer and more intimate: the walls and the bar carry the light, the music lifts.',
  },
  late: {
    name: 'Late',
    time: '23:00',
    hour: 23,
    temp: WARM,
    down: 0.12,
    cove: 1,
    coveCol: VIOLET,
    wash: 0.55,
    shelf: 0.7,
    music: [0.85, 0.75, 0.2],
    visual: 1,
    note: 'Colour in the ceiling, the visual wall responding to the music, levels up inside and down on the terrace.',
  },
  close: {
    name: 'Close',
    time: '01:30',
    hour: 1.5,
    temp: COOL,
    down: 1,
    cove: 0,
    coveCol: COOL,
    wash: 0.2,
    shelf: 0.3,
    music: [0, 0, 0],
    visual: 0,
    note: 'Bright, even light for closing down, the music off, everything left ready for tomorrow.',
  },
}

const PRESET_ORDER: Preset[] = ['open', 'service', 'evening', 'late', 'close']

const makeInstall = (ctl: { current: { preset: Preset; auto: boolean } }): Draw => {
  const cur = {
    temp: [...PRESETS.open.temp],
    coveCol: [...PRESETS.open.coveCol],
    down: 0,
    cove: 0,
    wash: 0,
    shelf: 0,
    music: [0, 0, 0],
    visual: 0,
  }
  return ({ c, w, h, t, dt, dpr }) => {
    const L = PRESETS[ctl.current.preset]
    const k = 1 - Math.exp(-dt * 1.8) // presets fade, as they would in the room
    for (let j = 0; j < 3; j++) {
      cur.temp[j] += (L.temp[j] - cur.temp[j]) * k
      cur.coveCol[j] += (L.coveCol[j] - cur.coveCol[j]) * k
      cur.music[j] += (L.music[j] - cur.music[j]) * k
    }
    cur.down += (L.down - cur.down) * k
    cur.cove += (L.cove - cur.cove) * k
    cur.wash += (L.wash - cur.wash) * k
    cur.shelf += (L.shelf - cur.shelf) * k
    cur.visual += (L.visual - cur.visual) * k
    const rgb = (col: readonly number[], a: number) => `rgba(${col.map(Math.round).join(',')},${a})`
    const beat = Math.exp(-fract((t * 118) / 60) * 5) * cur.music[0]

    const ceil = h * 0.14
    const floor = h * 0.8
    const x0 = w * 0.04
    const x1 = w * 0.96
    // the room
    c.fillStyle = '#0d0c0b'
    c.fillRect(x0, ceil, x1 - x0, floor - ceil)
    c.strokeStyle = `${INK}0.22)`
    c.lineWidth = dpr
    c.strokeRect(x0, ceil, x1 - x0, floor - ceil)
    // the terrace doors, at the left
    const tx = w * 0.08
    const tw = w * 0.12
    c.strokeStyle = `${INK}0.25)`
    c.strokeRect(tx, ceil + h * 0.12, tw, floor - ceil - h * 0.12)
    c.beginPath()
    c.moveTo(tx + tw / 2, ceil + h * 0.12)
    c.lineTo(tx + tw / 2, floor)
    c.stroke()
    tag(c, 'Terrace', tx + tw / 2, ceil + h * 0.1, dpr, 0.4, 'center')

    // wall washers grazing the back wall
    c.globalCompositeOperation = 'lighter'
    for (const x of [0.3, 0.42, 0.54]) {
      const g = c.createLinearGradient(w * x, ceil, w * x, floor)
      g.addColorStop(0, rgb(cur.temp, 0.32 * cur.wash))
      g.addColorStop(1, rgb(cur.temp, 0))
      c.fillStyle = g
      c.beginPath()
      c.moveTo(w * x - 4 * dpr, ceil + 4 * dpr)
      c.lineTo(w * x - w * 0.06, floor)
      c.lineTo(w * x + w * 0.06, floor)
      c.lineTo(w * x + 4 * dpr, ceil + 4 * dpr)
      c.fill()
    }
    // downlights
    for (let i = 0; i < 7; i++) {
      const x = w * (0.24 + i * 0.105)
      const g = c.createLinearGradient(x, ceil, x, floor)
      g.addColorStop(0, rgb(cur.temp, 0.28 * cur.down))
      g.addColorStop(1, rgb(cur.temp, 0.03 * cur.down))
      c.fillStyle = g
      c.beginPath()
      c.moveTo(x - 3 * dpr, ceil)
      c.lineTo(x - w * 0.035, floor)
      c.lineTo(x + w * 0.035, floor)
      c.lineTo(x + 3 * dpr, ceil)
      c.fill()
      c.fillStyle = rgb(cur.temp, 0.3 + 0.7 * cur.down)
      c.fillRect(x - 5 * dpr, ceil, 10 * dpr, 2 * dpr)
    }
    // the cove line along the ceiling
    const cg = c.createLinearGradient(0, ceil, 0, ceil + h * 0.08)
    cg.addColorStop(0, rgb(cur.coveCol, 0.55 * cur.cove))
    cg.addColorStop(1, rgb(cur.coveCol, 0))
    c.fillStyle = cg
    c.fillRect(x0, ceil, x1 - x0, h * 0.08)
    c.fillStyle = rgb(cur.coveCol, 0.4 + 0.6 * cur.cove)
    c.fillRect(x0, ceil, x1 - x0, 2 * dpr)
    c.globalCompositeOperation = 'source-over'

    // the visual wall
    const vx = w * 0.3
    const vw = w * 0.26
    const vy = ceil + h * 0.1
    const vh = h * 0.28
    c.fillStyle = '#050505'
    c.fillRect(vx, vy, vw, vh)
    c.strokeStyle = `${INK}0.2)`
    c.strokeRect(vx, vy, vw, vh)
    if (cur.visual > 0.02) {
      c.save()
      c.beginPath()
      c.rect(vx, vy, vw, vh)
      c.clip()
      c.strokeStyle = `rgba(240,240,250,${0.7 * cur.visual})`
      for (let i = 0; i < 18; i++) {
        const y = vy + ((i + 0.5) / 18) * vh
        c.beginPath()
        for (let x = 0; x <= vw; x += 4 * dpr) {
          const u = x / vw
          const d = Math.sin(u * 7 + t * 0.4 + i * 0.35) * vh * 0.04 * (1 + beat * 2 * cur.visual)
          if (x) c.lineTo(vx + x, y + d)
          else c.moveTo(vx, y + d)
        }
        c.stroke()
      }
      c.restore()
    }
    tag(c, 'Visual wall', vx, vy - 6 * dpr, dpr, 0.4)

    // the bar: counter, and lit shelves behind it
    const bx = w * 0.64
    const bw = w * 0.3
    for (let s = 0; s < 3; s++) {
      const y = ceil + h * (0.14 + s * 0.09)
      c.fillStyle = rgb(WARM, 0.15 + 0.5 * cur.shelf)
      c.fillRect(bx, y, bw, 2 * dpr)
      const g = c.createLinearGradient(0, y, 0, y - h * 0.06)
      g.addColorStop(0, rgb(WARM, 0.25 * cur.shelf))
      g.addColorStop(1, 'rgba(0,0,0,0)')
      c.fillStyle = g
      c.fillRect(bx, y - h * 0.06, bw, h * 0.06)
      for (let b = 0; b < 9; b++) {
        const x = bx + (b + 0.5) * (bw / 9)
        c.fillStyle = `rgba(30,28,26,0.95)`
        c.fillRect(x - 3 * dpr, y - h * (0.03 + hash(b + s * 9) * 0.025), 6 * dpr, h * (0.03 + hash(b + s * 9) * 0.025))
      }
    }
    c.fillStyle = '#1a1917'
    c.strokeStyle = `${INK}0.3)`
    c.fillRect(bx - w * 0.01, floor - h * 0.14, bw + w * 0.02, h * 0.14)
    c.strokeRect(bx - w * 0.01, floor - h * 0.14, bw + w * 0.02, h * 0.14)
    tag(c, 'Bar', bx + bw / 2, floor - h * 0.06, dpr, 0.4, 'center')
    // lounge tables
    for (const x of [0.32, 0.45]) {
      c.fillStyle = '#1a1917'
      c.fillRect(w * x - w * 0.04, floor - h * 0.08, w * 0.08, 3 * dpr)
      c.fillRect(w * x - dpr, floor - h * 0.08, 2 * dpr, h * 0.08)
    }
    // loudspeakers, in the ceiling and on the walls, playing per zone
    const zones: [number, number, number][] = [
      [w * 0.27, ceil + 6 * dpr, 0],
      [w * 0.47, ceil + 6 * dpr, 0],
      [w * 0.7, ceil + 6 * dpr, 1],
      [w * 0.88, ceil + 6 * dpr, 1],
      [tx + tw / 2, ceil + h * 0.06, 2],
    ]
    zones.forEach(([x, y, z]) => {
      const lvl = cur.music[z]
      c.fillStyle = '#22211e'
      c.strokeStyle = `${BRASS}0.8)`
      c.beginPath()
      c.arc(x, y, 5 * dpr, 0, Math.PI * 2)
      c.fill()
      c.stroke()
      for (let r = 0; r < 3; r++) {
        const rr = (1 - fract(t * 0.8 + r / 3)) * 30 * dpr + 6 * dpr
        c.strokeStyle = `${BRASS}${lvl * 0.5 * (1 - (rr - 6 * dpr) / (30 * dpr))})`
        c.beginPath()
        c.arc(x, y, rr, 0.2, Math.PI - 0.2)
        c.stroke()
      }
    })
    // the floor
    c.strokeStyle = `${INK}0.3)`
    c.beginPath()
    c.moveTo(0, floor)
    c.lineTo(w, floor)
    c.stroke()

    // what the system is doing
    const names = ['Lounge', 'Bar', 'Terrace']
    names.forEach((n, i) => {
      const x = w * 0.04 + i * w * 0.2
      const y = floor + h * 0.09
      tag(c, n, x, y, dpr, 0.55)
      c.fillStyle = `${INK}0.08)`
      c.fillRect(x, y + 6 * dpr, w * 0.16, 4 * dpr)
      c.fillStyle = `${BRASS}0.9)`
      c.fillRect(x, y + 6 * dpr, w * 0.16 * cur.music[i], 4 * dpr)
    })
    tag(
      c,
      ctl.current.auto ? `Automatic · ${L.time} · ${L.name}` : `Keypad · ${L.name}`,
      w - 14 * dpr,
      h * 0.08,
      dpr,
      0.75,
      'right',
      BRASS,
    )
    tag(c, 'Audio zones', w * 0.04, h * 0.08, dpr, 0.45)
  }
}

export function InstallScene() {
  const [preset, setPreset] = useState<Preset>('evening')
  const [auto, setAuto] = useState(true)
  const ctl = useRef({ preset, auto })
  useEffect(() => {
    ctl.current = { preset, auto }
  }, [preset, auto])
  // automation: the day runs through its presets on a schedule
  useEffect(() => {
    if (!auto || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setTimeout(() => setPreset((p) => PRESET_ORDER[(PRESET_ORDER.indexOf(p) + 1) % PRESET_ORDER.length]), 5200)
    return () => window.clearTimeout(id)
  }, [preset, auto])
  const make = useMemo(() => () => makeInstall(ctl), [])
  const L = PRESETS[preset]
  return (
    <div className="scene-panel">
      <Stage make={make} className="vis-scene inst-scene" />
      <div className="keypad" role="group" aria-label="Wall keypad">
        {PRESET_ORDER.map((p) => (
          <button
            key={p}
            aria-pressed={p === preset}
            className={p === preset ? 'is-on' : ''}
            onClick={() => {
              setAuto(false)
              setPreset(p)
            }}
          >
            <i aria-hidden />
            {PRESETS[p].name}
          </button>
        ))}
        <button aria-pressed={auto} className={`keypad__auto ${auto ? 'is-on' : ''}`} onClick={() => setAuto((a) => !a)}>
          <i aria-hidden />
          Auto
        </button>
      </div>
      <p className="scene-panel__note" aria-live="polite">
        <strong>
          {L.name} · {L.time}.
        </strong>{' '}
        {L.note}
      </p>
    </div>
  )
}
