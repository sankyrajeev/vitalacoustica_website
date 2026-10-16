import { useEffect, useMemo, useRef, useState } from 'react'
import { camera, type Draw, type Frame } from './draw'
import { BRASS, font, fract, hash, INK, tag } from './kit'
import { BPM, makeListener } from './listen'
import { cableLegend, makeVenue, type Part, type VenueLook } from './productionVenue'
import { Stage } from './Stage'
import { Link } from '../Link'

// Interactive scenes for the Production page: the whole environment, and how its systems relate.
// Drawn on a dark stage whatever the site's theme, like the Light and Visuals scenes.

/** The venue camera: turned by `yaw`, centred on the room. */
function venueCam(f: Frame, yaw: number, pitch = 0.32, zoom = 1, cy = 0.56) {
  const proj = camera({ cx: f.w / 2, cy: f.h * cy, scale: (Math.min(f.w, f.h * 1.55) / 14.5) * zoom, yaw, pitch, persp: 26 })
  return (x: number, y: number, z: number) => proj([x, y - 2, z - 1.5])
}

/* ─────────────── Header: one production, assembled ─────────────── */

const ASSEMBLY: [Part, string][] = [
  ['stage', 'Space'],
  ['sound', 'Sound'],
  ['light', 'Light'],
  ['visuals', 'Visuals'],
  ['dj', 'DJ'],
  ['infra', 'Systems'],
]

const makeHero = (): Draw => {
  const venue = makeVenue()
  const listen = makeListener()
  let yaw = -0.3
  return (f) => {
    const { c, w, h, t, dt, dpr, pointer } = f
    const a = listen(t, null)
    // start on the finished show, then take it apart and build it again
    const tl = (t + 12) % 26
    const live = tl > 11.5 && tl < 24.5
    const n = Math.min(ASSEMBLY.length, Math.floor(tl / 1.8) + 1)
    const show: VenueLook['show'] = {}
    ASSEMBLY.forEach(([p], i) => (show[p] = tl < 24.5 && (i < n || live) ? 1 : 0))
    venue.step(
      {
        show,
        lit: live ? 1 : 0,
        crowd: live ? 1 : 0,
        xray: tl > 9 && tl < 12.5 ? 1 : 0,
        color: a.section === 'Drop' ? [235, 236, 245] : [255, 176, 104],
      },
      dt,
      3,
    )
    if (pointer.down) yaw = Math.max(-1.2, Math.min(1.2, yaw + pointer.dx * 2.5))
    else yaw += (-0.3 + 0.18 * Math.sin(t * 0.07) - yaw) * 0.006
    venue.draw(f, venueCam(f, yaw), a)
    // the caption: the parts, then the whole
    const y = h - 16 * dpr
    if (live) tag(c, 'One production', w / 2, y, dpr, 0.95, 'center', BRASS)
    else {
      const k = Math.min(n, ASSEMBLY.length) - 1
      tag(
        c,
        `${ASSEMBLY.slice(0, k + 1)
          .map(([, name]) => name)
          .join(' · ')}`,
        w / 2,
        y,
        dpr,
        0.75,
        'center',
      )
    }
    tag(c, 'Drag to look around', w / 2, 22 * dpr, dpr, 0.35, 'center')
  }
}

export const ProductionHero = () => <Stage make={makeHero} className="vis-scene prod-scene--hero" />

/* ─────────────── We see the entire system: separately, or as one ─────────────── */

const SECTION_AT: [number, string][] = [
  [0, 'Intro'],
  [8, 'Build'],
  [16, 'Drop'],
  [28, 'Breakdown'],
]
const LIGHT_CUES = ['Ambient', 'Chase', 'Full', 'Slow']
const VISUAL_CUES = ['Haze', 'Grid', 'Rings', 'Drift']
const PLANS = {
  one: { light: [0, 8, 16, 28], visuals: [0, 8, 16, 28], control: [0, 8, 16, 28], bpm: BPM },
  apart: { light: [0, 5.5, 13, 21.5], visuals: [3, 11, 19.5, 26], control: [1, 9.5, 18.5, 25], bpm: 117 },
}

/** Which cue is running at `bar`, on a 32-bar loop. */
const cueAt = (cues: number[], bar: number) => {
  let k = cues.length - 1
  for (let i = 0; i < cues.length; i++) if (bar >= cues[i]) k = i
  return k
}

const makeIntegration = (ctl: { current: 'one' | 'apart' }): Draw => {
  const listen = makeListener()
  return ({ c, w, h, t, dpr }) => {
    const mode = ctl.current
    const plan = PLANS[mode]
    const a = listen(t, null)
    const now = ((((t * BPM) / 60 / 4) % 32) + 32) % 32 // bars
    const lightBeat = fract((t * plan.bpm) / 60)
    const lc = cueAt(plan.light, now)
    const vc = cueAt(plan.visuals, now)
    const section = [...SECTION_AT].reverse().find(([s]) => now >= s)![1]

    // the room, front on
    const top = h * 0.06
    const floor = h * 0.4
    c.strokeStyle = `${INK}0.25)`
    c.lineWidth = dpr
    c.beginPath()
    c.moveTo(w * 0.04, floor)
    c.lineTo(w * 0.96, floor)
    c.moveTo(w * 0.14, top)
    c.lineTo(w * 0.86, top)
    c.stroke()
    // the screen, showing its own cue
    const sx = w * 0.38
    const sw = w * 0.24
    const sy = top + h * 0.05
    const sh = h * 0.2
    c.fillStyle = '#0a0a0a'
    c.fillRect(sx, sy, sw, sh)
    c.save()
    c.beginPath()
    c.rect(sx, sy, sw, sh)
    c.clip()
    c.fillStyle = `${INK}0.75)`
    const cx = sx + sw / 2
    const cy = sy + sh / 2
    if (vc === 0)
      for (let i = 0; i < 40; i++) c.fillRect(sx + hash(i) * sw, sy + fract(hash(i + 9) + t * 0.03) * sh, 2 * dpr, 2 * dpr)
    else if (vc === 1) {
      c.strokeStyle = `${INK}0.6)`
      c.beginPath()
      for (let x = sx + ((t * 20 * dpr) % (sw / 8)); x < sx + sw; x += sw / 8) {
        c.moveTo(x, sy)
        c.lineTo(x, sy + sh)
      }
      c.stroke()
    } else if (vc === 2) {
      c.strokeStyle = `${INK}0.85)`
      for (let k = 0; k < 6; k++) {
        c.beginPath()
        c.arc(cx, cy, fract(k / 6 + t * 0.4) * sw * 0.6, 0, Math.PI * 2)
        c.stroke()
      }
    } else {
      c.strokeStyle = `${INK}0.4)`
      c.beginPath()
      for (let x = 0; x <= sw; x += 4 * dpr) c.lineTo(sx + x, cy + Math.sin(x / (sw * 0.15) + t * 0.6) * sh * 0.25)
      c.stroke()
    }
    c.restore()
    // the lights, playing their own cue to their own clock
    c.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 6; i++) {
      const x = w * (0.18 + i * 0.128)
      let v = 0.2
      let ang = (i - 2.5) * 0.08
      if (lc === 0) v = 0.25
      else if (lc === 1) v = Math.floor(lightBeat * 6) === i || Math.floor((t * plan.bpm) / 60) % 6 === i ? 0.9 : 0.12
      else if (lc === 2) v = 0.35 + 0.65 * Math.exp(-lightBeat * 5)
      else {
        v = 0.3
        ang += Math.sin(t * 0.4 + i) * 0.25
      }
      const len = floor - top
      const ex = x + Math.sin(ang) * len
      const g = c.createLinearGradient(x, top, ex, floor)
      g.addColorStop(0, `rgba(255,214,160,${0.6 * v})`)
      g.addColorStop(1, `rgba(255,214,160,${0.05 * v})`)
      c.fillStyle = g
      c.beginPath()
      c.moveTo(x - 2 * dpr, top)
      c.lineTo(ex - 14 * dpr, floor)
      c.lineTo(ex + 14 * dpr, floor)
      c.lineTo(x + 2 * dpr, top)
      c.fill()
    }
    c.globalCompositeOperation = 'source-over'
    // speakers, breathing with the music's own beat
    for (const x of [w * 0.06, w * 0.94]) {
      c.fillStyle = '#1b1a18'
      c.strokeStyle = `${INK}0.35)`
      c.fillRect(x - 9 * dpr, floor - h * 0.17, 18 * dpr, h * 0.17)
      c.strokeRect(x - 9 * dpr, floor - h * 0.17, 18 * dpr, h * 0.17)
      c.fillStyle = `${BRASS}${0.3 + 0.7 * a.bass})`
      c.beginPath()
      c.arc(x, floor - h * 0.06, (4 + 3 * a.bass) * dpr, 0, Math.PI * 2)
      c.fill()
    }

    // the lanes: what each system does over the next bars
    const lx = w * 0.16
    const lw = w * 0.81
    const barW = lw / 16
    const from = now - 4
    const X = (bar: number) => lx + (bar - from) * barW
    const lanes: [string, number][] = [
      ['Music', h * 0.52],
      ['Light', h * 0.64],
      ['Visuals', h * 0.76],
      ['Control', h * 0.88],
    ]
    const lh = h * 0.08
    lanes.forEach(([name, y]) => {
      tag(c, name, 12 * dpr, y + lh * 0.6, dpr, 0.6)
      c.fillStyle = `${INK}0.04)`
      c.fillRect(lx, y, lw, lh)
    })
    c.save()
    c.beginPath()
    c.rect(lx, 0, lw, h)
    c.clip()
    // music: a bar of beats, with its sections named
    for (let b = Math.floor(from * 4); b < (from + 16) * 4; b++) {
      const bar = ((Math.floor(b / 4) % 32) + 32) % 32
      const e = bar < 8 ? 0.3 : bar < 16 ? 0.3 + ((bar - 8) / 8) * 0.6 : bar < 28 ? 1 : 0.2
      const x = X(b / 4)
      const kick = bar < 28
      const amp = (kick ? 0.55 : 0.15) * e + 0.1
      c.fillStyle = `${BRASS}${0.35 + 0.5 * e})`
      c.fillRect(x, lanes[0][1] + lh / 2 - (amp * lh) / 2, Math.max(1, barW / 4 - 2 * dpr), amp * lh)
    }
    for (let cyc = -1; cyc <= 1; cyc++)
      SECTION_AT.forEach(([s, name]) => {
        const x = X(s + cyc * 32)
        if (x < lx - 80 * dpr || x > lx + lw) return
        tag(c, name, x + 4 * dpr, lanes[0][1] - 5 * dpr, dpr, 0.55)
        if (mode === 'one') {
          c.strokeStyle = `${BRASS}0.55)`
          c.beginPath()
          c.moveTo(x, lanes[0][1])
          c.lineTo(x, lanes[3][1] + lh)
          c.stroke()
        }
      })
    // light, visuals and control: blocks between their cues
    const blocks = (cues: number[], names: string[] | null, y: number) => {
      for (let cyc = -1; cyc <= 1; cyc++)
        cues.forEach((s, i) => {
          const start = s + cyc * 32
          const end = (cues[i + 1] ?? 32) + cyc * 32
          const x0 = X(start)
          const x1 = X(end)
          if (x1 < lx || x0 > lx + lw) return
          if (names) {
            c.fillStyle = `${INK}${0.08 + i * 0.05})`
            c.fillRect(x0 + dpr, y + 3 * dpr, x1 - x0 - 2 * dpr, lh - 6 * dpr)
            c.font = font(10.5, dpr, 600)
            c.textAlign = 'left'
            c.fillStyle = `${INK}0.75)`
            c.fillText(names[i], x0 + 6 * dpr, y + lh * 0.62)
          } else {
            c.fillStyle = `${BRASS}0.9)`
            c.beginPath()
            c.moveTo(x0, y + 4 * dpr)
            c.lineTo(x0 + 5 * dpr, y + lh / 2)
            c.lineTo(x0, y + lh - 4 * dpr)
            c.lineTo(x0 - 5 * dpr, y + lh / 2)
            c.fill()
            tag(c, 'GO', x0 + 8 * dpr, y + lh * 0.62, dpr, 0.6)
          }
        })
    }
    blocks(plan.light, LIGHT_CUES, lanes[1][1])
    blocks(plan.visuals, VISUAL_CUES, lanes[2][1])
    blocks(plan.control, null, lanes[3][1])
    c.restore()
    // now
    const px = X(now)
    c.strokeStyle = `${INK}0.9)`
    c.beginPath()
    c.moveTo(px, lanes[0][1] - 2 * dpr)
    c.lineTo(px, lanes[3][1] + lh + 2 * dpr)
    c.stroke()
    tag(
      c,
      mode === 'one' ? 'Planned as one' : 'Planned separately',
      12 * dpr,
      20 * dpr,
      dpr,
      0.8,
      'left',
      mode === 'one' ? BRASS : INK,
    )
    tag(c, `Bar ${Math.floor(now) + 1} · ${section}`, w - 12 * dpr, 20 * dpr, dpr, 0.55, 'right')
  }
}

