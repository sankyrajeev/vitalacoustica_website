import { useState, type ReactNode } from 'react'
import { EnquiryForm } from '../components/EnquiryForm'
import { ArticleCard } from '../components/journal/Cards'
import { featuredFirst, loadJournal, useLoad } from '../journal/data'
import { TestimonialSlider } from '../components/TestimonialSlider'
import { Link } from '../components/Link'
import { VantaHero } from '../components/shop/VantaHero'
import { Arrow, Cta, Label, TextLink } from '../components/ui'
import { img, imgSet, mediaUrl } from '../media'
import { published, site } from '../content/site'
import { testimonials } from '../content/testimonials'
import { useSectionSnap } from '../hooks/useSectionSnap'

const SNAP_SECTIONS = '.opening, .statement, .vanta-hero--band, .both, .voices, .home-journal, .final'

// The homepage: the two sides of the company (Live and Software) on the first screen, then each in
// turn, why we do both, what clients say, three stories from the Blog, and the enquiry.
export function Home() {
  // each section settles centred on screen instead of stopping wherever the scroll ends
  useSectionSnap(SNAP_SECTIONS)
  return (
    <>
      <Opening />
      <Statement />
      <VantaHero variant="band" />
      <Both />
      <Voices />
      <JournalPicks />
      <FinalEnquiry />
    </>
  )
}

/** One of the two ways in: a photo (or VANTA's loop) with what's behind the door. */
function Door({ to, label, title, line, children }: { to: string; label: string; title: string; line: string; children: ReactNode }) {
  return (
    <Link to={to} className="door">
      <span className="door__media" aria-hidden>
        {children}
      </span>
      <span className="door__cap">
        <span>
          <span className="door__label">{label}</span>
          <span className="door__title">{title}</span>
          <span className="door__line">{line}</span>
        </span>
        <span className="door__go" aria-hidden>
          <Arrow />
        </span>
      </span>
    </Link>
  )
}

/* 00 — The opening: what we are, and the two sides of it */
function Opening() {
  const [still] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  return (
    <section className="opening" aria-labelledby="opening-title">
      <div className="wrap opening__head">
        <div>
          <Label>{site.eyebrow}</Label>
          <h1 id="opening-title" className="display opening__title">
            We run the show.
            <br />
            We build the <em>tools</em>
          </h1>
        </div>
        <p className="opening__lede">
          Vital Acoustica designs and runs sound and lighting for live events across South India, and makes software for
          musicians and lighting designers.
        </p>
      </div>
      <div className="wrap opening__doors">
        <Door to="/capabilities" label="Live" title="Sound, light and production" line="d&b systems, beam and LED lighting, with the crew to run your night">
          <img src={img('club-full', 1600)} srcSet={imgSet('club-full')} sizes="(max-width: 760px) 100vw, 50vw" alt="" />
        </Door>
        <Door to="/shop" label="Software" title="Instruments and tools" line="VANTA, Pixel Forge, Lumière and ORBIT, for music and for light">
          {still ? (
            <img src={mediaUrl('vanta/vanta-banner-clean-poster-1920.webp')} alt="" />
          ) : (
            <video autoPlay muted loop playsInline preload="metadata" poster={mediaUrl('vanta/vanta-banner-clean-poster-1920.webp')}>
              <source src={mediaUrl('vanta/vanta-banner-clean-1080.mp4')} type="video/mp4" media="(max-width: 900px)" />
              <source src={mediaUrl('vanta/vanta-banner-clean-4k.webm')} type="video/webm" />
              <source src={mediaUrl('vanta/vanta-banner-clean-4k.mp4')} type="video/mp4" />
            </video>
          )}
        </Door>
      </div>
    </section>
  )
}

/* 03 — Why we do both */
function Both() {
  return (
    <section className="section both" aria-labelledby="both-title">
      <div className="wrap both__inner">
        <Label index="02">Why both</Label>
        <h2 id="both-title" className="h1">
          Built behind the desk
        </h2>
        <p className="statement__body">
          The people who rig and run your night are the people who write the software. Our tools start from problems we meet on
          real shows, and our shows are where we try them first.
        </p>
        <div className="both__actions">
          <Cta to="/shop">Our software</Cta>
          <Cta to="/story" variant="quiet">
            Our story
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
    <section id="statement" className="statement" aria-labelledby="statement-title">
      <div className="wrap statement__inner">
        <Label index="01">Live</Label>
        <h2 id="statement-title" className="h1">
          Production is more than equipment
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
        <div className="statement__actions">
          <Cta to="/equipment">Explore equipment</Cta>
          <Cta to="/contact" variant="quiet">
            Get a quote
          </Cta>
        </div>
      </div>
    </section>
  )
}

/* 02 — Testimonials: a few voices over the sculpture's light sweep */
function Voices() {
  if (!published.testimonials || testimonials.length === 0) return null
  return (
    <section className="section voices" aria-labelledby="voices-title">
      <div className="wrap">
        <header className="section-head">
          <Label index="03">Testimonials</Label>
          <h2 id="voices-title" className="h1">
            In their words
          </h2>
          <TextLink to="/testimonials">All testimonials</TextLink>
        </header>
        <TestimonialSlider items={testimonials} />
      </div>
    </section>
  )
}

/* 03 — The Blog: three stories, kept small so the enquiry stays the focus */
function JournalPicks() {
  const list = useLoad(loadJournal, 'journal')
  if (list.state !== 'ready') return null
  const picks = featuredFirst(list.data.articles).slice(0, 3)
  if (picks.length === 0) return null
  return (
    <section className="section home-journal" aria-labelledby="home-journal-title">
      <div className="wrap">
        <header className="section-head home-journal__head">
          <Label index="04">Blog</Label>
          <h2 id="home-journal-title" className="h1">
            Sound, light and visuals, today
          </h2>
          <p className="section-head__sub">The latest from around the world, every day, with guides and notes from our own shows.</p>
        </header>
        <div className="j-grid j-grid--home">
          {picks.map((a) => (
            <ArticleCard key={a.slug} a={a} compact />
          ))}
        </div>
        <p className="home-journal__all">
          <TextLink to="/blog">Read the blog</TextLink>
        </p>
      </div>
    </section>
  )
}

/* 04 — Enquiry: the sculpture returns, centred and calm */
function FinalEnquiry() {
  const [open, setOpen] = useState(false)
  const list = useLoad(loadJournal, 'journal')
  const journalShown = list.state === 'ready' && list.data.articles.length > 0
  return (
    <section className="final" aria-labelledby="final-title">
      <div className="wrap final__inner">
        <Label index={journalShown ? '05' : '04'}>Get a quote</Label>
        <h2 id="final-title" className="display display--sm">
          Let’s shape something exceptional
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
