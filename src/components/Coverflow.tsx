import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { useMediaQuery } from '../hooks/useMedia'
import { img } from '../media'
import { navigate } from '../router'
import { Arrow, TextLink } from './ui'

export type Slide = {
  src: string // show photo base name (public/shows)
  alt: string
  title: string
  meta?: string
  href?: string
}

const AUTOPLAY_MS = 5200

/**
 * A centred 3D slideshow: the current photo faces you and leans with the pointer; its
 * neighbours turn away into depth. The page behind glows with the current photo.
 * Swipe or drag, use the arrows, the thumbnails or the keyboard; it advances on its own until touched.
 */
export function Coverflow({ slides, label = 'Photographs' }: { slides: Slide[]; label?: string }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [drag, setDrag] = useState(0)
  const start = useRef<{ x: number; id: number } | null>(null)
  const active = useRef<HTMLDivElement>(null)
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const small = useMediaQuery('(max-width: 760px)')
  const n = slides.length

  const go = useCallback((i: number) => setIndex(((i % n) + n) % n), [n])
  // any manual move stops the autoplay
  const jump = (i: number) => {
    setPaused(true)
    go(i)
  }

  useEffect(() => {
    if (paused || reduced || n < 2) return
    const t = window.setTimeout(() => go(index + 1), AUTOPLAY_MS)
    return () => window.clearTimeout(t)
  }, [index, paused, reduced, go, n])

  // swipe / drag
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    start.current = { x: e.clientX, id: e.pointerId }
    setPaused(true)
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (start.current) {
      const dx = e.clientX - start.current.x
      if (Math.abs(dx) > 6) e.currentTarget.setPointerCapture(start.current.id)
      setDrag(dx)
      return
    }
    // the front photo leans towards the pointer
    const el = active.current
    if (!el || reduced || e.pointerType !== 'mouse') return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--lean-x', String(((e.clientX - r.left) / r.width - 0.5) * 2))
    el.style.setProperty('--lean-y', String(((e.clientY - r.top) / r.height - 0.5) * 2))
  }
  const onUp = () => {
    if (!start.current) return
    start.current = null
    if (Math.abs(drag) > 50) go(index + (drag < 0 ? 1 : -1))
    setDrag(0)
  }
  const onLeave = () => {
    active.current?.style.setProperty('--lean-x', '0')
    active.current?.style.setProperty('--lean-y', '0')
    setPaused(false)
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    jump(index + (e.key === 'ArrowRight' ? 1 : -1))
  }

  if (n === 0) return null
  const current = slides[index]
  const spread = small ? 72 : 56 // % of a slide width between neighbours

  return (
    <div className="flow" role="region" aria-roledescription="carousel" aria-label={label} onKeyDown={onKey}>
      {/* ambient light from the current photo */}
      <div className="flow__ambient" aria-hidden>
        {slides.map((s, i) => (
          <img key={s.src} src={img(s.src, 800)} alt="" className={i === index ? 'is-on' : ''} />
        ))}
      </div>

      <div
        className={`flow__stage ${drag ? 'is-dragging' : ''}`}
        tabIndex={0}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={onLeave}
      >
        {slides.map((s, i) => {
          // shortest way round the loop
          let d = i - index
          if (d > n / 2) d -= n
          if (d < -n / 2) d += n
          const pos = d + drag / 600
          const far = Math.abs(d) > 2
          const style = {
            '--pos': pos,
            '--abs': Math.abs(pos),
            '--spread': `${spread}%`,
            zIndex: 10 - Math.abs(d),
            opacity: far ? 0 : 1,
            pointerEvents: far ? 'none' : undefined,
          } as CSSProperties
          return (
            <div
              key={s.src}
              ref={d === 0 ? active : undefined}
              className={`flow__slide ${d === 0 ? 'is-active' : ''}`}
              style={style}
              aria-hidden={d !== 0}
              onClick={() => {
                if (Math.abs(drag) > 6) return
                if (d !== 0) return go(i)
                if (s.href) navigate(s.href)
              }}
            >
              <div className="flow__frame">
                <img
                  src={img(s.src, 1600)}
                  srcSet={`${img(s.src, 800)} 800w, ${img(s.src, 1600)} 1600w`}
                  sizes="(max-width: 760px) 80vw, 54vw"
                  alt={s.alt}
                  draggable={false}
                  loading={Math.abs(d) <= 1 ? 'eager' : 'lazy'}
                />
                <span className="flow__shine" aria-hidden />
              </div>
              {/* the floor reflection */}
              <div className="flow__reflection" aria-hidden>
                <img src={img(s.src, 800)} alt="" draggable={false} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="flow__info" aria-live="polite">
        <p className="label">
          <span className="label__index">{String(index + 1).padStart(2, '0')}</span>/ {String(n).padStart(2, '0')}
        </p>
        <h2 className="flow__title h2">{current.title}</h2>
        {current.meta && <p className="flow__meta">{current.meta}</p>}
        {current.href && (
          <TextLink to={current.href}>View the show</TextLink>
        )}
      </div>

      {n > 1 && (
        <div className="flow__controls">
          <button className="tslider__arrow tslider__arrow--prev" onClick={() => jump(index - 1)} aria-label="Previous photo">
            <Arrow />
          </button>
          <div className="flow__thumbs">
            {slides.map((s, i) => (
              <button
                key={s.src}
                className={i === index ? 'is-active' : ''}
                onClick={() => jump(i)}
                aria-label={`Photo ${i + 1}: ${s.title}`}
                aria-current={i === index}
              >
                <img src={img(s.src, 800)} alt="" loading="lazy" />
              </button>
            ))}
          </div>
          <button className="tslider__arrow" onClick={() => jump(index + 1)} aria-label="Next photo">
            <Arrow />
          </button>
        </div>
      )}
    </div>
  )
}
