import { lazy, Suspense, useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import { site } from '../content/site'
import { useInView, useMediaQuery } from '../hooks/useMedia'
import { useTheme } from '../hooks/useTheme'
import { droneInput } from '../three/drone'
import { DroneHud } from './DroneHud'

// three.js is large — load it separately so the page text paints immediately.
const HeroScene = lazy(() => import('../three/HeroScene'))

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref)
  const small = useMediaQuery('(max-width: 760px)')
  const touch = useMediaQuery('(pointer: coarse)')
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const { theme } = useTheme()
  const [drone, setDrone] = useState(false)

  const exit = useCallback(() => setDrone(false), [])

  // lock page scroll while flying
  useEffect(() => {
    document.documentElement.classList.toggle('is-flying', drone)
    return () => document.documentElement.classList.remove('is-flying')
  }, [drone])

  // drag anywhere on the feed to look around
  const last = useRef<{ x: number; y: number } | null>(null)
  const onPointerDown = (e: PointerEvent) => {
    if (!drone) return
    e.currentTarget.setPointerCapture(e.pointerId)
    last.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerMove = (e: PointerEvent) => {
    if (!drone || !last.current) return
    droneInput.look.dx += e.clientX - last.current.x
    droneInput.look.dy += e.clientY - last.current.y
    last.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = () => (last.current = null)

  return (
    <section id="top" ref={ref} className={`hero ${drone ? 'hero--drone' : ''}`}>
      <div
        className="hero__canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <Suspense fallback={null}>
          <HeroScene active={inView || drone} small={small} reducedMotion={reducedMotion} theme={theme} drone={drone} />
        </Suspense>
      </div>

      {drone ? (
        <DroneHud onExit={exit} touch={touch} />
      ) : (
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
              <button className="btn btn--ghost" onClick={() => setDrone(true)}>
                <DroneIcon /> Fly the venue
              </button>
            </div>
          </div>
          <a href="#rig" className="hero__scroll" aria-label="Scroll down">
            <span />
          </a>
        </>
      )}
    </section>
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
