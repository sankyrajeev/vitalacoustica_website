import { useEffect, useState, type ReactNode } from 'react'
import { RoomPlanner, SignalChain, SoundField, SubArray, TuneScene } from '../components/scenes/SoundScenes'
import { Arrow, Cta, Label, MediaFrame, TextLink } from '../components/ui'
import { capabilities } from '../content/capabilities'
import { openExplore } from '../events'

// The Sound service page: what we mean by engineered sound, told through interactive scenes.

function Feature({
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

const STEPS = [
  ['Understand', 'Event requirements, venue constraints, audience expectations, performance format and technical scope.'],
  ['Design', 'An equipment and deployment plan for coverage, system configuration, connectivity and operation.'],
  ['Deploy', 'Equipment positioned, connected, configured and checked against the agreed system plan.'],
  ['Verify', 'Signal path validated, connections inspected, routing confirmed and the system checked before the show.'],
  ['Optimise', 'Alignment, tonal balance, coverage and operating levels refined for the venue.'],
  ['Operate', 'The show supported with consistency, technical awareness and a calm, smooth-running system.'],
  ['Close out', 'Powered down, disconnected, checked and packed in an organised way.'],
]

function Process() {
  const [step, setStep] = useState(0)
  const [auto, setAuto] = useState(true)
  useEffect(() => {
    if (!auto || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setTimeout(() => setStep((s) => (s + 1) % STEPS.length), 3800)
    return () => window.clearTimeout(id)
  }, [step, auto])
  return (
    <div className="timeline" style={{ ['--step' as string]: step, ['--steps' as string]: STEPS.length }}>
      <ol className="timeline__track" role="tablist" aria-label="From load-in to last track">
        {STEPS.map(([name], i) => (
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
          <span>0{step + 1}</span> {STEPS[step][0]}
        </p>
        <p>{STEPS[step][1]}</p>
      </div>
    </div>
  )
}

const DETAILS = [
  ['Gain structure', 'Appropriate signal levels maintained through the whole audio chain.'],
  ['Frequency response', 'A balanced tonal presentation suited to the environment.'],
  ['Phase and time alignment', 'Managing how sources, and the low-frequency system, add together.'],
  ['Crossover integration', 'A coherent hand-over between loudspeaker components.'],
  ['System headroom', 'Operating margin for the demands of the music, so peaks stay clean.'],
  ['Coverage consistency', 'How the system serves every audience position, not just the centre.'],
  ['Signal routing', 'A path from input to output that’s clear, structured and manageable.'],
  ['Network configuration', 'Dependable communication between networked devices.'],
  ['Operational verification', 'Critical connections, settings and functions checked before doors.'],
]

function Details() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <ul className="details">
      {DETAILS.map(([t, b], i) => (
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

const EVENTS = [
  {
    name: 'Private celebration',
    needs: [
      'Elegant integration with the venue',
      'Controlled, even coverage',
      'Speech that carries for toasts and announcements',
    ],
    line: 'Sound that fills the room without taking it over.',
  },
  {
    name: 'DJ-led night',
    needs: ['Substantial, controlled low end', 'A performance-ready booth', 'Headroom for the peak of the night'],
    line: 'A dance floor that keeps its weight and its detail at full intensity.',
  },
  {
    name: 'Corporate production',
    needs: [
      'Speech intelligibility first',
      'Predictable coverage across the audience',
      'Seamless microphones and presentation playback',
    ],
    line: 'Every word heard, at every seat, every time.',
  },
]

function Events() {
  const [i, setI] = useState(1)
  const e = EVENTS[i]
  return (
    <div className="events">
      <div className="scene-tabs" role="tablist" aria-label="Event type">
        {EVENTS.map((x, k) => (
          <button key={x.name} role="tab" aria-selected={k === i} className={k === i ? 'is-on' : ''} onClick={() => setI(k)}>
            {x.name}
          </button>
        ))}
      </div>
      <div className="events__panel" role="tabpanel" key={e.name}>
        <p className="events__line">{e.line}</p>
        <ul>
          {e.needs.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function SoundPage() {
  const next = capabilities[1]
  return (
    <article className="sound">
      <header className="sound-hero">
        <div className="wrap sound-hero__inner">
          <div className="sound-hero__text">
            <Label>Sound</Label>
            <h1 className="display display--sm sound-hero__title">
              Sound isn’t rented. <em>It’s engineered.</em>
            </h1>
            <p className="sound-hero__sub">Professional audio. Precision system design. Uncompromising execution.</p>
          </div>
          <div className="sound-hero__scene">
            <SoundField />
          </div>
        </div>
      </header>

      <section className="sound-intro">
        <div className="wrap sound-intro__inner">
          <p className="lede">
            Anyone can put speakers in a room. Making an entire room sound exceptional is a different discipline.
          </p>
          <div className="sound-intro__body">
            <p>
              We approach every production as an acoustic environment with its own geometry, energy, audience and sonic needs.
              From intimate gatherings to high-energy clubs and large productions, we design, deploy and optimise the system
              around the space, not simply the equipment available.
            </p>
            <p>
              Premium professional equipment, intelligent system design, networked infrastructure and precision tuning, so the
              sound feels intentional from the first track to the last.
            </p>
          </div>
          <p className="sound-mantra">
            We don’t believe in turning everything up. <em>We believe in getting everything right.</em>
          </p>
        </div>
      </section>

      <div className="wrap sound-photo">
        <MediaFrame
          media={{
            src: 'park-dusk',
            width: 1600,
            height: 1201,
            alt: 'Open-air stage with d&b tops on stands and subwoofers at the front',
          }}
          sizes="100vw"
        />
      </div>

      <Feature
        n="01"
        kicker="Read the room"
        title="Every space has a sound."
        line="We make sure it’s the right one."
        scene={<RoomPlanner />}
      >
        <p>
          A warehouse, a ballroom, an open-air site and a purpose-built club are fundamentally different acoustic environments,
          each with its own reflections, reverberation, standing waves and low-frequency behaviour.
        </p>
        <p>
          Our design starts long before the first speaker is powered on: the layout, the audience footprint, the performance area,
          listening positions and how the night runs all shape the system. The aim is consistent coverage, controlled energy and
          intelligible sound, everywhere.
        </p>
        <p className="feature__kicker">The front row matters. So does the back.</p>
      </Feature>

      <Feature
        n="02"
        kicker="Tune on site"
        title="Not by guesswork."
        line="The room you designed for isn’t always the room you arrive at."
        scene={<TuneScene />}
        flip
      >
        <p>
          A plan sets the starting point; the venue decides the result. Once the system is up, we measure how it behaves in the
          actual room and refine alignment, tonal balance and coverage, managing problem frequencies and locking loudspeakers and
          subwoofers into one coherent system.
        </p>
        <p className="feature__kicker">
          Tuned for the room, the audience and the night. Not a preset copied from the last event.
        </p>
      </Feature>

      <Feature
        n="03"
        kicker="Source to output"
        title="Every connection has a purpose."
        line="The right equipment is only the beginning."
        scene={<SignalChain />}
      >
        <p>
          We work with professional systems from d&amp;b audiotechnik, RCF, Yamaha and Pioneer DJ. But the result depends on how
          every part is chosen, positioned, configured, aligned and run together, so we look after the whole chain: source,
          processing, amplification and acoustic output.
        </p>
        <div className="feature__cols">
          <div>
            <h3 className="feature__h">Software is part of the sound</h3>
            <p>
              R1 for d&amp;b systems, Yamaha StageMix and manufacturer tools to configure, monitor and control the system. The
              stack follows the equipment and the production.
            </p>
          </div>
          <div>
            <h3 className="feature__h">Networked audio, structured control</h3>
            <p>
              Dante, AES67 and manufacturer protocols where the equipment supports them, with planned topology, addressing and
              bandwidth.
            </p>
          </div>
        </div>
        <p className="feature__kicker">No mystery routing. No unnecessary complexity.</p>
      </Feature>

      <Feature
        n="04"
        kicker="Low frequencies"
        title="Under control."
        line="Feel the energy. Keep the definition."
        scene={<SubArray />}
        flip
      >
        <p>
          Bass is the most powerful part of the experience and the easiest to get wrong. Left unmanaged it overwhelms the room,
          blurs the detail and sounds different wherever you stand.
        </p>
        <p>
          We plan subwoofer placement, crossover integration, phase and level, and arrange arrays to put the energy on the floor
          and keep it off the stage.
        </p>
        <p className="feature__kicker">Weight without losing definition. Impact without the boom.</p>
      </Feature>

      <section className="section sound-floor" aria-labelledby="floor-title">
        <div className="wrap">
          <header className="section-head">
            <Label index="05">Built for the dance floor</Label>
            <h2 id="floor-title" className="h1">
              Energy is easy. Control is the craft.
            </h2>
          </header>
          <div className="sound-floor__grid">
            <div>
              <p>
                Electronic music asks a system for fast transients, sustained energy, detailed highs and powerful low end, without
                losing composure. That takes headroom and control, and a chain from mixer to loudspeaker that holds its clarity
                when the music gets demanding.
              </p>
              <p>
                From deep house and Afro house to high-energy electronic sets, the goal isn’t volume for its own sake. It’s
                immersive, balanced, physical sound that keeps people connected to the music.
              </p>
            </div>
            <div className="sound-floor__booth">
              <h3 className="feature__h">The booth is where everything comes together</h3>
              <p>
                Pioneer DJ players and mixer, clean integration with the main system, and the cabling, power and ergonomics sorted
                before the first DJ arrives.
              </p>
              <p className="feature__kicker">
                The person behind the decks should be thinking about the next track, not troubleshooting the booth.
              </p>
              <div className="sound-floor__actions">
                <button className="cta cta--primary" onClick={() => openExplore('cdj')}>
                  <span>See the booth in 3D</span>
                  <Arrow />
                </button>
                <Cta to="/equipment" variant="quiet">
                  Our equipment
                </Cta>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--solid" aria-labelledby="process-title">
        <div className="wrap">
          <header className="section-head">
            <Label index="06">From load-in to last track</Label>
            <h2 id="process-title" className="h1">
              Professional execution is a process.
            </h2>
          </header>
          <Process />
          <p className="sound-note">The audience experiences the music. We take care of the system behind it.</p>
        </div>
      </section>

      <section className="section" aria-labelledby="details-title">
        <div className="wrap">
          <header className="section-head">
            <Label index="07">The details others overlook</Label>
            <h2 id="details-title" className="h1">
              The difference lives between the specifications.
            </h2>
            <p className="section-head__sub">
              A spec sheet tells you what a system can do. It can’t tell you how it will perform in your room. That comes down to
              these.
            </p>
          </header>
          <Details />
        </div>
      </section>

      <section className="section section--solid" aria-labelledby="events-title">
        <div className="wrap sound-events">
          <header className="section-head">
            <Label index="08">Designed around the event</Label>
            <h2 id="events-title" className="h1">
              The right system isn’t the largest. It’s the one that meets the brief.
            </h2>
          </header>
          <Events />
        </div>
      </section>

      <section className="sound-close" aria-labelledby="close-title">
        <div className="wrap sound-close__inner">
          <Label>Our philosophy</Label>
          <h2 id="close-title" className="display display--sm">
            We don’t just provide the equipment. <em>We engineer the experience.</em>
          </h2>
          <p>
            Professional sound should be experienced, not explained. Nobody on the floor needs to know about processing, network
            protocols or acoustics to feel the result. Reliability isn’t a single feature: it’s many small decisions made
            correctly, long before the audience arrives.
          </p>
          <p className="sound-close__tag">Precision in every frequency. Purpose in every deployment.</p>
          <div className="sound-close__actions">
            <Cta to="/contact">Plan your sound</Cta>
            <Cta to="/equipment" variant="quiet">
              See the equipment
            </Cta>
          </div>
        </div>
      </section>

      <nav className="wrap case__next" aria-label="Next service">
        <span className="label">Next</span>
        <TextLink to={`/capabilities/${next.id}`}>{next.name}</TextLink>
      </nav>
    </article>
  )
}