export function IntegrationScene() {
  const [mode, setMode] = useState<'one' | 'apart'>('one')
  const ctl = useRef(mode)
  useEffect(() => {
    ctl.current = mode
  }, [mode])
  const make = useMemo(() => () => makeIntegration(ctl), [])
  return (
    <div className="scene-panel">
      <div className="scene-bar">
        <div className="scene-switch" role="tablist" aria-label="Planning">
          <button
            role="tab"
            aria-selected={mode === 'apart'}
            className={mode === 'apart' ? 'is-on' : ''}
            onClick={() => setMode('apart')}
          >
            Planned separately
          </button>
          <button
            role="tab"
            aria-selected={mode === 'one'}
            className={mode === 'one' ? 'is-on' : ''}
            onClick={() => setMode('one')}
          >
            Planned as one
          </button>
        </div>
      </div>
      <Stage make={make} className="vis-scene prod-scene--lanes" />
      <p className="scene-panel__note" aria-live="polite">
        {mode === 'one'
          ? 'One timeline: the light, the image and the cues change with the music’s sections, and the lights keep the music’s tempo.'
          : 'Each system on its own clock: the lights run at their own tempo, and the looks change wherever someone happened to put them.'}
      </p>
    </div>
  )
}

/* ─────────────── Our disciplines: one venue, five layers ─────────────── */

type Discipline = {
  id: string
  parts: Part[]
  name: string
  title: string
  body: string
  kicker: string
  to?: string
}

const DISCIPLINES: Discipline[] = [
  {
    id: 'audio',
    parts: ['sound'],
    name: 'Audio',
    title: 'Engineered for the environment.',
    body: 'Professional audio is more than enough output. The experience depends on how the system is chosen, placed, configured and tuned for the room: its geometry, the audience’s coverage, how the low end spreads, the signal flow and the processing. We work with d&b audiotechnik, RCF and Pioneer DJ, using system-management software and structured routing from the booth to the main system.',
    kicker: 'Not just more sound. Better-engineered sound.',
    to: '/capabilities/sound',
  },
  {
    id: 'light',
    parts: ['light'],
    name: 'Lighting',
    title: 'Programmed for impact.',
    body: 'Light can define a focal point, build anticipation, change the perceived scale of a room or its energy in an instant. We go beyond placing fixtures: Lightkey, QLC+, control hardware and our own tools build scenes, cues, movement, colour, intensity and timing, with MIDI control and audio-reactive programming tying the light to the music.',
    kicker: 'We don’t simply light the venue. We program its atmosphere.',
    to: '/capabilities/light',
  },
  {
    id: 'visuals',
    parts: ['visuals'],
    name: 'Visuals',
    title: 'Beyond the screen.',
    body: 'A real-time workflow in development: TouchDesigner, generative graphics, audio analysis and AI-assisted development. Abstract, procedural visuals that evolve and respond to the music, made for architectural walls, suspended mesh, translucent materials and haze, so the physical space becomes part of the composition.',
    kicker: 'The visual isn’t just content. It’s another part of the experience.',
    to: '/capabilities/visuals',
  },
  {
    id: 'dj',
    parts: ['dj'],
    name: 'DJ systems',
    title: 'The control centre.',
    body: 'The booth is where music, performance and production meet. It has to be dependable, intuitive and properly connected: equipment configuration, signal routing, physical layout and its link to the main system. Pioneer DJ setups keep familiar workflows, and where the show calls for it the booth joins lighting control, MIDI and shared cues.',
    kicker: 'The DJ should be focused on the music, not the infrastructure behind it.',
  },
  {
    id: 'systems',
    parts: ['infra', 'custom'],
    name: 'Technical integration',
    title: 'Everything designed to communicate.',
    body: 'Signal routing, DMX addressing, networks, device compatibility, control interfaces, power and cabling decide how reliable and manageable an installation is. We plan them as part of the design, with clear control paths, and where it helps we connect systems with our own software, so information moves between the sound, the light and the image.',
    kicker: 'The best infrastructure is the part nobody has to think about.',
  },
]

const makeDisciplines = (ctl: { current: Discipline }): Draw => {
  const venue = makeVenue()
  const listen = makeListener()
  let yaw = -0.45
  return (f) => {
    const { t, dt, pointer } = f
    const d = ctl.current
    const a = listen(t, null)
    const systems = d.id === 'systems'
    venue.step(
      {
        show: { stage: 1, sound: 1, light: 1, visuals: 1, dj: 1, infra: 1, custom: systems ? 1 : 0 },
        lit: 1,
        crowd: 0.7,
        focus: d.parts,
        xray: systems ? 1 : 0,
        color: [255, 186, 120],
      },
      dt,
      4,
    )
    if (pointer.down) yaw = Math.max(-1.2, Math.min(1.2, yaw + pointer.dx * 2.5))
    else yaw += (-0.45 + 0.15 * Math.sin(t * 0.08) - yaw) * 0.005
    venue.draw(f, venueCam(f, yaw), a)
    if (systems) cableLegend(f.c, 14 * f.dpr, 24 * f.dpr, f.dpr, 1)
    else tag(f.c, d.name, 14 * f.dpr, 22 * f.dpr, f.dpr, 0.8, 'left', BRASS)
    tag(f.c, 'Drag to look around', f.w - 14 * f.dpr, 22 * f.dpr, f.dpr, 0.35, 'right')
  }
}

