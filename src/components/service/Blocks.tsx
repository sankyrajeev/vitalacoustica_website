import { useEffect, useState, type ReactNode } from 'react'
import { Label } from '../ui'
import { img, imgSet } from '../../media'

// Building blocks shared by the service pages: a text-and-scene section, a stepped process,
// expandable detail tiles, and full-width statement banners.

export function Feature({
  n,
  kicker,
  title,
  line,
  scene,
  flip,
  children,
}: {
  n: string
  kicker: string
  title: string
  line: string
  scene: ReactNode
  flip?: boolean
  children: ReactNode
}) {
  return (
    <section className={`feature ${flip ? 'feature--flip' : ''}`} aria-labelledby={`f-${n}`}>
      <div className="wrap feature__inner">
        <div className="feature__text">
          <Label index={n}>{kicker}</Label>
          <h2 id={`f-${n}`} className="h1 feature__title">
            {title}
          </h2>
          <p className="feature__line">{line}</p>
          {children}
        </div>
        <div className="feature__scene">{scene}</div>
      </div>
    </section>
  )
}

export function Process({ steps, label }: { steps: string[][]; label: string }) {
  const [step, setStep] = useState(0)
  const [auto, setAuto] = useState(true)
  useEffect(() => {
    if (!auto || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setTimeout(() => setStep((s) => (s + 1) % steps.length), 3800)
    return () => window.clearTimeout(id)
  }, [step, auto, steps.length])
  return (
    <div className="timeline" style={{ ['--step' as string]: step, ['--steps' as string]: steps.length }}>
      <ol className="timeline__track" role="tablist" aria-label={label}>
        {steps.map(([name], i) => (
          <li key={name}>
            <button
              role="tab"
              aria-selected={i === step}
              className={`${i === step ? 'is-on' : ''} ${i < step ? 'is-done' : ''}`}
              onClick={() => {
                setAuto(false)
                setStep(i)
              }}
            >
              <span className="timeline__n">0{i + 1}</span>
              <span className="timeline__name">{name}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="timeline__bar" aria-hidden>
        <span />
      </div>
      <div className="timeline__panel" role="tabpanel" aria-live="polite">
        <p className="timeline__big">
          <span>0{step + 1}</span> {steps[step][0]}
        </p>
        <p>{steps[step][1]}</p>
      </div>
    </div>
  )
}

export function Details({ items }: { items: string[][] }) {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <ul className="details">
      {items.map(([t, b], i) => (
        <li key={t}>
          <button
            className={`detail ${open === i ? 'is-open' : ''}`}
            aria-expanded={open === i}
            onClick={() => setOpen(open === i ? null : i)}
            onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(i)}
            onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(null)}
          >
            <span className="detail__n">{String(i + 1).padStart(2, '0')}</span>
            <span className="detail__title">{t}</span>
            <span className="detail__body">{b}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

/** A full-width statement between sections, over one of our show photos. */
export function Banner({ title, lines, photo, alt = '' }: { title: string; lines: string[]; photo: string; alt?: string }) {
  return (
    <section className="banner" aria-label={title}>
      <img className="banner__photo" src={img(photo, 1600)} srcSet={imgSet(photo)} sizes="100vw" alt={alt} loading="lazy" decoding="async" />
      <div className="wrap banner__inner">
        <p className="banner__title">{title}</p>
      </div>
      <div className="banner__ticker" aria-hidden>
        <div>
          {[...lines, ...lines].map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      </div>
      <ul className="sr-only">
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </section>
  )
}
