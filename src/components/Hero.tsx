import { lazy, Suspense, useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import type { GearId } from '../content/gear'
import { site } from '../content/site'
import { EXPLORE_EVENT } from '../events'
import { useInView, useMediaQuery } from '../hooks/useMedia'
import { useTheme } from '../hooks/useTheme'
import { droneInput } from '../three/drone'
import type { SceneMode } from '../three/HeroScene'
import { show } from '../three/show'
import { DroneHud } from './DroneHud'
import { ExploreUi } from './ExploreUi'

// three.js is large — load it separately so the page text paints immediately.
const HeroScene = lazy(() => import('../three/HeroScene'))

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref)
  const small = useMediaQuery('(max-width: 760px)')
  const touch = useMediaQuery('(pointer: coarse)')
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const { theme } = useTheme()
  const [mode, setMode] = useState<SceneMode>('hero')
  const [focus, setFocus] = useState<GearId | null>(null)
  const [haze, setHaze] = useState(show.haze)
  const fullscreen = mode !== 'hero'

  const exit = useCallback(() => {
    setMode('hero')
    setFocus(null)
  }, [])

  // lock page scroll while flying or exploring
  useEffect(() => {
    document.documentElement.classList.toggle('is-flying', fullscreen)
    return () => document.documentElement.classList.remove('is-flying')
  }, [fullscreen])

  // photos elsewhere on the page can send visitors straight to a fixture
  useEffect(() => {
    const open = (e: Event) => {
      const id = (e as CustomEvent<GearId | null>).detail
      window.scrollTo({ top: 0, behavior: 'auto' })
      setMode('explore')
      setFocus(id)
    }
    window.addEventListener(EXPLORE_EVENT, open)
    return () => window.removeEventListener(EXPLORE_EVENT, open)
  }, [])

  // drone: drag anywhere on the feed to look around
  const last = useRef<{ x: number; y: number } | null>(null)
  const onPointerDown = (e: PointerEvent) => {
    if (mode !== 'drone') return
    e.currentTarget.setPointerCapture(e.pointerId)
    last.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerMove = (e: PointerEvent) => {
    if (mode !== 'drone' || !last.current) return
    droneInput.look.dx += e.clientX - last.current.x
    droneInput.look.dy += e.clientY - last.current.y
    last.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = () => (last.current = null)

  return (
    <section id="top" ref={ref} className={`hero ${fullscreen ? `hero--full hero--${mode}` : ''}`}>
      <div
        className="hero__canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <Suspense fallback={null}>
          <HeroScene
            active={inView || fullscreen}
            small={small}
            reducedMotion={reducedMotion}
            theme={theme}
            mode={mode}
            focus={focus}
            onSelect={setFocus}
            haze={haze}
          />
        </Suspense>
      </div>

      {mode === 'drone' && <DroneHud onExit={exit} touch={touch} />}
      {mode === 'explore' && <ExploreUi focus={focus} onFocus={setFocus} onExit={exit} haze={haze} onHaze={setHaze} />}
      {mode === 'hero' && (
        <>
          <div className="hero__shade" />
          <div className="hero__content container">
            <h1 className="hero__title">
              Experience,
              <br />
              <span className="text-glow">Amplified.</span>
            </h1>
            <p className="hero__lede">
              Sound, lighting and visual production for techno and house shows of up to{' '}
              {site.maxCapacity.toLocaleString('en-IN')} people. We don't just drop off gear. We engineer the night.
            </p>
            <div className="hero__actions">
              <a href="#contact" className="btn btn--primary">
                Plan your show
              </a>
              <button className="btn btn--ghost" onClick={() => setMode('explore')}>
                <RigIcon /> Explore the rig
              </button>
              <button className="btn btn--ghost" onClick={() => setMode('drone')}>
                <DroneIcon /> Fly the venue
              </button>
            </div>
          </div>
          <a href="#shows" className="hero__scroll" aria-label="Scroll down">
            <span />
          </a>
        </>
      )}
    </section>
  )
}

function RigIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M3 4h18M5 4v16M19 4v16M5 8l14-4M5 4l14 4" />
      <circle cx="9" cy="11" r="1.6" />
      <circle cx="15" cy="11" r="1.6" />
      <path d="m9 12.6-2 7M15 12.6l2 7" />
    </svg>
  )
}

function DroneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <circle cx="5" cy="5" r="3" />
      <circle cx="19" cy="5" r="3" />
      <circle cx="5" cy="19" r="3" />
      <circle cx="19" cy="19" r="3" />
      <path d="M7.5 7.5 10 10M16.5 7.5 14 10M7.5 16.5 10 14M16.5 16.5 14 14" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
    </svg>
  )
}