export function DisciplinesScene() {
  const [id, setId] = useState(DISCIPLINES[0].id)
  const d = DISCIPLINES.find((x) => x.id === id)!
  const ctl = useRef(d)
  useEffect(() => {
    ctl.current = d
  }, [d])
  const make = useMemo(() => () => makeDisciplines(ctl), [])
  return (
    <div className="disc">
      <div className="disc__side">
        <div className="disc__tabs" role="tablist" aria-label="Disciplines">
          {DISCIPLINES.map((x, i) => (
            <button
              key={x.id}
              role="tab"
              aria-selected={x.id === id}
              className={x.id === id ? 'is-on' : ''}
              onClick={() => setId(x.id)}
            >
              <span>{String(i + 1).padStart(2, '0')}</span>
              {x.name}
            </button>
          ))}
        </div>
        <div className="disc__text" aria-live="polite">
          <h3 className="h2">{d.title}</h3>
          <p>{d.body}</p>
          <p className="feature__kicker">{d.kicker}</p>
          {d.to && (
            <Link to={d.to} className="disc__more">
              More on {d.name.toLowerCase()} <span aria-hidden>→</span>
            </Link>
          )}
        </div>
      </div>
      <Stage make={make} className="vis-scene prod-scene--venue" />
    </div>
  )
}

/* ─────────────── End to end: the venue at every stage of the process ─────────────── */

const STEPS: { name: string; body: string; look: VenueLook }[] = [
  {
    name: 'Discover',
    body: 'The event, the venue, the audience, the creative direction and the technical needs. We set the objectives, find the constraints and decide which systems are required.',
    look: { show: {}, dims: 1 },
  },
  {
    name: 'Design',
    body: 'A production approach built around the brief: audio configuration, lighting layout, fixture choice, booth infrastructure, visual concepts, projection, control architecture and placement.',
    look: { show: {}, plan: 1, dims: 0.3 },
  },
  {
    name: 'Engineer',
    body: 'The details that decide whether it will work: signal flow, compatibility, fixture addressing, networks, control, power distribution and physical installation.',
    look: { show: { stage: 0.3, sound: 0.3, light: 0.3, visuals: 0.3, dj: 0.3 }, plan: 0.4, xray: 1 },
  },
  {
    name: 'Build',
    body: 'Equipment prepared, configured and organised: fixture profiles, lighting cues, audio preparation, MIDI mapping, visual content and control interfaces.',
    look: { show: {}, cases: 1 },
  },
  {
    name: 'Deploy',
    body: 'The production installed to the agreed plan: audio, lighting, control infrastructure, DJ systems and projection, positioned and connected.',
    look: { show: { stage: 1, sound: 1, light: 1, visuals: 1, dj: 1, infra: 1 } },
  },
  {
    name: 'Integrate',
    body: 'The relationships between systems verified: routing, lighting control, visual playback and networks, and shared cues where the design calls for them.',
    look: { show: { stage: 1, sound: 1, light: 1, visuals: 1, dj: 1, infra: 1 }, xray: 0.7, test: 1 },
  },
  {
    name: 'Optimise',
    body: 'The venue becomes the final test: audio refined, lighting scenes adjusted, playback checked and integration issues resolved before the doors open.',
    look: { show: { stage: 1, sound: 1, light: 1, visuals: 1, dj: 1, infra: 1 }, heat: 1, test: 0.5 },
  },
  {
    name: 'Execute',
    body: 'The production in operation: keeping the intended experience, supporting the systems and responding as the event unfolds.',
    look: { show: { stage: 1, sound: 1, light: 1, visuals: 1, dj: 1, infra: 1 }, lit: 1, crowd: 1 },
  },
  {
    name: 'Close out',
    body: 'Everything powered down, disconnected, checked and packed. A good production includes the work after the audience leaves.',
    look: { show: {}, cases: 1 },
  },
]

const makeBuild = (ctl: { current: number }): Draw => {
  const venue = makeVenue()
  const listen = makeListener()
  let yaw = -0.5
  return (f) => {
    const { t, dt, pointer } = f
    const s = STEPS[ctl.current]
    const a = listen(t, null)
    venue.step({ ...s.look, show: { ...s.look.show }, color: [255, 186, 120] }, dt, 3.2)
    if (pointer.down) yaw = Math.max(-1.2, Math.min(1.2, yaw + pointer.dx * 2.5))
    else yaw += (-0.5 + 0.12 * Math.sin(t * 0.08) - yaw) * 0.005
    venue.draw(f, venueCam(f, yaw, 0.32, 0.9, 0.6), a)
    tag(f.c, `${String(ctl.current + 1).padStart(2, '0')} · ${s.name}`, 14 * f.dpr, 22 * f.dpr, f.dpr, 0.85, 'left', BRASS)
    if (ctl.current === 2) cableLegend(f.c, 14 * f.dpr, 44 * f.dpr, f.dpr, 1)
  }
}

