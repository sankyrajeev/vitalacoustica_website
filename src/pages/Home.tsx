import { useEffect, useState } from 'react'
import { EnquiryForm } from '../components/EnquiryForm'
import { QuoteCard } from '../components/QuoteCard'
import { ResonanceBackdrop } from '../components/ResonanceBackdrop'
import { Arrow, Cta, Label, Logo, TextLink } from '../components/ui'
import { site } from '../content/site'
import { testimonials } from '../content/testimonials'
import { openDrone, openExplore } from '../events'
import { mediaUrl } from '../media'
import { useSectionSnap } from '../hooks/useSectionSnap'
import { scrollToId } from '../router'

const SNAP_SECTIONS = '.intro, .entrance, .statement, .renders, .voices, .final'

// The homepage: the brand, the 3D, what clients say, and the enquiry. The Resonance Form
// (a fixed 3D layer) changes with each section. Equipment, services and work have their own pages.
export function Home() {
  // each section settles centred on screen instead of stopping wherever the scroll ends
  useSectionSnap(SNAP_SECTIONS)
  return (
    <>
      <ResonanceBackdrop />
      <Intro />
      <Entrance />
      <Statement />
      <Renders />
      <Voices />
      <FinalEnquiry />
    </>
  )
}

/* 00 — The opening frame: the logo beside the sculpture, nothing else */
function Intro() {
  // the scroll hint goes as soon as the visitor starts scrolling
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <section className="intro" data-scene="intro" aria-label="Vital Acoustica: pro audio, lighting, rentals">
      <div className="wrap intro__inner">
        <Logo tagline className="intro__logo" />
      </div>
      <button
        className={`intro__scroll ${scrolled ? 'is-hidden' : ''}`}
        onClick={() => scrollToId('entrance')}
        aria-label="Scroll to the introduction"
        tabIndex={scrolled ? -1 : 0}
      >
        Scroll
        <span aria-hidden />
      </button>
    </section>
  )
}

/* 01 — The entrance: the sculpture, the line, and what we do */
function Entrance() {
  return (
    <section id="entrance" className="entrance" data-scene="entrance" aria-labelledby="entrance-title">
      <div className="wrap entrance__inner">
        <Label>{site.eyebrow}</Label>
        <h1 id="entrance-title" className="display">
          We shape the way an experience <em>feels.</em>
        </h1>
        <p className="entrance__intro">{site.rental}</p>
        <div className="entrance__actions">
          <Cta to="/equipment">Explore equipment</Cta>
          <Cta to="/contact" variant="quiet">
            Get a quote
          </Cta>
        </div>
      </div>
    </section>
  )
}

/* 02 — A short statement and the four things we are known for */
function Statement() {
  const facts = [
    ['d&b audiotechnik', 'Sound systems'],
    ['Beam · Retro · LED', 'Lighting'],
    ['Crew on every show', 'Setup & operation'],
    ['Permanent installs', 'Consulting'],
  ]
  return (
    <section id="statement" className="statement" data-scene="manifesto" aria-labelledby="statement-title">
      <div className="wrap statement__inner">
        <Label index="01">Vital Acoustica</Label>
        <h2 id="statement-title" className="h1">
          Production is more than equipment.
        </h2>
        <p className="statement__body">
          We hire out professional sound and lighting, and we bring the people who know how to make it feel right: system
          design, rigging, tuning and an operator at the desk until the last track.
        </p>
        <dl className="facts-row">
          {facts.map(([big, small]) => (
            <div key={small}>
              <dt>{small}</dt>
              <dd>{big}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

const RENDERS = [
  { file: 'render-stage.webp', w: 1600, h: 1000, title: 'The stage', note: 'Goal-post truss, beams, lighting wings and the d&b system', open: () => openExplore(null) },
  { file: 'render-wing.webp', w: 1200, h: 900, title: 'Lighting wing', note: 'Matrix panel, fan light, hex retro and LED bars', open: () => openExplore('matrix') },
  { file: 'render-drone.webp', w: 1200, h: 900, title: 'Drone view', note: 'Fly the venue from the audience to the booth', open: openDrone },
]

/* 03 — Renders of our stage model, each one a way into the live 3D view */
function Renders() {
  return (
    <section className="section renders" data-scene="renders" aria-labelledby="renders-title">
      <div className="wrap">
        <header className="section-head renders__head">
          <Label index="02">The rig in 3D</Label>
          <h2 id="renders-title" className="h1">
            Step inside before the show.
          </h2>
          <p className="lede">
            Our stage, modelled from the published dimensions of the equipment and rendered in real time. Orbit it, run the
            lights from the desk, or fly through it like a drone.
          </p>
        </header>
        <div className="renders__grid">
          {RENDERS.map((r, i) => (
            <button key={r.file} className={`render render--${i}`} onClick={r.open} aria-label={`${r.title}: open in 3D`}>
              <img src={mediaUrl(r.file)} alt="" width={r.w} height={r.h} loading="lazy" decoding="async" />
              <span className="render__badge">Real-time render</span>
              <span className="render__caption">
                <strong>{r.title}</strong>
                <span>{r.note}</span>
                <span className="render__open">
                  Open in 3D <Arrow />
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

/* 04 — Testimonials: a few voices over the sculpture's light sweep */
function Voices() {
  const shown = testimonials.slice(0, 3)
  if (shown.length === 0) return null
  return (
    <section className="section voices" data-scene="voices" aria-labelledby="voices-title">
      <div className="wrap">
        <header className="section-head">
          <Label index="03">Testimonials</Label>
          <h2 id="voices-title" className="h1">
            In their words.
          </h2>
          <TextLink to="/testimonials">All testimonials</TextLink>
        </header>
        <div className="voices__grid">
          {shown.map((t) => (
            <QuoteCard key={t.name} t={t} />
          ))}
        </div>
      </div>
    </section>
  )
}

/* 05 — Enquiry: the sculpture returns, centred and calm */
function FinalEnquiry() {
  const [open, setOpen] = useState(false)
  return (
    <section className="final" data-scene="enquiry" aria-labelledby="final-title">
      <div className="wrap final__inner">
        <Label index="04">Get a quote</Label>
        <h2 id="final-title" className="display display--sm">
          Let’s shape something exceptional.
        </h2>
        <p className="lede">
          Tell us the date, the venue and roughly how many people. We’ll reply with the right system, a quote, and who will
          be on site to run it.
        </p>
        {open ? (
          <div className="final__form">
            <EnquiryForm id="home-enquiry" />
          </div>
        ) : (
          <button className="cta cta--primary" onClick={() => setOpen(true)} aria-expanded={open}>
            <span>Get a quote</span>
            <Arrow />
          </button>
        )}
      </div>
    </section>
  )
}
