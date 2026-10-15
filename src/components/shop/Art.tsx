import { useEffect, useRef, type CSSProperties } from 'react'
import lockup from '../../brand/logo-lockup.webp'
import { useInView, useMediaQuery } from '../../hooks/useMedia'
import type { AudioPack, Loop, Merch } from '../../content/shop'

// Artwork for shop products that don't have photos yet: generated covers for audio packs,
// live previews for VJ loops and garment mock-ups for merch. Real images replace them later.

const BRASS = '#b8a47b'
const IVORY = '#f0ede5'

export const VA_MARK_PATH =
  'M1358,573 L1257,758 L1282,804 L1483,804 Z M1303,473 L1203,657 L1244,735 L1345,552 Z M1254,383 L1154,566 L1190,635 L1291,451 Z M1211,303 L1110,486 L1141,545 L1242,360 Z M1175,237 L1074,422 L1097,464 L1198,280 Z M1144,180 L1043,365 L1062,400 L1163,215 Z M1,6 L439,804 L519,804 L958,5 L769,5 L479,532 L190,6 Z M1046,2 L1037,1 L1033,4 L607,786 L604,799 L609,804 L778,804 L814,742 L1130,161 L1129,152 Z'

/** Repeatable random numbers from a product id, so each cover always looks the same. */
function seeded(id: string) {
  let s = 0
  for (const c of id) s = (Math.imul(s, 31) + c.charCodeAt(0)) | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ─────────────── Audio pack covers ─────────────── */

export function AudioCover({ p }: { p: AudioPack }) {
  const rnd = seeded(p.id)
  let art
  if (p.art === 'rings') {
    art = Array.from({ length: 14 }, (_, i) => (
      <circle
        key={i}
        cx="200"
        cy="230"
        r={18 + i * 15}
        fill="none"
        stroke={BRASS}
        strokeWidth={i % 4 === 0 ? 1.6 : 0.7}
        opacity={1 - i / 15}
      />
    ))
  } else if (p.art === 'bars') {
    art = Array.from({ length: 40 }, (_, i) => {
      const h = 20 + Math.pow(rnd(), 1.6) * 170 * (0.5 + 0.5 * Math.sin(i / 6))
      return (
        <rect
          key={i}
          x={40 + i * 8}
          y={300 - h}
          width="3.2"
          height={h}
          fill={i % 9 === 0 ? IVORY : BRASS}
          opacity={0.35 + rnd() * 0.65}
        />
      )
    })
  } else if (p.art === 'drift') {
    art = Array.from({ length: 18 }, (_, i) => {
      const a = 6 + rnd() * 14
      const f = 0.012 + rnd() * 0.01
      const ph = rnd() * 6
      const y0 = 110 + i * 12
      const d = Array.from(
        { length: 41 },
        (_, k) => `${k ? 'L' : 'M'}${k * 10},${(y0 + Math.sin(k * 10 * f + ph) * a).toFixed(1)}`,
      ).join(' ')
      return <path key={i} d={d} fill="none" stroke={BRASS} strokeWidth="0.8" opacity={0.25 + (i / 18) * 0.7} />
    })
  } else {
    art = Array.from({ length: 22 }, (_, i) => {
      const y = 330 - Math.pow(i / 22, 1.8) * 250
      return (
        <line
          key={i}
          x1={60 - i * 1.5}
          x2={340 + i * 1.5}
          y1={y}
          y2={y}
          stroke={i === 21 ? IVORY : BRASS}
          strokeWidth={0.6 + (i / 22) * 1.4}
          opacity={0.3 + (i / 22) * 0.7}
        />
      )
    })
  }
  return (
    <div className="cover cover--audio">
      <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <radialGradient id={`glow-${p.id}`} cx="50%" cy="58%" r="60%">
            <stop offset="0" stopColor="#2a261d" />
            <stop offset="1" stopColor="#0d0d0c" />
          </radialGradient>
        </defs>
        <rect width="400" height="400" fill={`url(#glow-${p.id})`} />
        {art}
      </svg>
      <span className="cover__kicker">Vital Acoustica · Audio</span>
      <span className="cover__name">{p.name}</span>
    </div>
  )
}

/* ─────────────── VJ loop previews ─────────────── */

type Draw = (c: CanvasRenderingContext2D, w: number, h: number, t: number) => void

const DRAW: Record<Loop['visual'], Draw> = {
  // ripples spreading over a floor, seen in perspective
  rings(c, w, h, t) {
    c.lineWidth = Math.max(1, w / 500)
    for (let i = 0; i < 16; i++) {
      const k = (((t * 0.12 + i / 16) % 1) + 1) % 1
      const r = k * w * 0.75
      c.strokeStyle = `rgba(184,164,123,${(1 - k) * 0.9})`
      c.beginPath()
      c.ellipse(w / 2, h * 0.62, r, r * 0.32, 0, 0, Math.PI * 2)
      c.stroke()
    }
    const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 1.03)
    const g = c.createRadialGradient(w / 2, h * 0.62, 0, w / 2, h * 0.62, w * 0.12)
    g.addColorStop(0, `rgba(240,237,229,${0.5 + pulse * 0.4})`)
    g.addColorStop(1, 'rgba(240,237,229,0)')
    c.fillStyle = g
    c.fillRect(0, 0, w, h)
  },
  // beams from the floor sweeping through haze
  beams(c, w, h, t) {
    c.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 5; i++) {
      const x = w * (0.18 + i * 0.16)
      const a = Math.sin(t * 0.9 + i * 1.3) * 0.55 + (i - 2) * 0.08
      const len = h * 1.3
      const tipX = x + Math.sin(a) * len
      const tipY = h - Math.cos(a) * len
      const spread = w * 0.035
      const g = c.createLinearGradient(x, h, tipX, tipY)
      g.addColorStop(0, i % 2 ? 'rgba(240,237,229,0.55)' : 'rgba(184,164,123,0.6)')
      g.addColorStop(1, 'rgba(184,164,123,0)')
      c.fillStyle = g
      c.beginPath()
      c.moveTo(x - 2, h)
      c.lineTo(tipX - spread, tipY)
      c.lineTo(tipX + spread, tipY)
      c.lineTo(x + 2, h)
      c.fill()
    }
    c.globalCompositeOperation = 'source-over'
  },
  // a dot-matrix panel running a scan
  grid(c, w, h, t) {
    const cols = 32
    const rows = 18
    const s = w / cols
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const v = Math.sin(x * 0.45 - t * 2.4) * Math.cos(y * 0.6 + t * 1.3) + Math.sin((x + y) * 0.2 + t)
        const b = Math.max(0, Math.min(1, (v + 0.6) / 2))
        c.fillStyle = b > 0.82 ? `rgba(240,237,229,${b})` : `rgba(184,164,123,${0.08 + b * 0.8})`
        c.beginPath()
        c.arc(x * s + s / 2, y * s + s / 2 + (h - rows * s) / 2, s * 0.32 * (0.4 + b * 0.6), 0, Math.PI * 2)
        c.fill()
      }
    }
  },
  // glowing waveforms
  scope(c, w, h, t) {
    c.globalCompositeOperation = 'lighter'
    c.lineWidth = Math.max(1.2, w / 400)
    for (let k = 0; k < 3; k++) {
      c.strokeStyle = k === 0 ? 'rgba(240,237,229,0.9)' : `rgba(184,164,123,${0.7 - k * 0.2})`
      c.shadowColor = BRASS
      c.shadowBlur = 12
      c.beginPath()
      for (let i = 0; i <= 200; i++) {
        const x = (i / 200) * w
        const u = i / 200
        const env = Math.sin(u * Math.PI)
        const y =
          h / 2 +
          env *
            h *
            0.28 *
            (Math.sin(u * 14 + t * 3 + k) * 0.6 + Math.sin(u * 37 - t * 5 + k * 2) * 0.25 + Math.sin(u * 5 + t) * 0.3)
        if (i) c.lineTo(x, y)
        else c.moveTo(x, y)
      }
      c.stroke()
    }
    c.shadowBlur = 0
    c.globalCompositeOperation = 'source-over'
  },
}

