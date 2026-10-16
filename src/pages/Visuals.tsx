import {
  AbstractScene,
  AiScene,
  AudioVisualScene,
  GenerativeScene,
  MappingScene,
  NetworkScene,
  SurfaceScene,
  VisionScene,
  VisualsHero,
} from '../components/scenes/VisualScenes'
import { Details, Feature, Process } from '../components/service/Blocks'
import { Cta, Label, TextLink } from '../components/ui'
import { capabilities } from '../content/capabilities'

// The Visuals page: real-time, generative and projected visuals, still in development, told through
// scenes you can play with.

const RESEARCH = [
  ['Real-time audio analysis', 'How musical events and the character of the audio can influence visual parameters.'],
  ['Procedural graphics', 'Reusable systems for abstract geometry, textures, particle behaviour and evolving compositions.'],
  ['AI-assisted workflows', 'Faster ways to explore visual ideas, develop shaders and experiment with procedures.'],
  ['Projection environments', 'How walls, mesh fabrics and translucent screens interact with generated imagery.'],
  ['Performance integration', 'Visual systems that run alongside the lighting and the audio during a live event.'],
]

const STEPS = [
  ['Read the venue', 'The physical environment considered alongside the visual concept, from the first conversation.'],
  ['Choose the surface', 'Wall, mesh, translucent screen or haze: each transmits, scatters and holds light differently.'],
  ['Design the content', 'Imagery developed for the surface and the space, rather than carried over from somewhere else.'],
  ['Plan the geometry', 'Projector placement, throw, viewing angles and the level of alignment the piece needs.'],
  ['Configure the system', 'Real-time software, audio inputs, outputs and the links to lighting and sound.'],
  ['Test in the space', 'Contrast, visibility and ambient light checked where the audience will actually stand.'],
]