export function BuildScene() {
  const [step, setStep] = useState(0)
  const [auto, setAuto] = useState(true)
  const ctl = useRef(step)
  useEffect(() => {
    ctl.current = step
  }, [step])
  useEffect(() => {
    if (!auto || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setTimeout(() => setStep((s) => (s + 1) % STEPS.length), 4800)
    return () => window.clearTimeout(id)
  }, [step, auto])
  const make = useMemo(() => () => makeBuild(ctl), [])
  const pick = (i: number) => {
    setAuto(false)
    setStep(i)
  }
  return (
    <div className="timeline build" style={{ ['--step' as string]: step, ['--steps' as string]: STEPS.length }}>
      <Stage make={make} className="vis-scene prod-scene--build" />
      <ol className="timeline__track" role="tablist" aria-label="End-to-end production">
        {STEPS.map((s, i) => (
          <li key={s.name}>
            <button
              role="tab"
              aria-selected={i === step}
              className={`${i === step ? 'is-on' : ''} ${i < step ? 'is-done' : ''}`}
              onClick={() => pick(i)}
            >
              <span className="timeline__n">{String(i + 1).padStart(2, '0')}</span>
              <span className="timeline__name">{s.name}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="timeline__bar" aria-hidden>
        <span />
      </div>
      <div className="timeline__panel" role="tabpanel" aria-live="polite">
        <p className="timeline__big">
          <span>{String(step + 1).padStart(2, '0')}</span> {STEPS[step].name}
        </p>
        <p>{STEPS[step].body}</p>
      </div>
    </div>
  )
}

/* ─────────────── Technology: follow a signal through the system ─────────────── */

type SNode = { id: string; col: number; row: number; name: string; sub: string }
const SNODES: SNode[] = [
  { id: 'music', col: 0, row: 0.3, name: 'DJ mixer', sub: 'the music' },
  { id: 'midi', col: 0, row: 1.7, name: 'MIDI controller', sub: 'pads & faders' },
  { id: 'dsp', col: 1, row: 0, name: 'System processing', sub: 'routing & DSP' },
  { id: 'analysis', col: 1, row: 1, name: 'Audio analysis', sub: 'our own software' },
  { id: 'amps', col: 2, row: 0, name: 'Amplifiers', sub: 'per system' },
  { id: 'lightsw', col: 2, row: 1, name: 'Lighting software', sub: 'Lightkey · QLC+' },
  { id: 'td', col: 2, row: 2, name: 'Visual engine', sub: 'TouchDesigner' },
  { id: 'speakers', col: 3, row: 0, name: 'Loudspeakers', sub: 'tuned to the room' },
  { id: 'node', col: 3, row: 1, name: 'Network node', sub: 'Art-Net · sACN' },
  { id: 'projector', col: 3, row: 2, name: 'Projector', sub: 'mesh & surfaces' },
  { id: 'fixtures', col: 4, row: 1, name: 'Fixtures', sub: 'every address' },
]
const SEDGES: [string, string, string][] = [
  ['music', 'dsp', 'Audio'],
  ['dsp', 'amps', 'Audio'],
  ['amps', 'speakers', 'Speaker'],
  ['music', 'analysis', 'Audio'],
  ['analysis', 'lightsw', 'Trigger'],
  ['analysis', 'td', 'Data'],
  ['midi', 'lightsw', 'MIDI'],
  ['midi', 'td', 'MIDI'],
  ['lightsw', 'node', 'Network'],
  ['node', 'fixtures', 'DMX512'],
  ['td', 'projector', 'Video'],
]

export type Trace = 'kick' | 'fader' | 'visual' | 'room'
const TRACES: { id: Trace; name: string; path: string[][]; note: string }[] = [
  {
    id: 'kick',
    name: 'Kick → light',
    path: [['music', 'analysis', 'lightsw', 'node', 'fixtures']],
    note: 'A musical event becomes a lighting trigger: our software hears the kick, the lighting software fires the cue, and the data reaches every fixture.',
  },
  {
    id: 'fader',
    name: 'One fader, two systems',
    path: [
      ['midi', 'lightsw', 'node', 'fixtures'],
      ['midi', 'td', 'projector'],
    ],
    note: 'A control interface coordinates several parameters: one fader shapes the lighting’s intensity and the visual’s density together.',
  },
  {
    id: 'visual',
    name: 'Audio → visuals',
    path: [['music', 'analysis', 'td', 'projector']],
    note: 'An audio signal influences a generative composition: energy in each band and every transient feed the visual engine.',
  },
  {
    id: 'room',
    name: 'Music → room',
    path: [['music', 'dsp', 'amps', 'speakers']],
    note: 'And the music itself, routed through processing and amplification to a system tuned for the room.',
  },
]

const makeSignal = (ctl: { current: Trace }): Draw => {
  const arrived = new Map<string, number>()
  let trace: Trace | null = null
  let at = 0
  return ({ c, w, h, t, dpr }) => {
    // restart the signal whenever another trace is chosen
    if (ctl.current !== trace) {
      trace = ctl.current
      at = t
    }
    const tr = TRACES.find((x) => x.id === trace)!
    const el = t - at
    const bw = w * 0.17
    const bh = Math.min(h * 0.17, 54 * dpr)
    const pos = (n: SNode) => ({ x: w * 0.02 + n.col * w * 0.2, y: h * 0.1 + n.row * h * 0.3 })
    const byId = (id: string) => SNODES.find((n) => n.id === id)!
    // which edges belong to the trace, and when the signal reaches each
    const timing = new Map<string, number>()
    tr.path.forEach((p) => p.slice(1).forEach((id, i) => timing.set(`${p[i]}>${id}`, i * 0.55)))
    const cycle = fract(el / 4.2) * 4.2
    SEDGES.forEach(([a, b, proto]) => {
      const A = pos(byId(a))
      const B = pos(byId(b))
      const x0 = A.x + bw
      const y0 = A.y + bh / 2
      const x1 = B.x
      const y1 = B.y + bh / 2
      const mx = (x0 + x1) / 2
      const key = `${a}>${b}`
      const on = timing.has(key)
      c.strokeStyle = on ? `${BRASS}0.9)` : `${INK}0.12)`
      c.lineWidth = (on ? 1.6 : 1) * dpr
      c.beginPath()
      c.moveTo(x0, y0)
      c.bezierCurveTo(mx, y0, mx, y1, x1, y1)
      c.stroke()
      if (on) {
        const start = timing.get(key)!
        const u = (cycle - start) / 0.55
        const iu = 1 - Math.max(0, Math.min(1, u))
        const uu = 1 - iu
        const px = iu ** 3 * x0 + 3 * iu * iu * uu * mx + 3 * iu * uu * uu * mx + uu ** 3 * x1
        const py = iu ** 3 * y0 + 3 * iu * iu * uu * y0 + 3 * iu * uu * uu * y1 + uu ** 3 * y1
        if (u > 0 && u < 1) {
          c.fillStyle = `${INK}1)`
          c.beginPath()
          c.arc(px, py, 4 * dpr, 0, Math.PI * 2)
          c.fill()
        }
        if (u >= 1 && u < 1.1) arrived.set(b, t)
        tag(c, proto, mx, (y0 + y1) / 2 - 6 * dpr, dpr, 0.75, 'center', BRASS)
      }
    })
    SNODES.forEach((n) => {
      const p = pos(n)
      const inTrace = tr.path.some((path) => path.includes(n.id))
      const glow = Math.max(0, 1 - (t - (arrived.get(n.id) ?? -9)) * 1.5)
      const first = tr.path.some((path) => path[0] === n.id) && cycle < 0.3
      const g = Math.max(glow, first ? 1 : 0)
      c.fillStyle = g > 0 ? `rgba(184,164,123,${0.12 + 0.3 * g})` : 'rgba(26,25,23,0.95)'
      c.strokeStyle = inTrace ? `${BRASS}0.9)` : `${INK}0.2)`
      c.lineWidth = dpr
      c.beginPath()
      c.roundRect(p.x, p.y, bw, bh, 4 * dpr)
      c.fill()
      c.stroke()
      c.font = font(Math.max(10, Math.min(12.5, w / dpr / 56)), dpr, 650)
      c.textAlign = 'left'
      c.fillStyle = `${INK}${inTrace ? 1 : 0.55})`
      c.fillText(n.name, p.x + 8 * dpr, p.y + bh * 0.45, bw - 12 * dpr)
      c.font = font(Math.max(9, Math.min(11, w / dpr / 66)), dpr, 500)
      c.fillStyle = inTrace ? `${BRASS}1)` : `${INK}0.35)`
      c.fillText(n.sub, p.x + 8 * dpr, p.y + bh * 0.78, bw - 12 * dpr)
    })
    // what arrives at the end
    const fx = pos(byId('fixtures'))
    const fg = Math.max(0, 1 - (t - (arrived.get('fixtures') ?? -9)) * 1.2)
    for (let i = 0; i < 6; i++) {
      const x = fx.x + (i + 0.5) * (bw / 6)
      c.globalCompositeOperation = 'lighter'
      const grad = c.createLinearGradient(x, fx.y + bh, x, fx.y + bh + h * 0.3)
      grad.addColorStop(0, `rgba(255,214,160,${0.7 * fg})`)
      grad.addColorStop(1, 'rgba(255,214,160,0)')
      c.fillStyle = grad
      c.beginPath()
      c.moveTo(x - 2 * dpr, fx.y + bh)
      c.lineTo(x - 9 * dpr, fx.y + bh + h * 0.3)
      c.lineTo(x + 9 * dpr, fx.y + bh + h * 0.3)
      c.lineTo(x + 2 * dpr, fx.y + bh)
      c.fill()
      c.globalCompositeOperation = 'source-over'
    }
    const pj = pos(byId('projector'))
    const pg = Math.max(0, 1 - (t - (arrived.get('projector') ?? -9)) * 0.8)
    if (pg > 0) {
      c.strokeStyle = `${INK}${pg})`
      for (let k = 0; k < 4; k++) {
        c.beginPath()
        c.arc(pj.x + bw * 1.18, pj.y + bh / 2, fract(k / 4 + t * 0.5) * bh * 0.7, 0, Math.PI * 2)
        c.stroke()
      }
    }
    const sp = pos(byId('speakers'))
    const sg = Math.max(0, 1 - (t - (arrived.get('speakers') ?? -9)) * 0.8)
    if (sg > 0) {
      c.strokeStyle = `${BRASS}${sg})`
      for (let k = 0; k < 3; k++) {
        c.beginPath()
        c.arc(sp.x + bw, sp.y + bh / 2, 8 * dpr + fract(k / 3 + t) * 30 * dpr, -0.8, 0.8)
        c.stroke()
      }
    }
  }
}

export function SignalScene() {
  const [trace, setTrace] = useState<Trace>('kick')
  const [auto, setAuto] = useState(true)
  const ctl = useRef(trace)
  useEffect(() => {
    ctl.current = trace
  }, [trace])
  useEffect(() => {
    if (!auto || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setTimeout(
      () => setTrace((x) => TRACES[(TRACES.findIndex((y) => y.id === x) + 1) % TRACES.length].id),
      8400,
    )
    return () => window.clearTimeout(id)
  }, [trace, auto])
  const make = useMemo(() => () => makeSignal(ctl), [])
  const tr = TRACES.find((x) => x.id === trace)!
  return (
    <div className="scene-panel">
      <div className="scene-tabs scene-tabs--small" role="tablist" aria-label="Follow a signal">
        {TRACES.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={x.id === trace}
            className={x.id === trace ? 'is-on' : ''}
            onClick={() => {
              setAuto(false)
              setTrace(x.id)
            }}
          >
            {x.name}
          </button>
        ))}
      </div>
      <Stage make={make} className="vis-scene prod-scene--signal" />
      <p className="scene-panel__note" aria-live="polite">
        {tr.note}
      </p>
    </div>
  )
}

/* ─────────────── Built around the venue: five rooms, five plans ─────────────── */

export type VenueKind = 'ballroom' | 'open' | 'home' | 'warehouse' | 'club'

const VENUES: { id: VenueKind; name: string; notes: string[] }[] = [
  {
    id: 'ballroom',
    name: 'Ballroom',
    notes: [
      'Chandeliers and a fixed ceiling: lighting from ground-supported truss and floor positions.',
      'Round tables around a dance floor: tops cover the seated room, subs serve the floor.',
      'Speeches and a party in one evening: one system tuned for both.',
    ],
  },
  {
    id: 'open',
    name: 'Open air',
    notes: [
      'No walls to help: the system does all the work across a larger audience.',
      'Neighbours beyond the boundary: the sub array is steered to keep low end away from them.',
      'Weather and power planned for: covered positions, distribution to every point.',
    ],
  },
  {
    id: 'home',
    name: 'Private residence',
    notes: [
      'A terrace and a lawn: two zones, each with its own level and atmosphere.',
      'The house is protected: freestanding equipment, nothing fixed to its walls.',
      'Its facade becomes the canvas: projection onto the architecture.',
    ],
  },
  {
    id: 'warehouse',
    name: 'Warehouse',
    notes: [
      'Hard, reflective walls: energy aimed at the audience, not at the room.',
      'Columns break the sightlines: lighting and projection placed around them.',
      'Raw surfaces: long walls that become projection canvases.',
    ],
  },
  {
    id: 'club',
    name: 'Club',
    notes: [
      'An existing house system and patch: we work with it, and plan around it.',
      'A low ceiling and a dense crowd: compact, controlled beams.',
      'The booth at the centre: monitoring and control within reach.',
    ],
  },
]

const makePlans = (ctl: { current: VenueKind }): Draw => {
  let shown: VenueKind = ctl.current
  let fade = 1
  return ({ c, w, h, t, dt, dpr }) => {
    if (ctl.current !== shown) {
      fade -= dt * 5
      if (fade <= 0) {
        shown = ctl.current
        fade = 0
      }
    } else fade = Math.min(1, fade + dt * 4)
    const m = 22 * dpr
    const pw = w - m * 2
    const ph = h - m * 2 - 26 * dpr
    const X = (x: number) => m + x * pw
    const Y = (y: number) => m + y * ph
    c.globalAlpha = fade
    // drawing paper grid
    c.strokeStyle = `${INK}0.04)`
    c.lineWidth = dpr
    c.beginPath()
    for (let x = 0; x <= 1.0001; x += 0.05) {
      c.moveTo(X(x), Y(0))
      c.lineTo(X(x), Y(1))
    }
    for (let y = 0; y <= 1.0001; y += 0.0667) {
      c.moveTo(X(0), Y(y))
      c.lineTo(X(1), Y(y))
    }
    c.stroke()
    const rect = (x0: number, y0: number, x1: number, y1: number, stroke: string, fill?: string, dash?: number[]) => {
      c.setLineDash(dash ?? [])
      if (fill) {
        c.fillStyle = fill
        c.fillRect(X(x0), Y(y0), X(x1) - X(x0), Y(y1) - Y(y0))
      }
      c.strokeStyle = stroke
      c.strokeRect(X(x0), Y(y0), X(x1) - X(x0), Y(y1) - Y(y0))
      c.setLineDash([])
    }
    const audience = (x0: number, y0: number, x1: number, y1: number) => {
      c.fillStyle = `${INK}0.22)`
      for (let x = x0 + 0.015; x < x1; x += 0.025)
        for (let y = y0 + 0.02; y < y1; y += 0.035) c.fillRect(X(x), Y(y), 1.5 * dpr, 1.5 * dpr)
    }
    const speaker = (x: number, y: number, ang: number) => {
      // a wedge pointing where it plays, with its coverage
      c.fillStyle = `${BRASS}0.08)`
      c.beginPath()
      c.moveTo(X(x), Y(y))
      c.arc(X(x), Y(y), Math.min(pw, ph) * 0.42, ang - 0.5, ang + 0.5)
      c.closePath()
      c.fill()
      c.fillStyle = `${BRASS}1)`
      c.beginPath()
      c.moveTo(X(x) + Math.cos(ang) * 9 * dpr, Y(y) + Math.sin(ang) * 9 * dpr)
      c.lineTo(X(x) + Math.cos(ang + 2.4) * 7 * dpr, Y(y) + Math.sin(ang + 2.4) * 7 * dpr)
      c.lineTo(X(x) + Math.cos(ang - 2.4) * 7 * dpr, Y(y) + Math.sin(ang - 2.4) * 7 * dpr)
      c.fill()
    }
    const sub = (x: number, y: number) => {
      c.fillStyle = `${BRASS}0.9)`
      c.fillRect(X(x) - 6 * dpr, Y(y) - 4 * dpr, 12 * dpr, 8 * dpr)
    }
    const light = (x: number, y: number) => {
      const p = 0.5 + 0.5 * Math.sin(t * 2 + x * 20 + y * 13)
      c.fillStyle = `rgba(255,214,160,${0.4 + 0.5 * p})`
      c.beginPath()
      c.arc(X(x), Y(y), 3.5 * dpr, 0, Math.PI * 2)
      c.fill()
    }
    const surface = (x0: number, y0: number, x1: number, y1: number) => {
      c.strokeStyle = 'rgba(186,140,255,0.95)'
      c.lineWidth = 4 * dpr
      c.beginPath()
      c.moveTo(X(x0), Y(y0))
      c.lineTo(X(x1), Y(y1))
      c.stroke()
      c.lineWidth = dpr
    }
    const booth = (x: number, y: number) => {
      c.fillStyle = '#1d1c1a'
      c.strokeStyle = `${INK}0.8)`
      c.fillRect(X(x) - 0.04 * pw, Y(y) - 0.02 * ph, 0.08 * pw, 0.04 * ph)
      c.strokeRect(X(x) - 0.04 * pw, Y(y) - 0.02 * ph, 0.08 * pw, 0.04 * ph)
    }
    const note = (text: string, x: number, y: number, a = 0.55) => tag(c, text, X(x), Y(y), dpr, a, 'center')
    const wall = `${INK}0.55)`

    switch (shown) {
      case 'ballroom':
        rect(0.02, 0.03, 0.98, 0.97, wall)
        rect(0.3, 0.05, 0.7, 0.2, `${INK}0.4)`, 'rgba(255,255,255,0.03)')
        surface(0.36, 0.06, 0.64, 0.06)
        audience(0.32, 0.3, 0.68, 0.55)
        note('Dance floor', 0.5, 0.58)
        for (const [x, y] of [
          [0.12, 0.35],
          [0.12, 0.6],
          [0.12, 0.85],
          [0.88, 0.35],
          [0.88, 0.6],
          [0.88, 0.85],
          [0.35, 0.75],
          [0.5, 0.85],
          [0.65, 0.75],
        ]) {
          c.strokeStyle = `${INK}0.35)`
          c.beginPath()
          c.arc(X(x), Y(y), Math.min(pw, ph) * 0.05, 0, Math.PI * 2)
          c.stroke()
        }
        for (const x of [0.3, 0.7]) {
          c.strokeStyle = `${INK}0.4)`
          c.beginPath()
          c.arc(X(x), Y(0.45), 7 * dpr, 0, Math.PI * 2)
          c.moveTo(X(x) - 10 * dpr, Y(0.45))
          c.lineTo(X(x) + 10 * dpr, Y(0.45))
          c.moveTo(X(x), Y(0.45) - 10 * dpr)
          c.lineTo(X(x), Y(0.45) + 10 * dpr)
          c.stroke()
        }
        note('Chandelier', 0.3, 0.41, 0.4)
        speaker(0.27, 0.2, Math.PI / 2 + 0.3)
        speaker(0.73, 0.2, Math.PI / 2 - 0.3)
        sub(0.42, 0.23)
        sub(0.58, 0.23)
        booth(0.5, 0.25)
        for (let i = 0; i < 6; i++) light(0.33 + i * 0.068, 0.12)
        for (const [x, y] of [
          [0.04, 0.25],
          [0.04, 0.7],
          [0.96, 0.25],
          [0.96, 0.7],
        ])
          light(x, y)
        break
      case 'open':
        rect(0.02, 0.03, 0.98, 0.97, `${INK}0.3)`, undefined, [6 * dpr, 6 * dpr])
        note('Site boundary', 0.15, 0.06, 0.4)
        c.strokeStyle = `${BRASS}0.6)`
        c.beginPath()
        c.moveTo(X(0.5), Y(0.16))
        c.lineTo(X(0.5), Y(0.02))
        c.moveTo(X(0.48), Y(0.05))
        c.lineTo(X(0.5), Y(0.02))
        c.lineTo(X(0.52), Y(0.05))
        c.stroke()
        note('Neighbours: quiet side', 0.66, 0.06, 0.6)
        rect(0.25, 0.1, 0.75, 0.26, `${INK}0.45)`, 'rgba(255,255,255,0.03)')
        surface(0.3, 0.11, 0.7, 0.11)
        speaker(0.2, 0.22, Math.PI / 2 + 0.15)
        speaker(0.8, 0.22, Math.PI / 2 - 0.15)
        for (const x of [0.4, 0.47, 0.53, 0.6]) sub(x, 0.29)
        note('Cardioid sub array', 0.5, 0.35, 0.5)
        audience(0.12, 0.4, 0.88, 0.82)
        booth(0.5, 0.17)
        rect(0.45, 0.86, 0.55, 0.92, `${INK}0.6)`)
        note('FOH', 0.5, 0.96)
        for (const x of [0.22, 0.78]) {
          light(x, 0.11)
          light(x, 0.14)
        }
        for (const [x, y] of [
          [0.06, 0.5],
          [0.94, 0.45],
          [0.07, 0.85],
          [0.93, 0.88],
        ]) {
          c.strokeStyle = `${INK}0.25)`
          c.beginPath()
          c.arc(X(x), Y(y), 12 * dpr, 0, Math.PI * 2)
          c.stroke()
        }
        break
      case 'home':
        rect(0.02, 0.03, 0.42, 0.42, wall, 'rgba(255,255,255,0.04)')
        note('House', 0.22, 0.24)
        surface(0.42, 0.06, 0.42, 0.4)
        note('Facade: projection', 0.3, 0.46, 0.6)
        rect(0.42, 0.03, 0.98, 0.3, `${INK}0.4)`, 'rgba(255,255,255,0.02)')
        note('Terrace', 0.88, 0.07, 0.5)
        booth(0.7, 0.08)
        speaker(0.5, 0.12, 0.6)
        speaker(0.94, 0.12, Math.PI - 0.6)
        audience(0.48, 0.15, 0.92, 0.28)
        note('Lawn', 0.7, 0.36, 0.5)
        rect(0.06, 0.55, 0.3, 0.75, 'rgba(110,170,255,0.5)', 'rgba(110,170,255,0.06)')
        note('Pool', 0.18, 0.66, 0.5)
        audience(0.5, 0.45, 0.94, 0.9)
        speaker(0.52, 0.42, 0.7)
        speaker(0.92, 0.42, Math.PI - 0.7)
        sub(0.72, 0.42)
        for (let i = 0; i < 9; i++) light(0.46 + i * 0.06, 0.96)
        for (let i = 0; i < 6; i++) light(0.97, 0.38 + i * 0.1)
        break
      case 'warehouse':
        rect(0.02, 0.03, 0.98, 0.97, wall)
        for (const y of [0.35, 0.68])
          for (const x of [0.2, 0.4, 0.6, 0.8]) {
            c.fillStyle = `${INK}0.5)`
            c.fillRect(X(x) - 4 * dpr, Y(y) - 4 * dpr, 8 * dpr, 8 * dpr)
          }
        note('Columns', 0.2, 0.31, 0.45)
        rect(0.3, 0.05, 0.7, 0.18, `${INK}0.4)`, 'rgba(255,255,255,0.03)')
        booth(0.5, 0.15)
        surface(0.03, 0.25, 0.03, 0.92)
        surface(0.97, 0.25, 0.97, 0.92)
        note('Walls: projection', 0.14, 0.95, 0.6)
        speaker(0.26, 0.17, Math.PI / 2 + 0.2)
        speaker(0.74, 0.17, Math.PI / 2 - 0.2)
        sub(0.44, 0.21)
        sub(0.56, 0.21)
        audience(0.1, 0.25, 0.9, 0.9)
        for (let i = 0; i < 5; i++) for (const y of [0.3, 0.55]) light(0.3 + i * 0.1, y)
        break
      case 'club':
        rect(0.12, 0.08, 0.88, 0.92, wall)
        rect(0.4, 0.1, 0.6, 0.18, `${INK}0.4)`)
        booth(0.5, 0.2)
        surface(0.3, 0.09, 0.7, 0.09)
        speaker(0.15, 0.12, Math.PI / 4)
        speaker(0.85, 0.12, (3 * Math.PI) / 4)
        speaker(0.15, 0.7, -Math.PI / 4)
        speaker(0.85, 0.7, (-3 * Math.PI) / 4)
        sub(0.44, 0.25)
        sub(0.56, 0.25)
        audience(0.2, 0.3, 0.8, 0.75)
        for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) light(0.3 + i * 0.13, 0.32 + j * 0.17)
        rect(0.2, 0.82, 0.8, 0.9, `${INK}0.45)`, 'rgba(255,255,255,0.03)')
        note('Bar', 0.5, 0.875)
        break
    }
    c.globalAlpha = 1
    // the legend
    const ly = h - 12 * dpr
    const items: [string, (x: number, y: number) => void][] = [
      ['Speaker', (x, y) => ((c.fillStyle = `${BRASS}1)`), c.fillRect(x, y - 6 * dpr, 6 * dpr, 6 * dpr))],
      [
        'Light',
        (x, y) => (
          (c.fillStyle = 'rgba(255,214,160,0.9)'),
          c.beginPath(),
          c.arc(x + 3 * dpr, y - 3 * dpr, 3 * dpr, 0, 7),
          c.fill()
        ),
      ],
      ['Projection', (x, y) => ((c.fillStyle = 'rgba(186,140,255,0.95)'), c.fillRect(x, y - 5 * dpr, 10 * dpr, 4 * dpr))],
      [
        'Audience',
        (x, y) => (
          (c.fillStyle = `${INK}0.5)`),
          c.fillRect(x, y - 4 * dpr, 2 * dpr, 2 * dpr),
          c.fillRect(x + 4 * dpr, y - 4 * dpr, 2 * dpr, 2 * dpr)
        ),
      ],
    ]
    items.forEach(([name, mark], i) => {
      const x = m + i * (pw / 4)
      mark(x, ly)
      tag(c, name, x + 14 * dpr, ly, dpr, 0.55)
    })
  }
}

export function VenuePlans() {
  const [kind, setKind] = useState<VenueKind>('ballroom')
  const ctl = useRef(kind)
  useEffect(() => {
    ctl.current = kind
  }, [kind])
  const make = useMemo(() => () => makePlans(ctl), [])
  const v = VENUES.find((x) => x.id === kind)!
  return (
    <div className="scene-panel">
      <div className="scene-tabs scene-tabs--small" role="tablist" aria-label="Venue">
        {VENUES.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={x.id === kind}
            className={x.id === kind ? 'is-on' : ''}
            onClick={() => setKind(x.id)}
          >
            {x.name}
          </button>
        ))}
      </div>
      <Stage make={make} className="vis-scene prod-scene--plan" />
      <ul className="plan-notes" aria-live="polite">
        {v.notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </div>
  )
}

/* ─────────────── Applications: a running order, and every system through it ─────────────── */

type Moment = {
  name: string
  wash: number
  color: readonly number[]
  beams: number
  spot: number
  house: number
  screen: 'slide' | 'visuals' | 'off'
  slide?: string
  audio: 'speech' | 'background' | 'dance' | 'off'
  centre: 'lectern' | 'booth' | 'none'
}

export type AppId = 'private' | 'club' | 'corporate'

const WARM = [255, 176, 104] as const
const WHITE = [236, 238, 248] as const
const BRAND = [140, 170, 255] as const

const APPS: { id: AppId; name: string; title: string; body: string; kicker: string; moments: Moment[] }[] = [
  {
    id: 'private',
    name: 'Private events & weddings',
    title: 'Personal occasions deserve serious production.',
    body: 'Several spaces, changing audiences, speeches, a first dance and a party, all inside one timeline. We prepare for every transition, so the audio suits each moment, the light supports it and the booth is ready when the music starts.',
    kicker: 'Technically considered. Creatively designed. Personally experienced.',
    moments: [
      {
        name: 'Arrival',
        wash: 0.5,
        color: WARM,
        beams: 0,
        spot: 0,
        house: 0.5,
        screen: 'slide',
        slide: 'Welcome',
        audio: 'background',
        centre: 'none',
      },
      {
        name: 'Speeches',
        wash: 0.2,
        color: WARM,
        beams: 0,
        spot: 1,
        house: 0.3,
        screen: 'off',
        audio: 'speech',
        centre: 'lectern',
      },
      {
        name: 'Dinner',
        wash: 0.6,
        color: WARM,
        beams: 0,
        spot: 0,
        house: 0.4,
        screen: 'visuals',
        audio: 'background',
        centre: 'none',
      },
      {
        name: 'First dance',
        wash: 0.1,
        color: WHITE,
        beams: 0.25,
        spot: 1,
        house: 0,
        screen: 'visuals',
        audio: 'dance',
        centre: 'none',
      },
      { name: 'Party', wash: 0.4, color: WARM, beams: 1, spot: 0, house: 0, screen: 'visuals', audio: 'dance', centre: 'booth' },
    ],
  },
  {
    id: 'club',
    name: 'Clubs & music',
    title: 'Where sound, light and visuals become one.',
    body: 'Audio sets the physical foundation, lighting brings movement, colour and emphasis, visuals add texture and depth. We’re interested in how rhythm, movement, contrast and controlled repetition change the character of a space, through the whole night.',
    kicker: 'Designed around the music. Built around the room. Connected by technology.',
    moments: [
      {
        name: 'Doors',
        wash: 0.3,
        color: WARM,
        beams: 0.15,
        spot: 0,
        house: 0.2,
        screen: 'visuals',
        audio: 'background',
        centre: 'booth',
      },
      {
        name: 'Warm-up',
        wash: 0.3,
        color: WARM,
        beams: 0.5,
        spot: 0,
        house: 0,
        screen: 'visuals',
        audio: 'dance',
        centre: 'booth',
      },
      { name: 'Peak', wash: 0.2, color: WHITE, beams: 1, spot: 0, house: 0, screen: 'visuals', audio: 'dance', centre: 'booth' },
      {
        name: 'Last track',
        wash: 0.5,
        color: WARM,
        beams: 0.3,
        spot: 0,
        house: 0,
        screen: 'visuals',
        audio: 'dance',
        centre: 'booth',
      },
      { name: 'Lights up', wash: 0.2, color: WARM, beams: 0, spot: 0, house: 0.9, screen: 'off', audio: 'off', centre: 'booth' },
    ],
  },
  {
    id: 'corporate',
    name: 'Corporate & brand',
    title: 'Technical precision meets creative presentation.',
    body: 'Speech intelligibility, presentation playback, consistent visuals, lighting transitions and integrated equipment, planned together. Audio is set for the venue and the programme, light is designed around the stage and the speakers, and playback is part of the same workflow.',
    kicker: 'Every technical detail should serve a clear purpose.',
    moments: [
      {
        name: 'Arrival',
        wash: 0.5,
        color: BRAND,
        beams: 0,
        spot: 0,
        house: 0.6,
        screen: 'slide',
        slide: 'Welcome',
        audio: 'background',
        centre: 'none',
      },
      {
        name: 'Keynote',
        wash: 0.2,
        color: WHITE,
        beams: 0,
        spot: 1,
        house: 0.15,
        screen: 'slide',
        slide: 'Keynote',
        audio: 'speech',
        centre: 'lectern',
      },
      {
        name: 'Panel',
        wash: 0.6,
        color: WHITE,
        beams: 0,
        spot: 0.3,
        house: 0.2,
        screen: 'slide',
        slide: 'In conversation',
        audio: 'speech',
        centre: 'none',
      },
      {
        name: 'Awards',
        wash: 0.3,
        color: BRAND,
        beams: 0.7,
        spot: 1,
        house: 0.1,
        screen: 'slide',
        slide: 'Awards',
        audio: 'speech',
        centre: 'lectern',
      },
      {
        name: 'Networking',
        wash: 0.45,
        color: BRAND,
        beams: 0,
        spot: 0,
        house: 0.5,
        screen: 'visuals',
        audio: 'background',
        centre: 'none',
      },
    ],
  },
]

const SEG = 4.5 // seconds per moment

const makeRun = (ctl: { current: { app: AppId; from: number; stamp: number } }): Draw => {
  const listen = makeListener()
  let seen = -1
  let at = 0
  const s = {
    wash: 0,
    beams: 0,
    spot: 0,
    house: 0,
    color: [255, 176, 104],
    screenSlide: 0,
    screenVis: 0,
    lectern: 0,
    booth: 0,
    speech: 0,
    bg: 0,
    dance: 0,
  }
  return ({ c, w, h, t, dt, dpr }) => {
    const { app, from, stamp } = ctl.current
    // a new application, or a jump to a moment, restarts the clock there
    if (stamp !== seen) {
      seen = stamp
      at = t
    }
    const a = listen(t, null)
    const ms = APPS.find((x) => x.id === app)!.moments
    const k = (from + Math.floor((t - at) / SEG)) % ms.length
    const m = ms[k]
    const e = 1 - Math.exp(-dt * 2.5)
    s.wash += (m.wash - s.wash) * e
    s.beams += (m.beams - s.beams) * e
    s.spot += (m.spot - s.spot) * e
    s.house += (m.house - s.house) * e
    for (let j = 0; j < 3; j++) s.color[j] += (m.color[j] - s.color[j]) * e
    s.screenSlide += ((m.screen === 'slide' ? 1 : 0) - s.screenSlide) * e
    s.screenVis += ((m.screen === 'visuals' ? 1 : 0) - s.screenVis) * e
    s.lectern += ((m.centre === 'lectern' ? 1 : 0) - s.lectern) * e
    s.booth += ((m.centre === 'booth' ? 1 : 0) - s.booth) * e
    s.speech += ((m.audio === 'speech' ? 1 : 0) - s.speech) * e
    s.bg += ((m.audio === 'background' ? 1 : 0) - s.bg) * e
    s.dance += ((m.audio === 'dance' ? 1 : 0) - s.dance) * e
    const [r, g, b] = s.color.map(Math.round)

    const floor = h * 0.66
    const top = h * 0.08
    // the room, as lit by the house lights and the wash
    c.fillStyle = `rgba(${r},${g},${b},${0.05 * s.wash})`
    c.fillRect(0, 0, w, floor)
    c.fillStyle = `rgba(240,237,229,${0.07 * s.house})`
    c.fillRect(0, 0, w, h)
    c.strokeStyle = `${INK}0.25)`
    c.lineWidth = dpr
    c.beginPath()
    c.moveTo(0, floor)
    c.lineTo(w, floor)
    c.moveTo(w * 0.14, top)
    c.lineTo(w * 0.86, top)
    c.stroke()
    // stage wash
    const wg = c.createRadialGradient(w / 2, floor, 0, w / 2, floor, w * 0.45)
    wg.addColorStop(0, `rgba(${r},${g},${b},${0.35 * s.wash})`)
    wg.addColorStop(1, `rgba(${r},${g},${b},0)`)
    c.fillStyle = wg
    c.fillRect(0, top, w, floor - top)
    // the screen
    const sx = w * 0.34
    const sw = w * 0.32
    const sy = top + h * 0.06
    const sh = h * 0.28
    c.fillStyle = '#080808'
    c.fillRect(sx, sy, sw, sh)
    c.strokeStyle = `${INK}0.2)`
    c.strokeRect(sx, sy, sw, sh)
    if (s.screenVis > 0.02) {
      c.save()
      c.beginPath()
      c.rect(sx, sy, sw, sh)
      c.clip()
      c.strokeStyle = `${INK}${0.6 * s.screenVis})`
      for (let i = 0; i < 6; i++) {
        c.beginPath()
        c.arc(sx + sw / 2, sy + sh / 2, fract(i / 6 + t * 0.15 + a.bass * 0.05 * s.dance) * sw * 0.6, 0, Math.PI * 2)
        c.stroke()
      }
      c.restore()
    }
    if (s.screenSlide > 0.02) {
      c.fillStyle = `rgba(${r},${g},${b},${0.18 * s.screenSlide})`
      c.fillRect(sx, sy, sw, sh)
      c.font = `400 ${Math.max(14, sw / dpr / 9) * dpr}px 'Instrument Serif', Georgia, serif`
      c.textAlign = 'center'
      c.fillStyle = `${INK}${0.9 * s.screenSlide})`
      c.fillText(m.slide ?? '', sx + sw / 2, sy + sh * 0.56)
    }
    // beams from the truss
    c.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 6; i++) {
      const x = w * (0.18 + i * 0.128)
      const ang = Math.sin(t * 0.7 + i * 0.9) * 0.35
      const v = s.beams * (0.35 + 0.65 * (s.dance > 0.5 ? Math.max(0.3, a.bass) : 0.6))
      if (v < 0.02) continue
      const len = floor - top
      const ex = x + Math.sin(ang) * len
      const gr = c.createLinearGradient(x, top, ex, floor)
      gr.addColorStop(0, `rgba(${r},${g},${b},${0.55 * v})`)
      gr.addColorStop(1, `rgba(${r},${g},${b},${0.04 * v})`)
      c.fillStyle = gr
      c.beginPath()
      c.moveTo(x - 2 * dpr, top)
      c.lineTo(ex - 12 * dpr, floor)
      c.lineTo(ex + 12 * dpr, floor)
      c.lineTo(x + 2 * dpr, top)
      c.fill()
    }
    // the spot on the centre of the stage
    if (s.spot > 0.02) {
      const gr = c.createLinearGradient(w / 2, top, w / 2, floor)
      gr.addColorStop(0, `rgba(250,248,240,${0.35 * s.spot})`)
      gr.addColorStop(1, `rgba(250,248,240,${0.12 * s.spot})`)
      c.fillStyle = gr
      c.beginPath()
      c.moveTo(w / 2 - 3 * dpr, top)
      c.lineTo(w / 2 - w * 0.06, floor)
      c.lineTo(w / 2 + w * 0.06, floor)
      c.lineTo(w / 2 + 3 * dpr, top)
      c.fill()
      c.fillStyle = `rgba(250,248,240,${0.25 * s.spot})`
      c.beginPath()
      c.ellipse(w / 2, floor, w * 0.07, h * 0.02, 0, 0, Math.PI * 2)
      c.fill()
    }
    c.globalCompositeOperation = 'source-over'
    // the lectern, or the booth
    if (s.lectern > 0.02) {
      c.fillStyle = `rgba(28,27,25,${s.lectern})`
      c.strokeStyle = `${INK}${0.5 * s.lectern})`
      c.beginPath()
      c.moveTo(w / 2 - w * 0.025, floor)
      c.lineTo(w / 2 - w * 0.032, floor - h * 0.16)
      c.lineTo(w / 2 + w * 0.032, floor - h * 0.16)
      c.lineTo(w / 2 + w * 0.025, floor)
      c.fill()
      c.stroke()
    }
    if (s.booth > 0.02) {
      c.fillStyle = `rgba(28,27,25,${s.booth})`
      c.strokeStyle = `${INK}${0.5 * s.booth})`
      c.fillRect(w / 2 - w * 0.09, floor - h * 0.12, w * 0.18, h * 0.12)
      c.strokeRect(w / 2 - w * 0.09, floor - h * 0.12, w * 0.18, h * 0.12)
    }
    // loudspeakers, and what they're playing
    for (const x of [w * 0.06, w * 0.94]) {
      c.fillStyle = '#1b1a18'
      c.strokeStyle = `${INK}0.35)`
      c.fillRect(x - 10 * dpr, floor - h * 0.3, 20 * dpr, h * 0.3)
      c.strokeRect(x - 10 * dpr, floor - h * 0.3, 20 * dpr, h * 0.3)
      const lvl =
        s.dance * (0.4 + 0.6 * a.bass) + s.speech * (0.3 + 0.3 * Math.abs(Math.sin(t * 9) * Math.sin(t * 2.3))) + s.bg * 0.25
      c.strokeStyle = `${BRASS}${0.2 + 0.6 * lvl})`
      for (let i = 0; i < 3; i++) {
        c.beginPath()
        const rr = (10 + i * 10 + lvl * 8) * dpr
        if (x < w / 2) c.arc(x + 10 * dpr, floor - h * 0.15, rr, -0.7, 0.7)
        else c.arc(x - 10 * dpr, floor - h * 0.15, rr, Math.PI - 0.7, Math.PI + 0.7)
        c.stroke()
      }
    }
    // the audience
    for (let i = 0; i < 22; i++) {
      const x = w * (0.04 + (i / 21) * 0.92) + Math.sin(i * 3.1) * 6 * dpr
      const bob = s.dance * Math.max(0, a.bass) * 4 * dpr * (0.5 + hash(i) * 0.5)
      const y = h * (0.79 + (i % 2) * 0.05) - bob
      const sz = (9 + (i % 2) * 2) * dpr
      c.fillStyle = '#0b0b0a'
      c.strokeStyle = `${INK}0.2)`
      c.beginPath()
      c.ellipse(x, y + sz * 2, sz * 1.8, sz * 1.2, 0, Math.PI, 0)
      c.fill()
      c.stroke()
      c.beginPath()
      c.arc(x, y, sz, 0, Math.PI * 2)
      c.fill()
      c.stroke()
    }
    // the running order
    const ty = h - 14 * dpr
    const tw = w - 24 * dpr
    const sw2 = tw / ms.length
    ms.forEach((mm, i) => {
      const x = 12 * dpr + i * sw2
      c.fillStyle = i === k ? `${BRASS}0.9)` : `${INK}0.12)`
      c.fillRect(x + dpr, ty - 4 * dpr, sw2 - 2 * dpr, 3 * dpr)
      if (i === k) {
        const p = fract((t - at) / SEG)
        c.fillStyle = `${INK}0.9)`
        c.fillRect(x + dpr + (sw2 - 2 * dpr) * p - dpr, ty - 7 * dpr, 2 * dpr, 9 * dpr)
      }
      // on a phone only the current moment is named; the buttons below name the rest
      if (i === k || w / dpr > 560)
        tag(c, mm.name, x + 2 * dpr, ty - 10 * dpr, dpr, i === k ? 0.9 : 0.4, 'left', i === k ? BRASS : INK)
    })
    const audio =
      m.audio === 'speech'
        ? 'Speech · clarity first'
        : m.audio === 'background'
          ? 'Background music'
          : m.audio === 'dance'
            ? 'Dance floor'
            : 'Off'
    tag(c, `Audio · ${audio}`, 12 * dpr, 20 * dpr, dpr, 0.6)
  }
}

