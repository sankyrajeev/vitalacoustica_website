import { useState } from 'react'
import { CoverageDrawing } from '../components/CoverageDrawing'
import { EnquiryForm } from '../components/EnquiryForm'
import { GearCard } from '../components/Equipment'
import { gearImg } from '../components/gearImg'
import { Link } from '../components/Link'
import { ProjectCard } from '../components/ProjectCard'
import { ResonanceBackdrop } from '../components/ResonanceBackdrop'
import { StageModelLauncher } from '../components/StageModel'
import { Arrow, Cta, Label, TextLink } from '../components/ui'
import { gear, gearById, type GearId } from '../content/gear'
import { projects } from '../content/projects'
import { site } from '../content/site'
import { img } from '../media'

export function Home() {
  return (
    <>
      <Hero />
      <EquipmentSection />
      <Services />
      <HowHiringWorks />
      <SelectedWork />
      <Technical />
      <FinalEnquiry />
    </>
  )
}

const STRIP: GearId[] = ['v10p', 'b22', 'sharpy', 'matrix', 'pixelbar', 'rope']

/* 01 — What we are, said plainly, over one of our own stages */
function Hero() {
  return (
    <section className="hire-hero" aria-labelledby="hero-title">
      <div className="hire-hero__photo" aria-hidden>
        <img
          src={img('park-dusk', 1600)}
          srcSet={`${img('park-dusk', 800)} 800w, ${img('park-dusk', 1600)} 1600w`}
          sizes="100vw"
          alt=""
          width={1600}
          height={1201}
          fetchPriority="high"
        />
      </div>
      <div className="wrap hire-hero__inner">
        <Label>{site.eyebrow}</Label>
        <h1 id="hero-title" className="display">
          We shape the way an experience <em>feels.</em>
        </h1>
        <p className="hire-hero__lede">{site.rental}</p>
        <ul className="facts" aria-label="At a glance">
          <li>d&b audiotechnik sound</li>
          <li>Beam & LED lighting</li>
          <li>Delivery, setup & crew</li>
          <li>Installation consulting</li>
        </ul>
        <div className="hire-hero__actions">
          <Cta to="/equipment">View equipment</Cta>
          <Cta to="/contact" variant="quiet">
            Get a quote
          </Cta>
        </div>
      </div>

      <nav className="wrap hire-hero__strip" aria-label="Equipment for hire">
        {STRIP.map((id) => {
          const g = gearById[id]
          return (
            <Link key={id} to={`/equipment/${id}`} className="strip-item">
              <span className={`strip-item__img strip-item__img--${g.photo.fit ?? g.photo.source}`}>
                <img src={gearImg(g.photo.file)} alt="" width={g.photo.width} height={g.photo.height} loading="lazy" />
              </span>
              <span className="strip-item__name">{g.name}</span>
            </Link>
          )
        })}
        <Link to="/equipment" className="strip-item strip-item--all">
          <span className="strip-item__name">
            All {gear.length} items <Arrow />
          </span>
        </Link>
      </nav>
    </section>
  )
}

/* 02 — The equipment: picture, name and what it does, then the 3D rig */
function EquipmentSection() {
  const featured = gear.filter((g) => g.id !== 'truss' && g.id !== 'hex')
  return (
    <section id="equipment" className="section section--solid" aria-labelledby="equipment-title">
      <div className="wrap">
        <header className="section-head">
          <Label index="01">Equipment for hire</Label>
          <h2 id="equipment-title" className="h1">
            The rig we hire out.
          </h2>
          <p className="lede">
            Professional sound and lighting, maintained by us and supplied with the cabling, rigging and crew to run it. Pick
            any piece for its specs, then see where it sits on stage.
          </p>
        </header>
        <div className="gear-grid">
          {featured.map((g) => (
            <GearCard key={g.id} g={g} />
          ))}
        </div>
        <div className="rig-block">
          <div className="rig-block__text">
            <Label>The full rig in 3D</Label>
            <h3 className="h2">See every piece in place.</h3>
            <p className="muted">
              Our typical stage, modelled to the published dimensions of the equipment. Orbit around it, open any fixture, run
              the lights from the desk, or fly through the venue like a drone.
            </p>
            <TextLink to="/equipment">All equipment</TextLink>
          </div>
          <StageModelLauncher caption="Tap a marker in the model for the item’s photo and specs." />
        </div>
      </div>
    </section>
  )
}

const SERVICES = [
  {
    to: '/capabilities/sound',
    photo: 'park-blue',
    h: 1201,
    pos: '4% 70%', // the d&b top and subs left of the booth
    name: 'Sound system rental',
    body: 'd&b audiotechnik V10P tops and B22 subwoofers, designed for the room, tuned on site and run by our engineer.',
  },
  {
    to: '/capabilities/light',
    photo: 'club-full',
    h: 1066,
    pos: '50% 40%',
    name: 'Lighting rental',
    body: 'Beam moving heads, retro fixtures, LED matrix panels, pixel bars and neon flex, programmed to the music.',
  },
  {
    to: '/capabilities/production',
    photo: 'park-dusk',
    h: 1201,
    pos: '50% 50%',
    name: 'Full production',
    body: 'Sound, light, truss and power planned together, with the crew to build, operate and load out.',
  },
  {
    to: '/capabilities/visuals',
    photo: 'club-down',
    h: 1066,
    pos: '2% 45%', // truss tower and retro light
    name: 'Installations & visuals',
    body: 'Consulting for permanent sound and light installations, and projection mapping as a growing part of our work.',
  },
]

