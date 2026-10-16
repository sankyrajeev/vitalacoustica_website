import {
  AudioReactive,
  CueScene,
  LightHero,
  MidiScene,
  PatchScene,
  PixelScene,
  PurposeScene,
  ToolsGraph,
} from '../components/scenes/LightScenes'
import { Details, Feature, Process } from '../components/service/Blocks'
import { Arrow, Cta, Label, TextLink } from '../components/ui'
import { capabilities } from '../content/capabilities'
import { openExplore } from '../events'

// The Light service page: lighting as a programmed, connected system, told through scenes you can play.

const DETAILS = [
  ['Fixture profiling', 'Channel layouts, operating modes and supported parameters, understood for every fixture.'],
  ['DMX addressing', 'Fixtures organised and channels allocated across the available universes.'],
  ['Control mapping', 'Software parameters connected to controls that are useful in the moment.'],
  ['Cue programming', 'Scenes, transitions, timing and playback behaviour, structured.'],
  ['Movement programming', 'Positions, trajectories, speeds and coordinated effects.'],
  ['Colour management', 'Palettes, transitions and consistent relationships between fixtures.'],
  ['MIDI integration', 'Notes and control changes mapped to supported lighting functions.'],
  ['Audio analysis', 'The audio characteristics that drive tempo-aware and reactive behaviour.'],
  ['Network configuration', 'Connectivity for Art-Net, sACN and the other protocols in use.'],
  ['Pixel mapping', 'Visual patterns translated into control data for compatible LEDs.'],
  ['System verification', 'Fixture response, addressing, control paths and programming checked.'],
]

const STEPS = [
  ['Understand the space', 'The venue layout, event requirements, intended atmosphere and practical limits.'],
  ['Define the direction', 'The role of light in the experience: movement, colour, intensity and how it relates to the music.'],
  ['Design the system', 'Fixtures, control requirements, addressing, software and network architecture.'],
  ['Configure the fixtures', 'Fixture profiles, operating modes, channel assignments and control parameters.'],
  ['Build the programming', 'Scenes, cues, movement sequences, effects and transitions for the design.'],
  ['Integrate the controls', 'MIDI mappings, audio inputs, tempo-aware logic and external control, where needed.'],
  ['Test and refine', 'Fixture response and control behaviour verified; timing and transitions refined.'],
  ['Operate and adapt', 'The show run with the right balance of automation and live control.'],
]

