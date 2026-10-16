import { InstallScene } from '../components/scenes/InstallScenes'
import { Details, Process } from '../components/service/Blocks'
import { Cta, Label, TextLink } from '../components/ui'
import { capabilities } from '../content/capabilities'

// The Installations page: permanent audio, lighting and visual systems, designed for the space and
// for the people who run it every day.

const SPACES = ['Venues', 'Residences', 'Clubs', 'Hospitality spaces', 'Commercial environments']

const SYSTEMS = [
  ['Professional sound systems', 'Loudspeakers chosen and placed for the room, tuned once and right, with zones for every area.'],
  ['Architectural lighting', 'Light built into the space: coves, downlights and wall washers that shape the room hour by hour.'],
  [
    'Networked controls & automation',
    'Keypads, schedules and presets, so the space is ready at the touch of a button, or on its own.',
  ],
  [
    'Immersive visual installations',
    'Visual walls and projection designed for the architecture, from a calm image to a reactive one.',
  ],
]

const STEPS = [
  [
    'Understand the space',
    'How it’s used, through the day and the week, who runs it, how loud it needs to get, and what the building and neighbours allow.',
  ],
  [
    'Design and specify',
    'Loudspeaker placement and coverage, lighting layout, visual surfaces and control, drawn and costed before anything is ordered.',
  ],
  [
    'Install and integrate',
    'Every system installed cleanly and connected to one control layer, working with your contractors and the building.',
  ],
  ['Commission and tune', 'The sound tuned to the room, lighting scenes set, presets and schedules programmed and tested.'],
  ['Hand over and support', 'Simple controls, training for your team and documentation, with us on call afterwards.'],
]

export function InstallationsPage() {
  const next = capabilities[0]
  return (
    <article className="sound light installations">
      <header className="sound-hero">
        <div className="wrap sound-hero__inner">
          <div className="sound-hero__text">
            <Label>Permanent installations</Label>
            <h1 className="display display--sm sound-hero__title">
              Engineered for the space. <em>Designed to last.</em>
            </h1>
            <p className="sound-hero__sub">Thoughtfully designed. Professionally integrated. Built for everyday performance.</p>
          </div>
          <div className="sound-hero__scene">
            <InstallScene />
          </div>
        </div>
      </header>

      <section className="sound-intro">
        <div className="wrap sound-intro__inner">
          <p className="lede">
            We design and integrate permanent audio, lighting and visual systems for venues, residences, clubs, hospitality spaces
            and commercial environments.
          </p>
          <div className="sound-intro__body">
            <p>
              From professional sound systems and architectural lighting to networked controls, automation and immersive visual
              installations, every solution is tailored to the space and to its long-term requirements.
            </p>
            <p>
              A permanent system has to perform every day, not just on opening night. Sound, light and image share one control
              layer: a keypad recalls a whole scene, schedules move the room through the day, and each zone keeps its own level.
              The room above runs a day on its own; press a scene to take over.
            </p>
            <p>
              What we learn running live shows every weekend goes into every installation: the right loudspeakers for the room,
              light that suits the space and the music, and controls your own team can run with confidence.
            </p>
          </div>
          <ul className="cap__covers inst-spaces" aria-label="Spaces we install in">
            {SPACES.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" aria-labelledby="isys-title">
        <div className="wrap">
          <header className="section-head">
            <Label index="01">What we integrate</Label>
            <h2 id="isys-title" className="h1">
              Four systems, one installation.
            </h2>
          </header>
          <Details items={SYSTEMS} />
        </div>
      </section>

      <section className="section section--solid" aria-labelledby="iprocess-title">
        <div className="wrap">
          <header className="section-head">
            <Label index="02">How an installation comes together</Label>
            <h2 id="iprocess-title" className="h1">
              From the first visit to the everyday.
            </h2>
          </header>
          <Process steps={STEPS} label="How an installation comes together" />
        </div>
      </section>

      <section className="sound-close" aria-labelledby="iclose-title">
        <div className="wrap sound-close__inner">
          <Label>Permanent installations</Label>
          <h2 id="iclose-title" className="display display--sm">
            A system of your own. <em>Every night, like a show.</em>
          </h2>
          <p>Tell us about the space, how it’s used and who will run it. We’ll take it from there.</p>
          <div className="sound-close__actions">
            <Cta to="/contact">Talk to us about an installation</Cta>
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
