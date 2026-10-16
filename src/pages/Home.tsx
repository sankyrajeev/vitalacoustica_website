import { useEffect, useState } from 'react'
import { EnquiryForm } from '../components/EnquiryForm'
import { TestimonialSlider } from '../components/TestimonialSlider'
import { ResonanceBackdrop } from '../components/ResonanceBackdrop'
import { Arrow, Cta, Label, Logo, TextLink } from '../components/ui'
import { published, site } from '../content/site'
import { testimonials } from '../content/testimonials'
import { useSectionSnap } from '../hooks/useSectionSnap'
import { scrollToId } from '../router'

const SNAP_SECTIONS = '.intro, .entrance, .statement, .voices, .final'

// The homepage: the brand, what clients say, and the enquiry. The Resonance Form
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
    ['Audio & Lighting Integration', 'Consulting'],
  ]
  return (
    <section id="statement" className="statement" data-scene="manifesto" aria-labelledby="statement-title">
      <div className="wrap statement__inner">
        <Label index="01">Vital Acoustica</Label>
        <h2 id="statement-title" className="h1">
          Production is more than equipment.
        </h2>
        <p className="statement__body">
          We hire out professional sound and lighting, and we bring the people who know how to make it feel right: system design,
          rigging, tuning and an operator at the desk until the last track.
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

/* 02 — Testimonials: a few voices over the sculpture's light sweep */
function Voices() {
  if (!published.testimonials || testimonials.length === 0) return null
  return (
    <section className="section voices" data-scene="voices" aria-labelledby="voices-title">
      <div className="wrap">
        <header className="section-head">
          <Label index="02">Testimonials</Label>
          <h2 id="voices-title" className="h1">
            In their words.
          </h2>
          <TextLink to="/testimonials">All testimonials</TextLink>
        </header>
        <TestimonialSlider items={testimonials} />
      </div>
    </section>
  )
}

/* 03 — Enquiry: the sculpture returns, centred and calm */
function FinalEnquiry() {
  const [open, setOpen] = useState(false)
  return (
    <section className="final" data-scene="enquiry" aria-labelledby="final-title">
      <div className="wrap final__inner">
        <Label index="03">Get a quote</Label>
        <h2 id="final-title" className="display display--sm">
          Let’s shape something exceptional.
        </h2>
        <p className="lede">
          Tell us the date, the venue and roughly how many people. We’ll reply with the right system, a quote, and who will be on
          site to run it.
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