/** A live, looping preview drawn in the browser. Runs only while on screen. */
export function LoopPreview({ p }: { p: Loop }) {
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const inView = useInView(box, '100px')
  const still = useMediaQuery('(prefers-reduced-motion: reduce)')
  const { visual, preview } = p

  useEffect(() => {
    const el = canvas.current
    if (!el || preview) return
    const c = el.getContext('2d')
    if (!c) return
    let raf = 0
    let last = 0
    const start = performance.now()
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (now - last < 33) return // 30 fps is plenty for a preview
      last = now
      const dpr = Math.min(window.devicePixelRatio, 1.5)
      const w = Math.round(el.clientWidth * dpr)
      const h = Math.round(el.clientHeight * dpr)
      if (el.width !== w || el.height !== h) Object.assign(el, { width: w, height: h })
      c.fillStyle = '#0a0a0a'
      c.fillRect(0, 0, w, h)
      DRAW[visual](c, w, h, still ? 1.4 : Math.max(0, now - start) / 1000)
      if (still) cancelAnimationFrame(raf)
    }
    if (inView) raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [inView, still, visual, preview])

  return (
    <div ref={box} className="cover cover--loop">
      {p.preview ? (
        <video src={`${import.meta.env.BASE_URL}${p.preview}`} autoPlay={!still} muted loop playsInline aria-hidden />
      ) : (
        <canvas ref={canvas} aria-hidden />
      )}
      <span className="cover__badge">
        <i aria-hidden /> Live preview
      </span>
    </div>
  )
}

