import { useState } from 'react'
import { EnquiryForm } from '../components/EnquiryForm'
import { gearImg } from '../components/gearImg'
import { ProjectCard } from '../components/ProjectCard'
import { ResonanceBackdrop } from '../components/ResonanceBackdrop'
import { Arrow, Cta, Label, Logo, TextLink } from '../components/ui'
import { capabilities } from '../content/capabilities'
import { gearById } from '../content/gear'
import { projects } from '../content/projects'
import { site } from '../content/site'
import { openDrone, openExplore } from '../events'
import { mediaUrl } from '../media'
import { scrollToId } from '../router'

// The homepage: the Resonance Form (a fixed 3D layer) carries the page, changing
// with each section. The full equipment list lives on /equipment.
export function Home() {
  return (
    <>
      <ResonanceBackdrop />
      <Entrance />
      <Statement />
      <Disciplines />
      <Renders />
      <SoundSystem />
      <SelectedWork />
      <FinalEnquiry />
    </>
  )
}

/* 01 — The entrance: the sculpture, the line, and what we do */
function Entrance() {
  return (
    <section className="entrance" data-scene="entrance" aria-labelledby="entrance-title">
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
      <button className="entrance__scroll" onClick={() => scrollToId('statement')} aria-label="Scroll to the next section">
        <span aria-hidden />
        Scroll
      </button>
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
        <Logo tagline className="statement__logo" />
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

/* 03 — What we do: the sculpture changes material beside each discipline */
function Disciplines() {
  return (
    <section id="capabilities" className="capabilities" aria-labelledby="cap-title">
      <div className="wrap capabilities__intro" data-scene="cap-intro">
        <Label index="02">What we do</Label>
        <h2 id="cap-title" className="h1">
          Sound, light and production. Conceived as one.
        </h2>
      </div>
      {capabilities.map((c) => (
        <article key={c.id} className={`cap cap--${c.id}`} data-scene={`cap-${c.id}`} aria-labelledby={`cap-${c.id}-title`}>
          <div className="wrap cap__inner">
            <div className="cap__text">
              <p className="cap__index">
                {c.index} <span>/ 04</span>
              </p>
              <h3 id={`cap-${c.id}-title`} className="cap__name">
                {c.name}
              </h3>
              <p className="cap__statement">{c.statement}</p>
              <ul className="cap__covers">
                {c.covers.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <p className="cap__kit">
                <span className="label">In the rig</span>
                {c.gear.map((id) => gearById[id].name).join(' · ')}
              </p>
              <TextLink to={`/capabilities/${c.id}`}>{c.name} services</TextLink>
            </div>
          </div>
        </article>
      ))}
    </section>
  )
}

const RENDERS = [
  { file: 'render-stage.webp', w: 1600, h: 1000, title: 'The stage', note: 'Goal-post truss, beams, lighting wings and the d&b system', open: () => openExplore(null) },
  { file: 'render-wing.webp', w: 1200, h: 900, title: 'Lighting wing', note: 'Matrix panel, fan light, hex retro and LED bars', open: () => openExplore('matrix') },
  { file: 'render-drone.webp', w: 1200, h: 900, title: 'Drone view', note: 'Fly the venue from the audience to the booth', open: openDrone },
]

/* 04 — Renders of our stage model, each one a way into the live 3D view */
function Renders() {
  return (
    <section className="section renders" data-scene="renders" aria-labelledby="renders-title">
      <div className="wrap">
        <header className="section-head renders__head">
          <Label index="03">The rig in 3D</Label>
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

/* 05 — The sound system, as the one piece of kit worth naming on the homepage */
function SoundSystem() {
  const tops = gearById.v10p
  const subs = gearById.b22
  return (
    <section className="section sound-feature" data-scene="sound-feature" aria-labelledby="sound-title">
      <div className="wrap sound-feature__inner">
        <div className="sound-feature__media">
          {[tops, subs].map((g) => (
            <figure key={g.id} className={`sound-feature__item sound-feature__item--${g.id}`}>
              <img src={gearImg(g.photo.file)} alt={g.photo.alt} width={g.photo.width} height={g.photo.height} loading="lazy" />
              <figcaption>{g.name}</figcaption>
            </figure>
          ))}
        </div>
        <div className="sound-feature__text">
          <Label index="04">The sound</Label>
          <h2 id="sound-title" className="h1">
            d&b audiotechnik, end to end.
          </h2>
          <p className="lede">
            V10P point-source tops over B22 bandpass subwoofers: clean at full club level, with the low end a kick drum needs
            and the control to keep it off the stage.
          </p>
          <div className="sound-feature__actions">
            <Cta to="/equipment">See all equipment</Cta>
            <button className="cta cta--quiet" onClick={() => openExplore('v10p')}>
              <span>View in 3D</span>
              <Arrow />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

/* 06 — Selected work */
function SelectedWork() {
  return (
    <section id="work" className="section section--solid work" data-scene="work" aria-labelledby="work-title">
      <div className="wrap">
        <header className="section-head">
          <Label index="05">Selected work</Label>
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

/* 07 — Enquiry: the sculpture returns, centred and calm */
function FinalEnquiry() {
  const [open, setOpen] = useState(false)
  return (
    <section className="final" data-scene="enquiry" aria-labelledby="final-title">
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
