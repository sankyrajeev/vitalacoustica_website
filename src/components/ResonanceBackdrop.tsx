import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { useMediaQuery } from '../hooks/useMedia'
import { useTheme } from '../hooks/useTheme'
import { mediaUrl } from '../media'

const ResonanceCanvas = lazy(() => import('../three/resonance/ResonanceCanvas'))

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

/** If the 3D scene throws, the page carries on with the still image. */
class Quiet extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/**
 * The homepage's fixed 3D layer. Sits behind all content and never takes pointer events,
 * so navigation, text and forms work whether or not WebGL is available.
 */
export function ResonanceBackdrop() {
  const host = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [webgl] = useState(hasWebGL)
  const mobile = useMediaQuery('(max-width: 760px)')
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const { theme } = useTheme()
  // the 3D engine is large: fetch it only once the page has loaded and the browser is idle,
  // so the still image and the text appear first (and count for the page's speed)
  const [start, setStart] = useState(false)
  useEffect(() => {
    if (!webgl) return
    let idle = 0
    const go = () => {
      const ric = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200))
      idle = ric(() => setStart(true), { timeout: 1500 })
    }
    if (document.readyState === 'complete') go()
    else window.addEventListener('load', go, { once: true })
    return () => {
      window.removeEventListener('load', go)
      window.cancelIdleCallback?.(idle)
    }
  }, [webgl])

  return (
    <div className={`resonance ${ready ? 'is-ready' : ''} ${webgl ? '' : 'resonance--still'}`} aria-hidden>
      <div className="resonance__atmosphere" />
      {/* still render: shown while loading and as the fallback without WebGL */}
      <div className="resonance__still" style={{ backgroundImage: `url(${mediaUrl(`resonance-${mobile ? 'mobile' : 'desktop'}-${theme}.webp`)})` }} />
      <div ref={host} className="resonance__canvas">
        {webgl && start && (
          <Quiet>
            <Suspense fallback={null}>
              <ResonanceCanvas theme={theme} mobile={mobile} reducedMotion={reducedMotion} host={host} onReady={() => setReady(true)} />
            </Suspense>
          </Quiet>
        )}
      </div>
    </div>
  )
}
