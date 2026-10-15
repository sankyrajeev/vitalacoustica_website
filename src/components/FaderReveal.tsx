import { useEffect, useRef, useState } from 'react'
import { clubDown, clubFull } from '../content/projects'
import { useInView, useMediaQuery } from '../hooks/useMedia'
import { img, imgSet } from '../media'
import { PhotoHotspots } from './ui'

/**
 * Two photographs taken from the same position: the room with effects at rest,
 * and with the full rig running. A grand-master fader moves between them.
 */
export function FaderReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, '-25% 0px')
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  // with reduced motion there's no demonstration move, so start with the rig up
  const [level, setLevel] = useState(() => (reducedMotion ? 100 : 0))
  const [showGear, setShowGear] = useState(false)
  const touched = useRef(false)
  const done = useRef(false)

  // the first time it's in view, the fader rises slowly on its own to show what it does
  useEffect(() => {
    if (!inView || done.current || touched.current || reducedMotion) return
    const start = performance.now() + 600
    let raf = 0
    const step = (now: number) => {
      if (touched.current) return
      const k = Math.min(1, Math.max(0, (now - start) / 3200))
      setLevel(Math.round(100 * (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2)))
      if (k < 1) raf = requestAnimationFrame(step)
      else done.current = true
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [inView, reducedMotion])

  const set = (v: number) => {
    touched.current = true
    setLevel(v)
  }
  const v = level / 100

  return (
    <div ref={ref} className="fader">
      <div className="fader__stage" style={{ aspectRatio: `${clubFull.width} / ${clubFull.height}` }}>
        <img src={img(clubDown.src, 800)} srcSet={imgSet(clubDown.src)} sizes="(max-width: 900px) 100vw, 70vw" alt={clubDown.alt} loading="lazy" decoding="async" />
        <img className="fader__full" src={img(clubFull.src, 800)} srcSet={imgSet(clubFull.src)} sizes="(max-width: 900px) 100vw, 70vw" alt={clubFull.alt} loading="lazy" decoding="async" style={{ opacity: v }} />
        <PhotoHotspots hotspots={clubFull.hotspots ?? []} visible={showGear} />
      </div>

      <div className="fader__console" aria-label="Grand master">
        <div className="fader__track">
          <input
            id="grand-master"
            type="range"
            min={0}
            max={100}
            value={level}
            aria-label="Grand master fader"
            aria-valuetext={`${level}%`}
            onChange={(e) => set(+e.target.value)}
          />
        </div>
        <output htmlFor="grand-master" className="fader__value">
          {String(level).padStart(3, '0')}
        </output>
        <p className="fader__caption">{v < 0.08 ? 'At rest' : v > 0.92 ? 'Full rig' : 'Rising'}</p>
        <div className="fader__keys">
          <button onClick={() => set(0)}>0</button>
          <button onClick={() => set(100)}>Full</button>
          <button aria-pressed={showGear} onClick={() => setShowGear((s) => !s)}>
            {showGear ? 'Hide equipment' : 'Equipment'}
          </button>
        </div>
      </div>
    </div>
  )
}
