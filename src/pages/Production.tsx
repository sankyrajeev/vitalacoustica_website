import {
  BuildScene,
  DisciplinesScene,
  EffortlessScene,
  IntegrationScene,
  Preflight,
  ProductionHero,
  RunOfShow,
  SignalScene,
  VenuePlans,
} from '../components/scenes/ProductionScenes'
import { Banner, Details, Feature } from '../components/service/Blocks'
import { StageModelLauncher } from '../components/StageModel'
import { Arrow, Cta, Label, TextLink } from '../components/ui'
import { capabilities } from '../content/capabilities'
import { openExplore } from '../events'

// The Production page: the service that connects the others. Sound, light, visuals, DJ systems and
// the infrastructure between them, planned and run as one environment.

const SCOPE = [
  ['Audio systems & tuning', 'Professional systems chosen, placed and tuned for the room.'],
  ['DJ & performance infrastructure', 'Booths that are dependable, intuitive and connected to the rest.'],
  ['Programmed lighting & cue design', 'Scenes, cues and transitions built around the event.'],
  ['MIDI control & automation', 'Control surfaces mapped to what matters in the moment.'],
  ['Audio-reactive lighting', 'Light that follows the tempo, the beats and the energy.'],
  ['Real-time generative visuals', 'Procedural visuals that evolve and respond to the music.'],
  ['Projection & unconventional surfaces', 'Walls, suspended mesh, translucent screens and haze.'],
  ['Networked control & integration', 'DMX512, Art-Net, sACN and MIDI, with clear control paths.'],
  ['Deployment & on-site support', 'Installed to plan, and supported while the event runs.'],
  ['Verification & close-out', 'Everything checked before the doors open, and after they close.'],
]

