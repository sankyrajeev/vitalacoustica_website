import { lazy, Suspense, useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { gearById, type GearId } from '../content/gear'
import { fader, photos, type Hotspot } from '../content/shows'
import { openExplore } from '../events'
import { useInView, useMediaQuery } from '../hooks/useMedia'
import { REEL_HEIGHT, reelStops } from '../three/reelLayout'
import type { ReelControl } from '../three/ShowReel'

const ShowReel = lazy(() => import('../three/ShowReel'))
const img = (name: string, w: 800 | 1600) => `${import.meta.env.BASE_URL}shows/${name}-${w}.webp`

/* ─────────────── Gear markers on a photo ─────────────── */

function PhotoHotspots({ hotspots, visible }: { hotspots: Hotspot[]; visible: boolean }) {
  const [picked, setOpen] = useState<GearId | null>(null)
  const open = visible ? picked : null
  const spot = hotspots.find((h) => h.gear === open)
  const g = spot ? gearById[spot.gear] : null
  return (
    <div className={`photo-spots ${visible ? 'is-visible' : ''}`}>
      {hotspots.map((h) => {
        const isOpen = open === h.gear
        return (
          <button
            key={h.gear}
            className={`hotspot photo-spot ${isOpen ? 'is-active' : ''}`}
            style={{ left: `${h.x}%`, top: `${h.y}%` }}
            aria-expanded={isOpen}
            aria-label={gearById[h.gear].name}
            tabIndex={visible ? 0 : -1}
            onClick={() => setOpen(isOpen ? null : h.gear)}
          >
            <span className="hotspot__dot" />
            <span className="hotspot__label">{gearById[h.gear].name}</span>
          </button>
        )
      })}
      {spot && g && (
        // next to the marker on wide screens; docked along the bottom of the photo on phones
        <div
          className={`photo-pop ${spot.x > 50 ? 'photo-pop--left' : ''} ${spot.y > 62 ? 'photo-pop--up' : ''}`}
          style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
        >
          <strong>{g.name}</strong>
          <span className="photo-pop__role">{g.role}</span>
          <p>{g.about}</p>
          <button className="link-btn" onClick={() => openExplore(g.id)}>
            See it in 3D →
          </button>
        </div>
      )}
    </div>
  )
}

/* ─────────────── Master fader: lights down → full rig ─────────────── */

function FaderReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, '-20% 0px')
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  // with reduced motion there's no auto demo, so start with the rig up
  const [level, setLevel] = useState(() => (reducedMotion ? 100 : 0))
  const [showGear, setShowGear] = useState(false)
  const touched = useRef(false)
  const demoed = useRef(false) // finished playing once

  // first time it scrolls into view, push the fader up on its own to show what it does
  useEffect(() => {
    if (!inView || demoed.current || touched.current || reducedMotion) return
    const start = performance.now()
    let raf = 0
    const step = (now: number) => {
      if (touched.current) return
      const k = Math.min(1, (now - start) / 2600)
      setLevel(Math.round(100 * (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2)))
      if (k < 1) raf = requestAnimationFrame(step)
      else demoed.current = true
    }
    const delay = setTimeout(() => (raf = requestAnimationFrame(step)), 500)
    return () => {
      clearTimeout(delay)
      cancelAnimationFrame(raf)
    }
  }, [inView, reducedMotion])

  const v = level / 100
  return (
    <div ref={ref} className="fader-reveal" data-reveal>
      <div className={`fader-reveal__stage ${v > 0.55 ? 'is-live' : ''}`} style={{ aspectRatio: `${fader.width} / ${fader.height}` }}>
        <img src={img(fader.down, 1600)} alt="Club night with the rig at rest: neon and house lights only" loading="lazy" />
        <img
          className="fader-reveal__full"
          src={img(fader.full, 1600)}
          alt="The same room with the full rig firing: trefoils, matrix panels and hex retros in red"
          loading="lazy"
          style={{ opacity: v }}
        />
        <PhotoHotspots hotspots={fader.hotspots} visible={showGear} />
        <span className="fader-reveal__tag">{v < 0.1 ? 'Lights down' : v > 0.9 ? 'Full rig' : 'Bringing it up…'}</span>
      </div>

      <div className="console" aria-label="Lighting console">
        <div className="console__fader">
          <span className="console__scale" aria-hidden>
            <i>100</i>
            <i>50</i>
            <i>0</i>
          </span>
          <input
            id="master-fader"
            type="range"
            min={0}
            max={100}
            value={level}
            aria-label="Master fader"
            aria-valuetext={`${level}%`}
            onChange={(e) => {
              touched.current = true
              setLevel(+e.target.value)
            }}
          />
        </div>
        <output htmlFor="master-fader" className="console__readout">
          {String(level).padStart(3, '0')}
          <small>%</small>
        </output>
        <span className="console__label">Grand master</span>
        <button className={`console__key ${showGear ? 'is-on' : ''}`} onClick={() => setShowGear((s) => !s)} aria-pressed={showGear}>
          {showGear ? 'Hide gear' : 'Show gear'}
        </button>
        <div className="console__presets">
          <button className="console__key" onClick={() => ((touched.current = true), setLevel(0))}>
            Blackout
          </button>
          <button className="console__key" onClick={() => ((touched.current = true), setLevel(100))}>
            Full
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────── WebGL reel + lightbox ─────────────── */

function Lightbox({ index, onClose, onStep }: { index: number; onClose: () => void; onStep: (d: number) => void }) {
  const p = photos[index]
  const close = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    close.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onStep(1)
      if (e.key === 'ArrowLeft') onStep(-1)
    }
    window.addEventListener('keydown', onKey)
    document.documentElement.classList.add('is-flying')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.documentElement.classList.remove('is-flying')
    }
  }, [onClose, onStep])

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${p.title}, ${p.place}`} onClick={onClose}>
      <figure onClick={(e) => e.stopPropagation()}>
        <div className="lightbox__img" style={{ '--ar': p.width / p.height } as CSSProperties}>
          <img src={img(p.src, 1600)} alt={`${p.title} at ${p.place}`} />
          <PhotoHotspots hotspots={p.hotspots} visible />
        </div>
        <figcaption>
          <span>
            <strong>{p.title}</strong> · {p.place}
          </span>
          <span className="lightbox__hint">Tap the markers to see what's in the rig</span>
        </figcaption>
      </figure>
      <button ref={close} className="lightbox__close icon-btn" onClick={onClose} aria-label="Close">
        ×
      </button>
      <button
        className="lightbox__nav lightbox__nav--prev icon-btn"
        onClick={(e) => (e.stopPropagation(), onStep(-1))}
        aria-label="Previous photo"
      >
        ←
      </button>
      <button
        className="lightbox__nav lightbox__nav--next icon-btn"
        onClick={(e) => (e.stopPropagation(), onStep(1))}
        aria-label="Next photo"
      >
        →
      </button>
    </div>
  )
}

const stops = reelStops(photos)

function Reel() {
  const wrap = useRef<HTMLDivElement>(null)
  const inView = useInView(wrap, '100px')
  const touch = useMediaQuery('(pointer: coarse)')
  const control = useRef<ReelControl>({ offset: 0, target: 0, velocity: 0 }).current
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState<number | null>(null)
  const drag = useRef<{ x: number; target: number; moved: boolean } | null>(null)
  const wasDragged = useRef(false)

  const go = useCallback(
    (i: number) => {
      const n = (i + photos.length) % photos.length
      control.target = stops[n]
      setIndex(n)
    },
    [control],
  )
  const snap = () => {
    let best = 0
    stops.forEach((s, i) => Math.abs(s - control.target) < Math.abs(stops[best] - control.target) && (best = i))
    go(best)
  }
  const unitsPerPx = () => {
    const h = wrap.current?.clientHeight ?? 500
    // visible height at the panel plane (camera z 4.6, fov 40) spread over the canvas height
    return (2 * 4.6 * Math.tan((20 * Math.PI) / 180)) / h
  }

  const onDown = (e: PointerEvent) => {
    drag.current = { x: e.clientX, target: control.target, moved: false }
    wasDragged.current = false
  }
  const onMove = (e: PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    if (Math.abs(dx) > 6) d.moved = wasDragged.current = true
    if (d.moved) {
      control.target = Math.max(stops[0] - 1, Math.min(stops[stops.length - 1] + 1, d.target - dx * unitsPerPx() * 1.4))
    }
  }
  const onUp = () => {
    if (drag.current?.moved) snap()
    drag.current = null
  }

  // horizontal trackpad swipes move the reel; vertical scrolling stays with the page
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    let timer = 0
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
      e.preventDefault()
      control.target = Math.max(stops[0], Math.min(stops[stops.length - 1], control.target + e.deltaX * 0.006))
      clearTimeout(timer)
      timer = window.setTimeout(snap, 140)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
    // snap only reads refs/stable values
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [control])

  const p = photos[index]
  return (
    <div className="reel" data-reveal>
      <div
        ref={wrap}
        className="reel__canvas"
        style={{ height: `min(${REEL_HEIGHT * 26}vh, 620px)` }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') go(index + 1)
          if (e.key === 'ArrowLeft') go(index - 1)
          if (e.key === 'Enter') setOpen(index)
        }}
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label="Show photos. Use the arrow keys to move, Enter to open."
      >
        <Suspense
          fallback={
            <div className="reel__fallback">
              {photos.map((ph) => (
                <img key={ph.id} src={img(ph.src, 800)} alt={`${ph.title} at ${ph.place}`} />
              ))}
            </div>
          }
        >
          <ShowReel photos={photos} control={control} touch={touch} active={inView && open === null} onOpen={setOpen} dragged={() => wasDragged.current} />
        </Suspense>
      </div>
      <div className="reel__bar">
        <button className="icon-btn" onClick={() => go(index - 1)} aria-label="Previous photo">
          ←
        </button>
        <p className="reel__caption" aria-live="polite">
          <span className="reel__count">
            {String(index + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
          </span>
          <strong>{p.title}</strong>
          <span className="muted">{p.place}</span>
        </p>
        <button className="btn btn--ghost btn--sm" onClick={() => setOpen(index)}>
          Open &amp; see the gear
        </button>
        <button className="icon-btn" onClick={() => go(index + 1)} aria-label="Next photo">
          →
        </button>
      </div>
      {open !== null && (
        <Lightbox
          index={open}
          onClose={() => setOpen(null)}
          onStep={(d) => {
            const n = (open + d + photos.length) % photos.length
            setOpen(n)
            go(n)
          }}
        />
      )}
    </div>
  )
}

export function Shows() {
  const touch = useMediaQuery('(pointer: coarse)')
  return (
    <section id="shows" className="section container">
      <div className="section__head" data-reveal>
        <p className="eyebrow">Shows</p>
        <h2>
          Same room.
          <br />
          <span className="muted">Different night.</span>
        </h2>
        <p className="section__lede">
          Lighting changes everything. Push the fader up and watch the rig come in, then switch on the gear markers to
          see what's doing the work.
        </p>
      </div>
      <FaderReveal />
      <div className="section__sub" data-reveal>
        <h3>From the floor</h3>
        <p className="muted">{touch ? 'Swipe through the photos. Tap one to open it.' : 'Move your cursor over a photo to light it up. Drag or use the arrows to move, click to open.'}</p>
      </div>
      <Reel />
    </section>
  )
}