export function RunOfShow() {
  const [app, setApp] = useState<AppId>('private')
  const ctl = useRef({ app, from: 0, stamp: 0 })
  useEffect(() => {
    ctl.current = { app, from: 0, stamp: ctl.current.stamp + 1 }
  }, [app])
  const make = useMemo(() => () => makeRun(ctl), [])
  const it = APPS.find((x) => x.id === app)!
  const jump = (i: number) => (ctl.current = { app, from: i, stamp: ctl.current.stamp + 1 })
  return (
    <div className="apps">
      <div className="scene-tabs" role="tablist" aria-label="Application">
        {APPS.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={x.id === app}
            className={x.id === app ? 'is-on' : ''}
            onClick={() => setApp(x.id)}
          >
            {x.name}
          </button>
        ))}
      </div>
      <div className="apps__body">
        <div className="apps__scene">
          <Stage make={make} className="vis-scene prod-scene--run" />
          <div className="scene-tabs scene-tabs--small apps__moments" role="group" aria-label="Jump to a moment">
            {it.moments.map((m, i) => (
              <button key={m.name} onClick={() => jump(i)}>
                {m.name}
              </button>
            ))}
          </div>
        </div>
        <div className="apps__text" aria-live="polite">
          <h3 className="h2">{it.title}</h3>
          <p>{it.body}</p>
          <p className="feature__kicker">{it.kicker}</p>
        </div>
      </div>
    </div>
  )
}