export function LightPage() {
  const next = capabilities[2]
  return (
    <article className="sound light">
      <header className="sound-hero">
        <div className="wrap sound-hero__inner">
          <div className="sound-hero__text">
            <Label>Light</Label>
            <h1 className="display display--sm sound-hero__title">
              We don’t just light a room. <em>We program an experience.</em>
            </h1>
            <p className="sound-hero__sub">Intelligent lighting. Real-time audio. Precision control.</p>
          </div>
          <div className="sound-hero__scene">
            <LightHero />
          </div>
        </div>
      </header>

      <section className="sound-intro">
        <div className="wrap sound-intro__inner">
          <p className="lede">
            A light fixture is a piece of hardware. What it does, when it moves, how it responds and how it works with everything
            around it: that’s where the experience begins.
          </p>
          <div className="sound-intro__body">
            <p>
              We treat lighting as a programmable, connected system. Professional control software, tools we build ourselves,
              MIDI, audio-reactive programming and carefully designed cue structures turn individual fixtures into one visual
              environment.
            </p>
            <p>
              We work where lighting design, live performance, software and technical execution meet, so the light feels connected
              to the music, responsive to the moment and intentional in every detail.
            </p>
          </div>
          <p className="sound-mantra">
            We don’t simply deploy fixtures. <em>We design how they behave.</em>
          </p>
        </div>
      </section>

      <Feature
        n="01"
        kicker="Every light has a purpose"
        title="Illumination, or atmosphere."
        line="Programming is the difference."
        scene={<PurposeScene />}
      >
        <p>
          A collection of lights isn’t a lighting system. Without programming, fixtures act as separate devices; with a proper
          control architecture they become one visual language, built from behaviour, movement, colour, intensity, timing and
          transitions.
        </p>
        <p>We think about the whole life of a cue: how it begins, how it develops, how it transitions and how it resolves.</p>
        <p className="feature__kicker">It isn’t how many fixtures are switched on. It’s what happens when they work together.</p>
      </Feature>

      <Feature
        n="02"
        kicker="The music is the clock"
        title="Real-time audio, in the light."
        line="When the music changes, the room can change with it."
        scene={<AudioReactive />}
        flip
      >
        <p>
          Music isn’t static. Its energy shifts, its rhythm evolves, it builds and releases. With our own software, audio analysis
          and programmable logic, the lighting can follow: tempo estimation, beat detection, rhythmic triggers, intensity and
          synchronised events, as a layer on top of what the operator plays.
        </p>
        <p>
          BPM is only the beginning. Events can be built around beats, bars, subdivisions and whole phrases. The aim isn’t for
          every light to react to every sound, but a relationship between music and light that feels deliberate, not mechanical.
        </p>
        <p className="feature__kicker">Sound becomes data. Data becomes motion. Motion becomes atmosphere.</p>
      </Feature>

      <Feature
        n="03"
        kicker="We build our own tools"
        title="Software as creative as the lighting."
        line="Some ideas need more than an off-the-shelf workflow."
        scene={<ToolsGraph />}
      >
        <p>
          We write tools that connect audio inputs, musical timing, control surfaces and lighting systems. A detected beat can
          inform a trigger, a change in energy can shape intensity, a single control signal can coordinate a transition across the
          rig.
        </p>
        <div className="feature__cols">
          <div>
            <h3 className="feature__h">Industry-standard foundations</h3>
            <p>
              Lightkey for fixture control and live operation, QLC+ for flexible control and automation, Madrix for LED pixel
              mapping. The right tool for each job.
            </p>
          </div>
          <div>
            <h3 className="feature__h">Built around the idea</h3>
            <p>We shape the control logic around the creative goal, rather than forcing every idea into a ready-made workflow.</p>
          </div>
        </div>
        <p className="feature__kicker">We don’t just learn the tools. We build the tools that let us go further.</p>
      </Feature>

      <Feature
        n="04"
        kicker="MIDI, mapped with intention"
        title="Every control has a reason to exist."
        line="Play it: pads, faders and the messages they send."
        scene={<MidiScene />}
        flip
      >
        <p>
          MIDI is the interface between creative intent and technical execution. Notes and control changes mapped to scenes,
          effect parameters, intensity and transitions turn the control surface into an extension of the lighting design.
        </p>
        <p>
          One pad triggers a look, another changes colour, a fader shapes intensity. Behind each press sits a configured chain of
          software, mappings, commands and fixture responses.
        </p>
        <p className="feature__kicker">Complexity behind the interface. Clarity at the controls.</p>
      </Feature>

      <Feature
        n="05"
        kicker="Every cue is a decision"
        title="We program the transitions, not just the moments."
        line="Press GO. Change the fade, and press it again."
        scene={<CueScene />}
      >
        <p>
          Movement should add to the atmosphere, not distract from it. Colour is a control parameter, chosen for the mood rather
          than cycled because the fixtures can. And the move between two looks matters as much as the looks themselves: fade
          times, movement timing and the order things appear.
        </p>
        <p>
          Programmed cues give consistency, manual control gives freedom, audio-reactive layers add response. Built for live
          performance: responsive when it matters, structured when it counts.
        </p>
        <p className="feature__kicker">Every cue has a role. Every transition moves the experience forward.</p>
      </Feature>

      <Feature
        n="06"
        kicker="Pixel mapping"
        title="When the fixture becomes a canvas."
        line="Visuals at the level of the LED."
        scene={<PixelScene />}
        flip
      >
        <p>
          With pixel-mappable LEDs, every pixel or group of pixels becomes part of one composition: gradients, travelling
          patterns, spatial effects and colour fields across panels and bars. Fixtures are laid out in a virtual map that matches
          the real rig, and the software turns the design into control data.
        </p>
        <p className="feature__kicker">Individual pixels become part of a much larger picture.</p>
      </Feature>

      <Feature
        n="07"
        kicker="The control system behind the show"
        title="Precision begins with architecture."
        line="DMX512, Art-Net, sACN and MIDI, each with a role."
        scene={<PatchScene />}
      >
        <p>
          Addressing, signal distribution, software configuration and communication between devices are planned as one system:
          universe allocation, fixture addressing, channel use and the network, organised so a complex rig stays easy to
          understand, maintain and run live.
        </p>
        <p className="feature__kicker">The audience sees the lights. We engineer the infrastructure that controls them.</p>
      </Feature>

      <section className="section" aria-labelledby="ldetails-title">
        <div className="wrap">
          <header className="section-head">
            <Label index="08">Engineered to the detail</Label>
            <h2 id="ldetails-title" className="h1">
              The technical decisions that shape the result.
            </h2>
            <p className="section-head__sub">
              The difference between a collection of working fixtures and a coherent lighting environment.
            </p>
          </header>
          <Details items={DETAILS} />
        </div>
      </section>

      <section className="section section--solid" aria-labelledby="lprocess-title">
        <div className="wrap">
          <header className="section-head">
            <Label index="09">Our lighting workflow</Label>
            <h2 id="lprocess-title" className="h1">
              From specification to a fully realised environment.
            </h2>
          </header>
          <Process steps={STEPS} label="Our lighting workflow" />
          <p className="sound-note">Individual technical components, turned into one coordinated visual experience.</p>
        </div>
      </section>

      <section className="sound-close" aria-labelledby="lclose-title">
        <div className="wrap sound-close__inner">
          <Label>Our philosophy</Label>
          <h2 id="lclose-title" className="display display--sm">
            Technology in service of creativity. <em>We turn lighting into an experience.</em>
          </h2>
          <p>
            Light changes how a space is perceived. It can create intimacy, build anticipation, define a focal point or transform
            the energy of a room. Sometimes that means a precisely timed accent, sometimes a slow shift in colour, sometimes
            letting a space stay understated until the right moment. We consider not only what the system can do, but what the
            audience should feel.
          </p>
          <p className="sound-close__tag">The technology makes it possible. The programming gives it direction.</p>
          <div className="sound-close__actions">
            <Cta to="/contact">Plan your lighting</Cta>
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