export function ProductionPage() {
  const next = capabilities[4]
  return (
    <article className="sound light production">
      <header className="sound-hero">
        <div className="wrap sound-hero__inner">
          <div className="sound-hero__text">
            <Label>Full production</Label>
            <h1 className="display display--sm sound-hero__title">
              One cohesive experience. <em>From the first technical drawing to the final cue.</em>
            </h1>
            <p className="sound-hero__sub">Audio. Lighting. Visuals. Systems. Experience.</p>
          </div>
          <div className="sound-hero__scene">
            <ProductionHero />
          </div>
        </div>
      </header>

      <section className="sound-intro">
        <div className="wrap sound-intro__inner">
          <p className="lede">
            An exceptional event is never the result of a single piece of equipment. It’s many systems, disciplines and creative
            decisions working together.
          </p>
          <div className="sound-intro__body">
            <p>
              Sound has to suit the space. Lighting has to suit the music. Visuals have to suit the environment. Every connection,
              transition and technical decision adds to what the audience feels.
            </p>
            <p>
              So we treat every project as a complete environment, not a list of separate rentals: technical planning, deployment,
              system configuration, creative programming and on-site execution, brought together so the experience feels
              intentional from beginning to end.
            </p>
          </div>
          <p className="sound-mantra">
            One brief. Multiple disciplines. <em>One unified production.</em>
          </p>
        </div>
      </section>

      <Banner
        photo="club-neon"
        title="We engineer the entire experience."
        lines={[
          'More than equipment. A complete technical environment.',
          'Every connection considered. Every system accounted for.',
          'Designed as a whole. Executed down to the detail.',
          'Technical thinking. Creative execution.',
        ]}
      />

      <Feature
        n="01"
        kicker="We see the entire system"
        title="Not departments. One connected environment."
        line="The same night, planned two ways."
        scene={<IntegrationScene />}
      >
        <p>
          Most production elements can run on their own. The real opportunity is in how they interact. A lighting sequence can
          follow the music’s timing. Visual content can evolve with the energy of a performance. A sound system can be designed
          around the geometry of the venue. Control interfaces can bring several technologies into one workflow.
        </p>
        <p>
          Planned separately, integration becomes an afterthought. We do the opposite: sound, lighting, visuals, infrastructure
          and control are parts of the same experience, so we think about what each system does and how it works with everything
          around it.
        </p>
        <p className="feature__kicker">We don’t just put the pieces together. We engineer how they work together.</p>
      </Feature>

      <section className="section" aria-labelledby="pdisc-title">
        <div className="wrap">
          <header className="section-head">
            <Label index="02">Our disciplines</Label>
            <h2 id="pdisc-title" className="h1">
              Five disciplines, one environment.
            </h2>
            <p className="section-head__sub">
              Many companies can provide sound and lights. What we bring is how they behave: in the room, with the music, on the
              surfaces around it, and with each other. Choose a discipline to see where it sits.
            </p>
          </header>
          <DisciplinesScene />
        </div>
      </section>

      <Banner
        photo="park-dusk"
        title="Different systems. One cohesive experience."
        lines={[
          'Sound sets the foundation. Light defines the atmosphere. Visuals transform the space.',
          'We design the relationships between the elements.',
          'Integration isn’t an afterthought. It’s the starting point.',
          'Everything connected. Everything with a purpose.',
        ]}
      />

      <section className="section section--solid" aria-labelledby="pprocess-title">
        <div className="wrap">
          <header className="section-head">
            <Label index="03">End-to-end production</Label>
            <h2 id="pprocess-title" className="h1">
              One partner, from concept to execution.
            </h2>
            <p className="section-head__sub">
              What should the audience experience? What does the venue allow? How should the systems interact, and what has to
              happen before the first guest arrives? Nine stages, from discovery to close-out: watch the venue come together.
            </p>
          </header>
          <BuildScene />
          <p className="sound-note">The audience experiences the result. We manage the process behind it.</p>
        </div>
      </section>

      <Feature
        n="04"
        kicker="The invisible infrastructure, and our own tools"
        title="Everything works better when systems communicate."
        line="Follow a signal from the music to the room."
        scene={<SignalScene />}
        flip
      >
        <p>
          Behind every polished production are decisions the audience never notices: signal routing, DMX addressing, network
          configuration, compatibility, control interfaces, power and cabling. We treat them as part of the design, working with
          DMX512, Art-Net, sACN, MIDI and supported audio networking, with clear control paths and every connection verified.
        </p>
        <p>
          And where a brief needs more than an off-the-shelf workflow, we build our own: tools for audio-reactive behaviour,
          tempo-aware lighting, MIDI mapped to lighting functions, and links between real-time visuals and external data. A
          musical event becomes a lighting trigger; one control coordinates many parameters; an audio signal shapes a generative
          composition.
        </p>
        <p className="feature__kicker">Technology isn’t the product. It’s what lets us create a better experience.</p>
      </Feature>

      <Feature
        n="05"
        kicker="Built around the venue"
        title="The venue sets the constraints. The design explores the possibilities."
        line="Five kinds of venue, five different plans."
        scene={<VenuePlans />}
      >
        <p>
          A ballroom, an open-air site, a private residence, a warehouse and a purpose-built club are different production
          challenges. Infrastructure, layout, acoustics, mounting points, ambient light and how the audience is arranged all
          change what’s possible.
        </p>
        <p>
          Rather than forcing every event into a standard package, we start from the venue and the intended experience. That can
          change where the loudspeakers go, how the subwoofers are arranged, where the lights hang, how control is laid out, which
          surfaces carry projection and how the systems connect.
        </p>
        <p className="feature__kicker">A production that feels right for its environment.</p>
      </Feature>

      <section className="section" aria-labelledby="papps-title">
        <div className="wrap">
          <header className="section-head">
            <Label index="06">Applications</Label>
            <h2 id="papps-title" className="h1">
              Every event has its own running order.
            </h2>
            <p className="section-head__sub">
              The same approach, adapted to the occasion: watch how the sound, the light and the image change, moment by moment,
              through each kind of event.
            </p>
          </header>
          <RunOfShow />
        </div>
      </section>

      <Banner
        photo="club-full"
        title="The show starts long before the audience arrives."
        lines={[
          'Prepared before the doors open.',
          'From technical planning to final system verification.',
          'Every detail matters when the entire system has to work.',
          'Behind every seamless experience is a deliberate process.',
        ]}
      />

      <Feature
        n="07"
        kicker="Precision is a production standard"
        title="We care about the details that make everything else possible."
        line="Nothing is assumed. Everything is checked."
        scene={<Preflight />}
      >
        <p>
          A production can look impressive on paper and still fall short if the technical work underneath is neglected. So we
          think through compatibility, signal flow, addressing, configuration, connectivity, installation and control before they
          can become problems, and we leave time to test and refine in the room where the system will actually run.
        </p>
        <p>
          Live production will always have variables. The aim is to meet them with preparation, understanding and a structured
          process, and with one team that considers how the disciplines affect each other from the start: audio shapes placement,
          lighting positions shape the visual composition, projection shapes the layout, and the timeline shapes everything.
        </p>
        <p className="feature__kicker">Precision isn’t something we add at the end. It’s built into the workflow.</p>
      </Feature>

      <Feature
        n="08"
        kicker="Our production philosophy"
        title="Make the complex feel effortless."
        line="Slide from the experience to the system behind it."
        scene={<EffortlessScene />}
        flip
      >
        <p>
          The audience shouldn’t have to think about signal paths, network protocols, fixture addresses, audio processing or
          software. They should feel the music, the atmosphere, the visuals and the energy of the night.
        </p>
        <p>
          That depends on the work behind the scenes: planning the equipment, understanding the venue, configuring the systems,
          programming the details, verifying the connections and coordinating the execution. We take it seriously because the
          technical process exists to serve the creative outcome.
        </p>
        <p className="feature__kicker">Complex systems. Seamless experiences.</p>
      </Feature>

      <section className="section section--solid" aria-labelledby="pscope-title">
        <div className="wrap">
          <header className="section-head">
            <Label index="09">From first brief to final pack-down</Label>
            <h2 id="pscope-title" className="h1">
              We take ownership of the whole process.
            </h2>
            <p className="section-head__sub">
              End-to-end means looking beyond the equipment list. Depending on the event, a production can bring together:
            </p>
          </header>
          <Details items={SCOPE} />
          <p className="sound-note">
            The scope is tailored to each event, from a single technical service to an integrated multi-system production.
          </p>
          <div className="prod-model">
            <StageModelLauncher caption="Our typical stage as an interactive model: every system on this page, in one place." />
          </div>
        </div>
      </section>

      <Banner
        photo="park-blue"
        title="Not just production. Experience engineering."
        lines={[
          'We make complex systems feel effortless.',
          'Creative ambition, backed by technical understanding.',
          'Built around the brief. Designed for the environment.',
          'We think beyond the equipment list.',
        ]}
      />

      <section className="sound-close" aria-labelledby="pclose-title">
        <div className="wrap sound-close__inner">
          <Label>The Vital Acoustica standard</Label>
          <h2 id="pclose-title" className="display display--sm">
            Designed with intent. Engineered with purpose. <em>Executed as one.</em>
          </h2>
          <p>
            Professional equipment deserves thoughtful deployment. Software deserves purposeful configuration. Lighting deserves
            considered programming. Visuals deserve an environment they can work in. And every component deserves to be judged
            against the complete system. The difference between a collection of equipment and a complete experience is the
            thinking behind it.
          </p>
          <p className="sound-close__tag">One production. Every detail considered.</p>
          <div className="sound-close__actions">
            <Cta to="/contact">Plan your production</Cta>
            <button className="cta cta--quiet" onClick={() => openExplore(null)}>
              <span>See our rig in 3D</span>
              <Arrow />
            </button>
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
