import { FaderReveal } from '../components/FaderReveal'
import { PageHead } from '../components/PageHead'
import { StageModelLauncher } from '../components/StageModel'
import { Arrow, Label, MediaFrame, TextLink } from '../components/ui'
import { capabilities, capabilityById, type Capability } from '../content/capabilities'
import { Link } from '../components/Link'
import { NotFound } from './NotFound'
import { SoundPage } from './Sound'
import { LightPage } from './Light'
import { VisualsPage } from './Visuals'
import { ServiceFader } from '../components/service/ServiceFader'

export function CapabilitiesIndex() {
  return (
    <>
      <PageHead label="Services" title="Sound, light and production, for hire.">
        Hire the equipment on its own, or with the crew to design, set up and run it, and for venues that want a system of their
        own, consulting on permanent installations. Everything is planned together so the sound, the light and the stage serve the
        same night.
      </PageHead>
      <section className="section section--tight">
        <ol className="wrap cap-index">
          {capabilities.map((c) => (
            <li key={c.id}>
              <Link to={`/capabilities/${c.id}`} className="cap-index__row">
                <span className="cap-index__n">{c.index}</span>
                <span className="cap-index__name">{c.name}</span>
                <span className="cap-index__statement">{c.statement}</span>
                <Arrow />
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}

export function CapabilityPage({ id }: { id: string }) {
  const c = capabilityById(id)
  if (!c) return <NotFound />
  return (
    <>
      <ServiceFader current={c.id} />
      {c.id === 'sound' ? (
        <SoundPage />
      ) : c.id === 'light' ? (
        <LightPage />
      ) : c.id === 'visuals' ? (
        <VisualsPage />
      ) : (
        <ServicePage c={c} />
      )}
    </>
  )
}

function ServicePage({ c }: { c: Capability }) {
  const i = capabilities.indexOf(c)
  const next = capabilities[(i + 1) % capabilities.length]

  return (
    <article className="cap-page">
      <PageHead label={c.name} title={c.statement} />

      {c.image && (
        <div className="cap-page__hero">
          <MediaFrame
            media={{ src: c.image.src, width: 1600, height: c.image.src.startsWith('park') ? 1201 : 1066, alt: c.image.alt }}
            priority
            sizes="100vw"
          />
        </div>
      )}

      <div className="wrap cap-page__body">

        <section className="cap-page__intro">
          <p className="lede">{c.summary}</p>
          <ul className="cap__covers">
            {c.covers.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>

        <section className="cap-page__section">
          <Label>Approach</Label>
          <ol className="approach">
            {c.approach.map((a, n) => (
              <li key={a.title}>
                <span>0{n + 1}</span>
                <h2 className="h3">{a.title}</h2>
                <p>{a.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {c.id === 'light' && (
          <section className="cap-page__section">
            <Label>Two states of the same room</Label>
            <p className="muted cap-page__note">
              The same position, photographed with the effects at rest and with the full rig running.
            </p>
            <FaderReveal />
          </section>
        )}

        {c.id === 'visuals' && (
          <section className="cap-page__section">
            <Label>Studies</Label>
            <p>
              Our visual work is shown in the Journal and labelled as studies until it has been delivered for a client. The
              sculpture on our homepage is one of them.
            </p>
            <TextLink to="/journal">Read the Journal</TextLink>
          </section>
        )}

        {c.id === 'production' && (
          <section className="cap-page__section">
            <Label>Stage model</Label>
            <StageModelLauncher />
          </section>
        )}
      </div>

      <nav className="wrap case__next" aria-label="Next service">
        <span className="label">Next</span>
        <TextLink to={`/capabilities/${next.id}`}>{next.name}</TextLink>
      </nav>
    </article>
  )
}