/* ─────────────── Precision: the pre-show checks ─────────────── */

const CHECKS: { name: string; detail: string; fix?: string }[] = [
  { name: 'Signal flow', detail: 'Booth → FOH → processing → amplifiers → loudspeakers' },
  { name: 'Loudspeakers', detail: 'Each box and subwoofer, one at a time, polarity and level' },
  { name: 'Fixture addressing', detail: 'Every fixture answers on its own address', fix: 'Address clash found and corrected' },
  { name: 'Network', detail: 'Lighting and visual control reachable, no conflicts' },
  { name: 'Power', detail: 'Loads balanced across the distribution' },
  { name: 'DJ booth', detail: 'Players, mixer and monitoring to FOH' },
  { name: 'Lighting cues', detail: 'Every cue played through, every transition timed' },
  { name: 'Visual playback', detail: 'Output, alignment and a fallback ready' },
  { name: 'Running order', detail: 'Transitions rehearsed against the timeline' },
]

export function Preflight() {
  const [n, setN] = useState(-1) // checks completed
  const [running, setRunning] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const started = useRef(false)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true
        setN(0)
        setRunning(true)
      }
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    if (!running) return
    if (n >= CHECKS.length) {
      const id = window.setTimeout(() => setRunning(false), 0)
      return () => window.clearTimeout(id)
    }
    const slow = CHECKS[n]?.fix ? 1500 : 650
    const id = window.setTimeout(() => setN((k) => k + 1), slow)
    return () => window.clearTimeout(id)
  }, [n, running])
  const done = n >= CHECKS.length
  return (
    <div className="preflight" ref={box}>
      <div className="preflight__head">
        <span className="label">Pre-show checks</span>
        <span className={`preflight__state ${done ? 'is-done' : ''}`}>
          {done ? 'Ready for doors' : running ? `Checking ${Math.min(n + 1, CHECKS.length)} of ${CHECKS.length}` : 'Not yet run'}
        </span>
      </div>
      <ol className="preflight__list">
        {CHECKS.map((ch, i) => {
          const state = i < n ? (ch.fix ? 'fixed' : 'ok') : i === n && running ? 'run' : 'wait'
          return (
            <li key={ch.name} className={`is-${state}`}>
              <i aria-hidden />
              <span className="preflight__name">{ch.name}</span>
              <span className="preflight__detail">{state === 'fixed' ? ch.fix : ch.detail}</span>
              <span className="preflight__status">
                {state === 'ok' ? 'OK' : state === 'fixed' ? 'Fixed' : state === 'run' ? '…' : ''}
              </span>
            </li>
          )
        })}
      </ol>
      <div className="preflight__foot">
        <p>
          {done
            ? 'All systems verified, in the room, before the audience arrives.'
            : 'Every system checked where it will actually run.'}
        </p>
        <button
          className="mic"
          disabled={running}
          onClick={() => {
            setN(0)
            setRunning(true)
          }}
        >
          Run the checks again
        </button>
      </div>
    </div>
  )
}

