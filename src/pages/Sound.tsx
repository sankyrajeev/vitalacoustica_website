import { useState } from 'react'
import { EventScene, RoomPlanner, type EventId } from '../components/scenes/RoomScenes'
import { SignalChain, SoundField, SubArray, TuneScene } from '../components/scenes/SoundScenes'
import { Details, Feature, Process } from '../components/service/Blocks'
import { Arrow, Cta, Label, TextLink } from '../components/ui'
import { capabilities } from '../content/capabilities'
import { openExplore } from '../events'

// The Sound service page: what we mean by engineered sound, told through interactive scenes.

const STEPS = [
  ['Understand', 'Event requirements, venue constraints, audience expectations, performance format and technical scope.'],
  ['Design', 'An equipment and deployment plan for coverage, system configuration, connectivity and operation.'],
  ['Deploy', 'Equipment positioned, connected, configured and checked against the agreed system plan.'],
  ['Verify', 'Signal path validated, connections inspected, routing confirmed and the system checked before the show.'],
  ['Optimise', 'Alignment, tonal balance, coverage and operating levels refined for the venue.'],
  ['Operate', 'The show supported with consistency, technical awareness and a calm, smooth-running system.'],
  ['Close out', 'Powered down, disconnected, checked and packed in an organised way.'],
]

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

const EVENTS: { id: EventId; name: string; examples: string; line: string; body: string; needs: string[]; system: string[] }[] = [
  {
    id: 'private',
    name: 'Private celebration',
    examples: 'Weddings · sangeets · anniversaries · private parties',
    line: 'Sound that fills the room without taking it over.',
    body: 'A private event needs a system that looks as considered as the décor. Compact loudspeakers placed for even coverage at every table, comfortable levels through dinner so people can talk, then a system that opens up when the dance floor fills.',
    needs: [
      'Elegant integration with the venue and décor',
      'Even coverage at every table',
      'Clear speech for toasts and announcements',
      'A dance floor that can go up a gear later',
    ],
    system: ['d&b V10P tops on stands', 'B22 subwoofers', 'Yamaha DM3 mixer', 'BSS AR-133 DI boxes for playback'],
  },
  {
    id: 'dj',
    name: 'DJ-led night',
    examples: 'Club nights · open-airs · festival stages · brand parties',
    line: 'A dance floor that keeps its weight and its detail at full intensity.',
    body: 'We design for headroom and low-frequency control first: subwoofers arranged to keep the booth clean, tops aimed at the crowd rather than the walls, and a booth set up for the way DJs actually play.',
    needs: [
      'Substantial, controlled low end',
      'A performance-ready booth with monitoring',
      'Headroom for the peak of the night',
      'Even energy from the front to the back',
    ],
    system: [
      'd&b V10P tops',
      'B22 subwoofers, cardioid when needed',
      'D40 amplification',
      'Pioneer DJ CDJ-3000X and DJM-V10-LF',
      'RCF booth monitors',
    ],
  },
  {
    id: 'corporate',
    name: 'Corporate production',
    examples: 'Conferences · launches · award nights · brand events',
    line: 'Every word heard, at every seat, every time.',
    body: 'Speech intelligibility leads. Loudspeakers placed so voices sound natural and seem to come from the stage, microphones and presentation playback integrated cleanly, and a mix that never fights the presenter.',
    needs: [
      'Speech intelligibility first',
      'Predictable coverage across the audience',
      'Clean microphone and playback integration',
      'Quiet, discreet operation',
    ],
    system: ['d&b V10P tops', 'Yamaha DM3 digital mixer', 'BSS AR-133 DI boxes for laptops'],
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
      <div className="events__panel" role="tabpanel">
        <div className="events__scene">
          <EventScene id={e.id} />
        </div>
        <div className="events__text" key={e.id}>
          <p className="events__examples">{e.examples}</p>
          <p className="events__line">{e.line}</p>
          <p className="events__body">{e.body}</p>
          <div className="events__cols">
            <div>
              <h3 className="feature__h">What matters</h3>
              <ul className="events__needs">
                {e.needs.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="feature__h">A typical system</h3>
              <ul className="events__system">
                {e.system.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          </div>
          <Cta to="/contact" variant="quiet">
            Plan your {e.name.toLowerCase()}
          </Cta>
        </div>
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
          <Process steps={STEPS} label="From load-in to last track" />
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
          <Details items={DETAILS} />
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
