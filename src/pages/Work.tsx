import { Coverflow, type Slide } from '../components/Coverflow'
import { FaderReveal } from '../components/FaderReveal'
import { PageHead } from '../components/PageHead'
import { ProjectCard } from '../components/ProjectCard'
import { Label, MediaFrame, Placeholder, TextLink } from '../components/ui'
import { projects, TBC, type Project } from '../content/projects'
import { NotFound } from './NotFound'

/** Every photograph from every real project, each linking to its case study. */
function showSlides(only?: Project): Slide[] {
  return projects
    .filter((p) => !p.placeholder && (!only || p === only))
    .flatMap((p) =>
      [p.hero, ...p.gallery]
        .filter((m, i, all) => m.src && all.findIndex((x) => x.src === m.src) === i)
        .map((m) => ({
          src: m.src,
          alt: m.alt,
          title: p.title,
          meta: [p.venue, p.year].filter((x) => x && x !== TBC).join(' · '),
          href: only ? undefined : `/work/${p.slug}`,
        })),
    )
}

export function WorkIndex() {
  return (
    <>
      <PageHead label="Selected work" title="A selection of what we do.">
        Productions we have shaped. Each case study covers the system, the light and the decisions behind them.
      </PageHead>
      <section className="work-flow" aria-label="Photographs from our shows">
        <Coverflow slides={showSlides()} label="Photographs from our shows" />
      </section>
      <section className="section section--tight">
        <div className="wrap">
          <Label>All projects</Label>
          <div className="work-list">
            {projects.map((p) => (
              <ProjectCard key={p.slug} project={p} variant="small" />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

const STUDY_SECTIONS: { key: keyof Project['study']; title: string; missing: string }[] = [
  { key: 'objectives', title: 'Objectives', missing: 'The brief: what the client or artist wanted the night to be.' },
  { key: 'direction', title: 'Creative direction', missing: 'The idea behind the look and sound.' },
  { key: 'audio', title: 'Audio system and deployment', missing: 'System, placement, sub arrangement and tuning notes.' },
  { key: 'lighting', title: 'Lighting and visual design', missing: 'Fixtures, layout, palette and programming approach.' },
  { key: 'planning', title: 'Technical planning and execution', missing: 'Schedule, power, rigging and crew.' },
]

export function CaseStudy({ slug }: { slug: string }) {
  const real = projects.filter((x) => !x.placeholder)
  const p = real.find((x) => x.slug === slug)
  if (!p) return <NotFound />
  const next = real[(real.indexOf(p) + 1) % real.length]
  // DUMMY: a sample photo from a different show, so it doesn't repeat this gallery
  const sample = ['park-blue', 'club-down', 'park-dusk', 'club-neon'].find((src) => !p.gallery.some((m) => m.src === src))
  const details: [string, string][] = [
    ['Venue', p.venue],
    ['Year', p.year],
    ['Scope', p.scope.join(' / ')],
  ]

  return (
    <article className="case">
      <header className="case__head wrap">
        <Label>Case study</Label>
        <h1 className="display display--sm">{p.title}</h1>
        <dl className="case__details">
          {details.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd className={v === TBC ? 'is-tbc' : ''}>{v === TBC ? 'To be confirmed' : v}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="case__hero">
        <MediaFrame media={p.hero} priority showGear sizes="100vw" caption="Turn on the equipment markers to see what’s in the rig." />
      </div>

      <div className="wrap case__body">
        <p className="lede case__summary">{p.summary}</p>
        {STUDY_SECTIONS.map((s) => (
          <section key={s.key} className="case__section">
            <h2 className="h3">{s.title}</h2>
            {p.study[s.key] ? <p>{p.study[s.key]}</p> : <p className="tbc">To be supplied: {s.missing}</p>}
          </section>
        ))}
      </div>

      {p.slug === 'a-night-with-jovah' && (
        <section className="wrap case__feature">
          <Label>Two states of the same room</Label>
          <p className="muted case__feature-copy">
            Photographed from one position: the room at rest, then with the full rig running. Move the grand master.
          </p>
          <FaderReveal />
        </section>
      )}

      <section className="case__gallery" aria-label="Photographs">
        <div className="wrap">
          <Label>Photographs</Label>
        </div>
        <Coverflow slides={showSlides(p)} label={`Photographs from ${p.title}`} />
      </section>

      <section className="wrap case__film" aria-label="Production film">
        <Label>Production film</Label>
        {p.film ? (
          <video src={p.film} controls preload="none" playsInline />
        ) : (
          <Placeholder ratio="16 / 9" sample={sample}>The final production film for this project.</Placeholder>
        )}
      </section>

      {next && next.slug !== p.slug && (
        <nav className="wrap case__next" aria-label="Next project">
          <span className="label">Next</span>
          <TextLink to={`/work/${next.slug}`}>{next.title}</TextLink>
        </nav>
      )}
    </article>
  )
}