/* ─────────────── Philosophy: what the audience sees, and what it takes ─────────────── */

const makeEffortless = (ctl: { current: number }): Draw => {
  const venue = makeVenue()
  const listen = makeListener()
  return (f) => {
    const x = ctl.current
    const a = listen(f.t, null)
    venue.step(
      {
        show: { stage: 1, sound: 1, light: 1, visuals: 1, dj: 1, infra: x },
        lit: 1 - 0.55 * x,
        crowd: 1 - 0.5 * x,
        xray: x,
        color: a.section === 'Drop' ? [236, 238, 248] : [255, 176, 104],
      },
      f.dt,
      5,
    )
    venue.draw(f, venueCam(f, -0.12 + Math.sin(f.t * 0.06) * 0.08, 0.26, 1.12), a)
    cableLegend(f.c, 14 * f.dpr, 24 * f.dpr, f.dpr, x)
    tag(f.c, x < 0.5 ? 'What the audience sees' : 'What it takes', f.w - 14 * f.dpr, 22 * f.dpr, f.dpr, 0.75, 'right', BRASS)
  }
}

export function EffortlessScene() {
  const [x, setX] = useState(0)
  const ctl = useRef(x)
  useEffect(() => {
    ctl.current = x
  }, [x])
  const make = useMemo(() => () => makeEffortless(ctl), [])
  return (
    <div className="scene-panel">
      <Stage make={make} className="vis-scene prod-scene--effortless" />
      <label className="scene-slider">
        <span>The experience</span>
        <input type="range" min={0} max={1} step={0.01} value={x} onChange={(e) => setX(+e.target.value)} />
        <span>The system</span>
      </label>
    </div>
  )
}
