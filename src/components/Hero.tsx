import { lazy, Suspense, useRef } from 'react'
import { site } from '../content/site'
import { useInView, useMediaQuery } from '../hooks/useMedia'

// three.js is large — load it separately so the page text paints immediately.
const HeroScene = lazy(() => import('../three/HeroScene'))

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref)
  const small = useMediaQuery('(max-width: 760px)')
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  return (
    <section id="top" ref={ref} className="hero">
      <div className="hero__canvas">
        <Suspense fallback={null}>
          <HeroScene active={inView} small={small} reducedMotion={reducedMotion} />
        </Suspense>
      </div>
      <div className="hero__shade" />

      <div className="hero__content container">
        <p className="eyebrow">
          <span className="dot" /> {site.homeBase} · {site.region}
        </p>
        <h1 className="hero__title">
          Experience,
          <br />
          <span className="text-glow">Amplified.</span>
        </h1>
        <p className="hero__lede">
          Sound, lighting and visual production for techno and house shows of up to{' '}
          {site.maxCapacity.toLocaleString('en-IN')} people. We don't just drop off gear — we engineer the night.
        </p>
        <div className="hero__actions">
          <a href="#contact" className="btn btn--primary">
            Plan your show
          </a>
          <a href="#services" className="btn btn--ghost">
            What we do
          </a>
        </div>
      </div>

      <a href="#reach" className="hero__scroll" aria-label="Scroll down">
        <span />
      </a>
    </section>
  )
}