/* ─────────────── Merch mock-ups ─────────────── */

const SHAPES: Record<Merch['garment'], string> = {
  tee: 'M150 70 L118 80 L52 120 L72 186 L112 170 L112 400 L288 400 L288 170 L328 186 L348 120 L282 80 L250 70 C240 92 222 102 200 102 C178 102 160 92 150 70 Z',
  hoodie:
    'M146 76 L114 88 L56 140 L60 330 L96 334 L104 200 L108 404 L292 404 L296 200 L304 334 L340 330 L344 140 L286 88 L254 76 C262 50 240 34 200 34 C160 34 138 50 146 76 Z',
  tote: 'M96 150 L304 150 L314 404 L86 404 Z',
}

/** Where the print goes on each garment: [x, y, width] in the 400 × 440 drawing. */
const PRINT_AT: Record<Merch['garment'], Record<Merch['print'], [number, number, number]>> = {
  tee: {
    mark: [218, 140, 46],
    wordmark: [140, 150, 120],
    rings: [150, 140, 100],
  },
  hoodie: {
    mark: [220, 150, 46],
    wordmark: [138, 160, 124],
    rings: [150, 150, 100],
  },
  tote: {
    mark: [150, 250, 100],
    wordmark: [120, 260, 160],
    rings: [140, 220, 120],
  },
}

export function GarmentMock({ p, colour = p.colours[0] }: { p: Merch; colour?: Merch['colours'][number] }) {
  const [x, y, w] = PRINT_AT[p.garment][p.print]
  return (
    <div className="cover cover--merch">
      <div className="cover__garment">
        <svg viewBox="0 0 400 440" aria-hidden>
          <defs>
            <linearGradient id={`shade-${p.id}`} x1="0" x2="1">
              <stop offset="0" stopColor="#000" stopOpacity="0.28" />
              <stop offset="0.3" stopColor="#000" stopOpacity="0" />
              <stop offset="0.7" stopColor="#000" stopOpacity="0" />
              <stop offset="1" stopColor="#000" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          {p.garment === 'tote' && <path d="M140 150 C140 60 260 60 260 150" fill="none" stroke={colour.hex} strokeWidth="12" />}
          <path d={SHAPES[p.garment]} fill={colour.hex} stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
          <path d={SHAPES[p.garment]} fill={`url(#shade-${p.id})`} />
          {p.garment === 'hoodie' && (
            <>
              <path d="M160 82 C170 112 230 112 240 82" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
              <path d="M138 300 L262 300 L270 360 L130 360 Z" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="2" />
            </>
          )}
          {p.print === 'mark' && (
            <svg x={x} y={y} width={w} height={w * (806 / 1485)} viewBox="0 0 1485 806">
              <path d={VA_MARK_PATH} fill={colour.ink} fillRule="evenodd" />
            </svg>
          )}
          {p.print === 'rings' &&
            Array.from({ length: 7 }, (_, i) => (
              <circle
                key={i}
                cx={x + w / 2}
                cy={y + w / 2}
                r={6 + i * 7}
                fill="none"
                stroke={colour.ink}
                strokeWidth={i % 3 === 0 ? 2 : 1}
                opacity={1 - i * 0.1}
              />
            ))}
        </svg>
        {p.print === 'wordmark' && (
          <span
            className="cover__print"
            style={
              {
                left: `${(x / 400) * 100}%`,
                top: `${(y / 440) * 100}%`,
                width: `${(w / 400) * 100}%`,
                background: colour.ink,
                WebkitMaskImage: `url(${lockup})`,
                maskImage: `url(${lockup})`,
              } as CSSProperties
            }
          />
        )}
      </div>
    </div>
  )
}
