import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import type { GearId } from '../content/gear'
import { openDrone, openExplore, STAGE_EVENT, type StageRequest } from '../events'
import { useMediaQuery } from '../hooks/useMedia'
import { useTheme } from '../hooks/useTheme'
import { mediaUrl } from '../media'
import { droneInput } from '../three/drone'
import { show } from '../three/show'
import { DroneHud } from './DroneHud'
import { ExploreUi } from './ExploreUi'
import { Arrow } from './ui'

const StageScene = lazy(() => import('../three/StageScene'))

/** Keeps a WebGL failure inside the overlay instead of taking down the page. */
class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/** Inline entry point: a still of the stage model with the two ways in. */
export function StageModelLauncher({ caption }: { caption?: string }) {
  return (
    <figure className="stage-launch">
      <button className="stage-launch__still" onClick={() => openExplore(null)} aria-label="Open the interactive stage model">
        <img src={mediaUrl('stage-model.webp')} alt="Render of the stage model: goal-post truss, beam fixtures, lighting wings and d&b system" loading="lazy" width={1600} height={1000} />
        <span className="stage-launch__badge">Interactive · 3D</span>
      </button>
      <figcaption>
        <span className="muted">{caption ?? 'A model of our typical stage, built to the published dimensions of the equipment.'}</span>
        <span className="stage-launch__actions">
          <button className="text-link" onClick={() => openExplore(null)}>
            Inspect the rig <Arrow />
          </button>
          <button className="text-link" onClick={openDrone}>
            Fly the venue <Arrow />
          </button>
        </span>
      </figcaption>
    </figure>
  )
}

/** Full-screen stage model, opened from anywhere via openExplore()/openDrone(). */
export function StageModelOverlay() {
  const [req, setReq] = useState<StageRequest | null>(null)
  const [focus, setFocus] = useState<GearId | null>(null)
  const [haze, setHaze] = useState(show.haze)
  const [failed, setFailed] = useState(false)
  const small = useMediaQuery('(max-width: 760px)')
  const touch = useMediaQuery('(pointer: coarse)')
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const { theme } = useTheme()
  const returnFocus = useRef<Element | null>(null)

  useEffect(() => {
    const open = (e: Event) => {
      const detail = (e as CustomEvent<StageRequest>).detail
      returnFocus.current = document.activeElement
      setFailed(false)
      setReq(detail)
      setFocus(detail.focus)
    }
    window.addEventListener(STAGE_EVENT, open)
    return () => window.removeEventListener(STAGE_EVENT, open)
  }, [])

  const close = useCallback(() => {
    setReq(null)
    setFocus(null)
    ;(returnFocus.current as HTMLElement | null)?.focus?.()
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('is-locked', Boolean(req))
    return () => document.documentElement.classList.remove('is-locked')
  }, [req])

  // drone: drag anywhere on the feed to look around
  const last = useRef<{ x: number; y: number } | null>(null)
  const onDown = (e: PointerEvent) => {
    if (req?.mode !== 'drone') return
    e.currentTarget.setPointerCapture(e.pointerId)
    last.current = { x: e.clientX, y: e.clientY }
  }
  const onMove = (e: PointerEvent) => {
    if (req?.mode !== 'drone' || !last.current) return
    droneInput.look.dx += e.clientX - last.current.x
    droneInput.look.dy += e.clientY - last.current.y
    last.current = { x: e.clientX, y: e.clientY }
  }
  const onUp = () => (last.current = null)

  if (!req) return null
  return (
    <div className={`stage stage--${req.mode}`} role="dialog" aria-modal="true" aria-label="Interactive stage model">
      <div className="stage__canvas" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <SceneBoundary onError={() => setFailed(true)}>
          <Suspense fallback={<p className="stage__loading label">Loading the stage model…</p>}>
            <StageScene
              active
              small={small}
              reducedMotion={reducedMotion}
              theme={theme}
              mode={req.mode}
              focus={focus}
              haze={haze}
            />
          </Suspense>
        </SceneBoundary>
        {failed && (
          <div className="stage__failed">
            <p className="label">3D unavailable</p>
            <p>This device couldn’t start the 3D view. The equipment list and photographs on the site show the same rig.</p>
          </div>
        )}
      </div>
      {req.mode === 'drone' ? (
        <DroneHud onExit={close} touch={touch} />
      ) : (
        <ExploreUi focus={focus} onFocus={setFocus} onExit={close} haze={haze} onHaze={setHaze} />
      )}
    </div>
  )
}