export function VisualsPage() {
  const next = capabilities[3]
  return (
    <article className="sound light visuals">
      <header className="sound-hero">
        <div className="wrap sound-hero__inner">
          <div className="sound-hero__text">
            <Label>Visual engineering</Label>
            <p className="wip">
              <i aria-hidden />
              Work in progress
            </p>
            <h1 className="display display--sm sound-hero__title">
              We don’t just project visuals. <em>We engineer immersive environments.</em>
            </h1>
            <p className="sound-hero__sub">Sound becomes data. Data becomes motion. Motion becomes an environment.</p>
          </div>
          <div className="sound-hero__scene">
            <VisualsHero />
          </div>
        </div>
      </header>

      <section className="sound-intro">
        <div className="wrap sound-intro__inner">
          <p className="lede">
            A new visual experience, at the intersection of real-time graphics, audio analysis, generative art and spatial
            projection.
          </p>
          <div className="sound-intro__body">
            <p>
              We want to move beyond conventional LED-wall content and pre-rendered loops, towards abstract visuals that evolve,
              respond to the music and transform the physical space around the audience.
            </p>
            <p>
              Using TouchDesigner, custom generative workflows and AI-assisted development, we’re turning sound into a constantly
              evolving visual language: geometric structures, fluid simulations, distorted spatial forms, organic textures and
              hypnotic black-and-white compositions, built to make ordinary surfaces feel extraordinary.
            </p>
          </div>
          <p className="sound-mantra">
            This isn’t simply about displaying content. <em>It’s making the environment part of the performance.</em>
          </p>
        </div>
      </section>

      <Feature
        n="01"
        kicker="The wall is just the beginning"
        title="Every surface is a potential canvas."
        line="Choose a surface, and drag to look around it."
        scene={<SurfaceScene />}
      >
        <p>
          Projection onto a wall is only one part of what we’re exploring. We work with architectural walls, suspended mesh and
          fishnet fabrics, translucent materials and atmospheric screens, because different surfaces treat light differently.
          Texture, transparency, contrast, viewing angle and ambient light all shape the final image.
        </p>
        <p>
          So the surface is part of the design, not a passive background, and the result can be layered environments that go far
          beyond a rectangular display.
        </p>
        <p className="feature__kicker">We don’t just fill screens. We explore the space between the image and the environment.</p>
      </Feature>

      <Feature
        n="02"
        kicker="Generative visuals"
        title="Designed by algorithms. Directed by imagination."
        line="A system of parameters, not a finished video."
        scene={<GenerativeScene />}
        flip
      >
        <p>
          With real-time visual programming we build systems out of procedural geometry, mathematical patterns, particle
          behaviour, feedback and image transformations, instead of relying only on fixed, pre-rendered content.
        </p>
        <p>
          A geometric structure can distort, fragment and reform. Particles accumulate into complex patterns. Feedback loops
          create recursive depth. Organic forms emerge from mathematical rules. Each system is a set of parameters, relationships
          and behaviours we can shape, so the visual feels alive.
        </p>
        <p className="feature__kicker">Not visuals on repeat. Visual systems that keep evolving.</p>
      </Feature>

      <Feature
        n="03"
        kicker="Audio-reactive visuals"
        title="When the music moves, the image responds."
        line="Musical signals, mapped to visual behaviour."
        scene={<AudioVisualScene />}
      >
        <p>
          Audio analysis and custom control logic turn musical characteristics into visual parameters: amplitude, energy in each
          frequency band, transients, tempo, beats and rhythmic events.
        </p>
        <p>
          Bass energy might drive the expansion of a form. High-frequency activity might add fine particle movement. Transients
          might trigger a distortion, and broader changes in intensity shape the density and motion of the whole scene. The music
          influences not just when something happens, but how the visual world evolves.
        </p>
        <p className="feature__kicker">Audio in. Visuals in motion. An environment that responds.</p>
      </Feature>

      <Feature
        n="04"
        kicker="TouchDesigner"
        title="Our real-time visual playground."
        line="Where graphics become systems."
        scene={<NetworkScene />}
        flip
      >
        <p>
          At the centre of our development is TouchDesigner, a node-based environment for interactive, real-time visuals. Data,
          audio analysis, image processing, geometry, feedback and rendering connect in one pipeline, where each process can
          influence the others.
        </p>
        <p>
          A particle simulation can feed a feedback system. Audio analysis can shape geometry. Textures pass through successive
          processing stages, and layers combine into a single output. The same modular approach lets us connect generative content
          to external inputs and to the conditions of a live event.
        </p>
        <p className="feature__kicker">Procedural by design. Real-time by nature. Immersive by intent.</p>
      </Feature>

      <Feature
        n="05"
        kicker="AI-assisted creative development"
        title="From abstract ideas to executable visual systems."
        line="An idea, a draft, then an engineered system."
        scene={<AiScene />}
      >
        <p>
          We use AI to explore creative directions, sketch shader concepts, prototype visual algorithms and suggest procedural
          compositions. Those drafts are then adapted, refined and built into our real-time environment.
        </p>
        <p>
          AI is part of the creative and technical process, not a machine for finished videos. A visual concept becomes a
          procedural system; a mathematical idea becomes a shader; an abstract reference becomes the start of a real-time
          composition.
        </p>
        <p className="feature__kicker">AI accelerates the exploration. We engineer the experience.</p>
      </Feature>

      <Feature
        n="06"
        kicker="Abstraction without limits"
        title="Geometry. Distortion. Motion. Depth."
        line="Slide from precision towards the unpredictable."
        scene={<AbstractScene />}
        flip
      >
        <p>
          We’re drawn to the tension between mathematical precision and organic unpredictability: rigid geometry that begins to
          deform, symmetrical structures that break apart, recursive imagery that seems to extend beyond its own edges.
        </p>
        <p>
          Black and white is a powerful starting point, using contrast, scale, negative space and movement to create intensity
          without colour. Other directions explore restrained palettes, metallic textures and layered spatial patterns. Rather
          than constant activity, it’s rhythm, contrast and carefully paced movement that draw people in.
        </p>
        <p className="feature__kicker">Abstract in form. Precise in execution. Unpredictable in motion.</p>
      </Feature>

      <Feature
        n="07"
        kicker="Projection mapping & spatial visuals"
        title="The image doesn’t have to stay inside a rectangle."
        line="The same building, three ways."
        scene={<MappingScene />}
      >
        <p>
          Projection mapping aligns imagery with architectural features, objects and surfaces, so the graphics interact with the
          structure of the venue. Combined with generative visuals, the transformations can respond to the shape and layout of the
          space itself.
        </p>
        <p>
          The technical approach depends on the geometry of the installation, projector placement, surface characteristics,
          ambient light and how precise the alignment needs to be.
        </p>
        <p className="feature__kicker">Not a picture projected into a room. A room transformed by the picture.</p>
      </Feature>

      <section className="section section--solid" aria-labelledby="vprocess-title">
        <div className="wrap">
          <header className="section-head">
            <Label index="08">Designed for the unexpected</Label>
            <h2 id="vprocess-title" className="h1">
              Every installation is a different visual challenge.
            </h2>
            <p className="section-head__sub">
              A wall, a suspended mesh and a translucent screen are not interchangeable. We treat each installation as content
              design, surface selection, projection geometry and technical configuration together.
            </p>
          </header>
          <Process steps={STEPS} label="How we approach an installation" />
          <p className="sound-note">The space shapes the visual. The visual reshapes the space.</p>
        </div>
      </section>

      <section className="section" aria-labelledby="vdev-title">
        <div className="wrap">
          <header className="section-head">
            <Label index="09">Currently in development</Label>
            <h2 id="vdev-title" className="h1">
              We’re building what comes next.
            </h2>
            <p className="section-head__sub">
              Our real-time visual work is an ongoing research and development project. We’re refining the technical architecture,
              the visual language and the performance workflow behind it, towards a flexible platform rather than a library of
              effects.
            </p>
          </header>
          <Details items={RESEARCH} />
          <p className="sound-note">This is a work in progress. The possibilities are still being explored.</p>
        </div>
      </section>

      <section className="sound-close visuals-close" aria-labelledby="vclose-title">
        <div className="wrap sound-close__inner">
          <VisionScene />
          <Label>Our vision</Label>
          <h2 id="vclose-title" className="display display--sm">
            A new relationship between sound, light and space.
          </h2>
          <p>
            Imagine a visual composition that evolves with the music, projected across a suspended mesh, surrounded by precisely
            programmed lighting. Not separate systems competing for attention, but one coordinated environment where sound, light
            and imagery work together. We’re building towards it one experiment, one visual system and one installation at a time.
          </p>
          <p className="sound-close__tag">Sound. Light. Space. Connected.</p>
          <div className="sound-close__actions">
            <Cta to="/contact">Talk to us about visuals</Cta>
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
