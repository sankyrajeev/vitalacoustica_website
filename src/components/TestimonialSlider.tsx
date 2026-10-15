import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { projectBySlug } from '../content/projects'
import type { Testimonial } from '../content/testimonials'
import { Link } from './Link'
import { Arrow } from './ui'

/**
 * One testimonial at a time. Swipe on touch screens (native scroll-snap), drag with a mouse,
 * or use the arrows, dots and keyboard.
 */
export function TestimonialSlider({ items, label = 'Testimonials' }: { items: Testimonial[]; label?: string }) {
  const track = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const drag = useRef<{ x: number; left: number } | null>(null)

  const go = useCallback(
    (i: number) => {
      const el = track.current
      if (!el) return
      const n = Math.max(0, Math.min(items.length - 1, i))
      el.scrollTo({ left: n * el.clientWidth, behavior: 'smooth' })
    },
    [items.length],
  )

  // keep the dots in step with whatever moved the track (swipe, drag, buttons)
  useEffect(() => {
    const el = track.current
    if (!el) return
    const onScroll = () => setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)))
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // mouse drag (touch uses native swiping)
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !track.current) return
    drag.current = { x: e.clientX, left: track.current.scrollLeft }
    track.current.classList.add('is-dragging')
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !track.current) return
    track.current.scrollLeft = drag.current.left - (e.clientX - drag.current.x)
  }
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !track.current) return
    const moved = e.clientX - drag.current.x
    drag.current = null
    track.current.classList.remove('is-dragging')
    go(Math.abs(moved) > 60 ? index + (moved < 0 ? 1 : -1) : index)
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    go(index + (e.key === 'ArrowRight' ? 1 : -1))
  }

  if (items.length === 0) return null
  return (
    <div className="tslider" role="region" aria-roledescription="carousel" aria-label={label} onKeyDown={onKey}>
      <div
        ref={track}
        className="tslider__track"
        tabIndex={0}
        aria-live="polite"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {items.map((t, i) => {
          const project = t.project ? projectBySlug(t.project) : undefined
          return (
            <figure
              key={t.name + i}
              className="tslide"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${items.length}`}
              aria-hidden={i !== index}
            >
              {t.sample && <span className="quote-card__sample">Sample</span>}
              <blockquote className="tslide__quote">
                <p>{t.quote}</p>
              </blockquote>
              <figcaption className="tslide__by">
                <strong>{t.name}</strong>
                {t.context && <span>{t.context}</span>}
                {project && (
                  <Link to={`/work/${project.slug}`} className="underline" tabIndex={i === index ? 0 : -1}>
                    {project.title}
                  </Link>
                )}
              </figcaption>
            </figure>
          )
        })}
      </div>

      {items.length > 1 && (
        <div className="tslider__controls">
          <button className="tslider__arrow tslider__arrow--prev" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous testimonial">
            <Arrow />
          </button>
          <div className="tslider__dots">
            {items.map((_, i) => (
              <button key={i} className={i === index ? 'is-active' : ''} onClick={() => go(i)} aria-label={`Testimonial ${i + 1}`} aria-current={i === index} />
            ))}
          </div>
          <span className="tslider__count" aria-hidden>
            {String(index + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
          </span>
          <button className="tslider__arrow" onClick={() => go(index + 1)} disabled={index === items.length - 1} aria-label="Next testimonial">
            <Arrow />
          </button>
        </div>
      )}
    </div>
  )
}
