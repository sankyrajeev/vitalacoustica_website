import { useState } from 'react'
import { EnquiryForm } from '../components/EnquiryForm'
import { ArticleCard } from '../components/journal/Cards'
import { featuredFirst, loadJournal, useLoad } from '../journal/data'
import { TestimonialSlider } from '../components/TestimonialSlider'
import { ComingSoon } from '../components/shop/ComingSoon'
import { SoftwareFeature } from '../components/shop/SoftwareFeature'
import { Arrow, Cta, Label, TextLink } from '../components/ui'
import { products, statusOf, type Software } from '../content/shop'
import { img, imgSet, mediaUrl } from '../media'
import { published, site } from '../content/site'
import { testimonials } from '../content/testimonials'
import { useSectionSnap } from '../hooks/useSectionSnap'

const SNAP_SECTIONS = '.home-hero, .home-software, .home-live, .both, .voices, .home-journal, .final'

// The homepage, software first: the opening over VANTA's editor, our software, the live side over a
// night we ran, why we do both, what clients say, three stories from the Blog, and the enquiry.
export function Home() {
  // each section settles centred on screen instead of stopping wherever the scroll ends
  useSectionSnap(SNAP_SECTIONS)
  return (
    <>
      <Opening />
      <SoftwareRange />
      <Live />
      <Both />
      <Voices />
      <JournalPicks />
      <FinalEnquiry />
    </>
  )
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* 00 — The opening: the line, over VANTA's editor playing (the "clean" loop, made with room for it) */
function Opening() {
  const [still] = useState(reducedMotion)
  const poster = mediaUrl('vanta/vanta-banner-clean-poster-1920.webp')
  return (
    <section className="home-hero" aria-labelledby="opening-title">
      <div className="home-hero__media" aria-hidden>
        {still ? (
          <img src={poster} alt="" />
        ) : (
          <video autoPlay muted loop playsInline preload="metadata" poster={poster}>
            <source src={mediaUrl('vanta/vanta-banner-clean-1080.mp4')} type="video/mp4" media="(max-width: 900px)" />
            <source src={mediaUrl('vanta/vanta-banner-clean-4k.webm')} type="video/webm" />
            <source src={mediaUrl('vanta/vanta-banner-clean-4k.mp4')} type="video/mp4" />
          </video>
        )}
      </div>
      <div className="home-hero__text">
        <Label>{site.eyebrow}</Label>
        <h1 id="opening-title" className="display home-hero__title">
          We build the <em>tools</em>.
          <br />
          We run the show
        </h1>
        <p className="home-hero__lede">
          Vital Acoustica makes software for artists and audio engineers, and designs and runs sound and lighting for shows across
          South India.
        </p>
        <div className="home-hero__actions">
          <Cta to="/software">Our software</Cta>
          <Cta to="/capabilities" variant="quiet">
            Shows
          </Cta>
        </div>
      </div>
    </section>
  )
}

/* 01 — Software: what's out, each with its real interface; what's coming, in a quiet list below */
function SoftwareRange() {
  const range = products.filter((p): p is Software => p.kind === 'software' && !p.sample)
  const out = range.filter((p) => statusOf(p) !== 'soon')
  const soon = range.filter((p) => statusOf(p) === 'soon')
  return (
    <section className="section home-software" aria-labelledby="software-title">
      <div className="wrap">
        <header className="section-head home-software__head">
          <Label index="01">Software</Label>
          <h2 id="software-title" className="h1">
            Instruments and tools for sound and light
          </h2>
        </header>
        {out.map((p) => (
          <SoftwareFeature key={p.id} p={p} />
        ))}
        <ComingSoon items={soon} />
      </div>
    </section>
  )
}

/* 02 — Live: what we do on the night, over a night we ran */
function Live() {
  const facts = [
    ['d&b audiotechnik', 'Sound systems'],
    ['Beam · Retro · LED', 'Lighting'],
    ['Crew on every show', 'Setup & operation'],
    ['Audio & Lighting Integration', 'Consulting'],
  ]
  return (
    <section className="home-live" aria-labelledby="live-title">
      <div className="home-live__media" aria-hidden>
        <img src={img('club-full', 1600)} srcSet={imgSet('club-full')} sizes="100vw" alt="" loading="lazy" />
      </div>
      <div className="wrap home-live__inner">
        <Label index="02">Live</Label>
        <h2 id="live-title" className="h1">
          Production is more than equipment
        </h2>
        <p className="home-live__body">
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

/* 03 — Why we do both */
function Both() {
  return (
    <section className="section both" aria-labelledby="both-title">
      <div className="wrap both__inner">
        <Label index="03">Why both</Label>
        <h2 id="both-title" className="h1">
          Built behind the desk
        </h2>
        <p className="statement__body">
          The people who rig and run your night are the people who write the software. Our tools start from problems we meet on
          real shows, and our shows are where we try them first.
        </p>
        <div className="both__actions">
          <Cta to="/software">Our software</Cta>
          <Cta to="/story" variant="quiet">
            Our story
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
          <Label index="04">Testimonials</Label>
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
          <Label index="05">Blog</Label>
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
        <Label index={journalShown ? '06' : '05'}>Get a quote</Label>
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
