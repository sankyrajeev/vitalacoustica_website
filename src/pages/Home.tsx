import { useState } from 'react'
import { EnquiryForm } from '../components/EnquiryForm'
import { ResonanceBackdrop } from '../components/ResonanceBackdrop'
import { StageModelLauncher } from '../components/StageModel'
import { Arrow, Cta, Label, MediaFrame, Placeholder, TextLink } from '../components/ui'
import { capabilities, process } from '../content/capabilities'
import { gearById } from '../content/gear'
import { projects } from '../content/projects'
import { site } from '../content/site'
import { scrollToId } from '../router'
import { CoverageDrawing } from '../components/CoverageDrawing'
import { ProjectCard } from '../components/ProjectCard'

export function Home() {
  return (
    <>
      <ResonanceBackdrop />
      <Entrance />
      <Manifesto />
      <SelectedWork />
      <Capabilities />
      <Technical />
      <StudioIntro />
      <FinalEnquiry />
    </>
  )
}

/* 01 — The entrance */
function Entrance() {
  return (
    <section className="entrance" data-scene="entrance" aria-labelledby="entrance-title">
      <div className="wrap entrance__inner">
        <Label>{site.eyebrow}</Label>
        <h1 id="entrance-title" className="display">
          We shape the way an experience <em>feels.</em>
        </h1>
        <p className="entrance__intro">{site.intro}</p>
        <div className="entrance__actions">
          <button className="cta cta--primary" onClick={() => scrollToId('work')}>
            <span>Explore selected work</span>
            <Arrow />
          </button>
          <Cta to="/contact" variant="quiet">
            Start a project
          </Cta>
        </div>
      </div>
      <p className="entrance__scroll" aria-hidden>
        <span />
        Scroll
      </p>
    </section>
  )
}

/* 02 — The manifesto */
function Manifesto() {
  const photo = projects[0].gallery[1]
  return (
    <section className="manifesto" aria-labelledby="manifesto-title">
      <div className="wrap manifesto__text" data-scene="manifesto">
        <Label index="02">Manifesto</Label>
        <h2 id="manifesto-title" className="h1">
          Production is more than equipment.
        </h2>
        <div className="manifesto__body">
          <p>We bring together sound, light and space to create environments with a distinct point of view.</p>
          <p>
            From the first creative decision to the final cue, every element should have a purpose. We select our systems
            carefully, design around the space and approach every production with technical discipline and creative
            intent.
          </p>
        </div>
      </div>
      <div className="manifesto__media" data-scene="media">
        <MediaFrame media={photo} sizes="100vw" caption={<>Open air at The Park, Bangalore · Sound, light and production</>} />
      </div>
    </section>
  )
}

/* 03 — Selected work */
function SelectedWork() {
  return (
    <section id="work" className="section section--solid work" data-scene="work" aria-labelledby="work-title">
      <div className="wrap">
        <header className="section-head">
          <Label index="03">Selected work</Label>
          <h2 id="work-title" className="h1">
            A selection of what we do.
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

/* 04 — Capabilities: the sculpture changes material beside each module */
function Capabilities() {
  return (
    <section id="capabilities" className="capabilities" aria-labelledby="cap-title">
      <div className="wrap capabilities__intro" data-scene="cap-intro">
        <Label index="04">Capabilities</Label>
        <h2 id="cap-title" className="h1">
          Different disciplines. One considered outcome.
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
              <TextLink to={`/capabilities/${c.id}`}>{c.name} in detail</TextLink>
            </div>
            <div className="cap__aside">
              {c.image ? (
                <MediaFrame
                  media={{ src: c.image.src, width: 1600, height: c.image.src.startsWith('park') ? 1201 : 1066, alt: c.image.alt }}
                  sizes="(max-width: 900px) 100vw, 30vw"
                  className="cap__photo"
                />
              ) : (
                <p className="cap__note">
                  <span className="label">Visual study</span>
                  The form beside this text is a real-time study, not a client production.
                </p>
              )}
            </div>
          </div>
        </article>
      ))}
    </section>
  )
}

/* 05 — Technical credibility */
function Technical() {
  const sound = [gearById.v10p, gearById.b22]
  return (
    <section className="section section--solid technical" data-scene="technical" aria-labelledby="tech-title">
      <div className="wrap">
        <header className="section-head">
          <Label index="05">Technical</Label>
          <h2 id="tech-title" className="h1">
            Precision behind the experience.
          </h2>
          <p className="lede">
            The systems we work with, how we plan coverage, and how a show moves from drawing to downbeat.
          </p>
        </header>

        <div className="tech-grid">
          <div className="tech-systems">
            <p className="label">Sound systems we deploy</p>
            {sound.map((g) => (
              <dl key={g.id} className="spec">
                <dt>{g.name}</dt>
                <dd className="spec__role">{g.role}</dd>
                <dd className="spec__data">{g.spec}</dd>
                <dd className="spec__about">{g.about}</dd>
              </dl>
            ))}
            <p className="fineprint">Specifications as published by d&b audiotechnik.</p>
          </div>

          <figure className="tech-drawing">
            <CoverageDrawing />
            <figcaption>
              <span className="label">Coverage planning</span>
              Plan view of a stereo pair of V10P tops with their nominal 110° horizontal dispersion, aimed to overlap at the
              audience centre line.
            </figcaption>
          </figure>
        </div>

        <ol className="workflow">
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

        <div className="tech-media">
          <StageModelLauncher />
          <Placeholder ratio="4 / 5">Close-up photography of the d&b system, amplifiers and control positions.</Placeholder>
        </div>
      </div>
    </section>
  )
}

/* 06 — The studio */
function StudioIntro() {
  return (
    <section className="section section--solid studio-intro" data-scene="studio" aria-labelledby="studio-title">
      <div className="wrap studio-intro__inner">
        <div>
          <Label index="06">Studio</Label>
          <h2 id="studio-title" className="h1">
            Selective by design.
          </h2>
        </div>
        <div className="studio-intro__copy">
          <p className="lede">We believe good production begins with asking better questions.</p>
          <p>
            What should the audience feel? What does the space demand? Which elements deserve attention, and which should
            remain invisible?
          </p>
          <p>Those answers guide our creative decisions, system choices and execution.</p>
          <ol className="process">
            {process.map((s, i) => (
              <li key={s.title}>
                <span>0{i + 1}</span>
                <div>
                  <strong>{s.title}</strong>
                  <p>{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <TextLink to="/studio">About the studio</TextLink>
        </div>
      </div>
    </section>
  )
}

/* 07 — Final enquiry: quiet until asked for */
function FinalEnquiry() {
  const [open, setOpen] = useState(false)
  return (
    <section className="final" data-scene="enquiry" aria-labelledby="final-title">
      <div className="wrap final__inner">
        <Label index="07">Enquiries</Label>
        <h2 id="final-title" className="display display--sm">
          Let’s shape something exceptional.
        </h2>
        <p className="lede">
          Tell us about the experience you’re planning. We’ll work with you to understand the brief and develop the right
          approach.
        </p>
        {open ? (
          <div className="final__form">
            <EnquiryForm id="home-enquiry" />
          </div>
        ) : (
          <button className="cta cta--primary" onClick={() => setOpen(true)} aria-expanded={open}>
            <span>Start a project</span>
            <Arrow />
          </button>
        )}
      </div>
    </section>
  )
}