/* 03 — Services */
function Services() {
  return (
    <section className="section section--solid services" aria-labelledby="services-title">
      <div className="wrap">
        <header className="section-head">
          <Label index="02">Services</Label>
          <h2 id="services-title" className="h1">
            Hire the kit, or the whole show.
          </h2>
        </header>
        <div className="service-grid">
          {SERVICES.map((s) => (
            <Link key={s.to} to={s.to} className="service">
              <span className="service__media">
                <img
                  src={img(s.photo, 800)}
                  alt=""
                  width={800}
                  height={Math.round((s.h / 1600) * 800)}
                  loading="lazy"
                  decoding="async"
                  style={{ objectPosition: s.pos }}
                />
              </span>
              <span className="service__name h3">{s.name}</span>
              <span className="service__body">{s.body}</span>
              <span className="service__more">
                More <Arrow />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

/* 04 — How hiring works */
function HowHiringWorks() {
  const steps = [
    ['Enquire', 'Tell us the date, venue, audience size and what you need. Equipment only, or with crew.'],
    ['Proposal & quote', 'We recommend a system for the space and send a clear, itemised quote.'],
    ['Delivery, setup & tuning', 'We deliver, rig and cable everything, then tune the sound and focus the lights before doors.'],
    ['Show & collection', 'Our engineer and lighting operator run the show if you want them, and we load out afterwards.'],
  ]
  return (
    <section className="section section--solid hiring" aria-labelledby="hiring-title">
      <div className="wrap">
        <header className="section-head">
          <Label index="03">How hiring works</Label>
          <h2 id="hiring-title" className="h1">
            From enquiry to load-out.
          </h2>
        </header>
        <ol className="steps">
          {steps.map(([t, b], i) => (
            <li key={t}>
              <span className="steps__n">0{i + 1}</span>
              <strong>{t}</strong>
              <p>{b}</p>
            </li>
          ))}
        </ol>
        <div className="hiring__cta">
          <Cta to="/contact">Get a quote</Cta>
        </div>
      </div>
    </section>
  )
}

/* 05 — Selected work */
function SelectedWork() {
  return (
    <section id="work" className="section section--solid work" aria-labelledby="work-title">
      <div className="wrap">
        <header className="section-head">
          <Label index="04">Selected work</Label>
          <h2 id="work-title" className="h1">
            Shows we’ve put on.
          </h2>
          <TextLink to="/work">All work</TextLink>
        </header>
        <div className="work-grid">
          {projects.map((p, i) => (
            <ProjectCard key={p.slug} project={p} variant={i === 0 ? 'lead' : i === 1 ? 'offset' : 'small'} />
          ))}
        </div>
      </div>
    </section>
  )
}

/* 06 — Technical credibility */
function Technical() {
  return (
    <section className="section section--solid technical" aria-labelledby="tech-title">
      <div className="wrap">
        <header className="section-head">
          <Label index="05">Technical</Label>
          <h2 id="tech-title" className="h1">
            Precision behind the experience.
          </h2>
          <p className="lede">How we plan coverage, and how a show moves from drawing to downbeat.</p>
        </header>

        <div className="tech-grid">
          <figure className="tech-drawing">
            <CoverageDrawing />
            <figcaption>
              <span className="label">Coverage planning</span>
              Plan view of a stereo pair of V10P tops with their nominal 110° horizontal dispersion, aimed to overlap at the
              audience centre line.
            </figcaption>
          </figure>

          <ol className="workflow workflow--stacked">
            {[
              ['Survey', 'Room dimensions, surfaces, power, rigging points and access.'],
              ['Design', 'System choice, placement and coverage, drawn before anything is loaded.'],
              ['Deploy', 'Rigging, cabling and system build with safeties and tidy runs.'],
              ['Tune', 'Time alignment and tuning in the room, then checked with the audience in.'],
              ['Operate', 'Engineers and operators for sound and light throughout the show.'],
            ].map(([t, b], i) => (
              <li key={t}>
                <span className="workflow__n">0{i + 1}</span>
                <strong>{t}</strong>
                <p>{b}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

/* 07 — Enquiry, with the Resonance Form behind it */
function FinalEnquiry() {
  const [open, setOpen] = useState(false)
  return (
    <section className="final" data-scene="enquiry" aria-labelledby="final-title">
      <ResonanceBackdrop />
      <div className="wrap final__inner">
        <Label index="06">Get a quote</Label>
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
