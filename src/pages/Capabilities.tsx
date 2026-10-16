import { PageHead } from '../components/PageHead'
import { Arrow } from '../components/ui'
import { capabilities, capabilityById } from '../content/capabilities'
import { Link } from '../components/Link'
import { NotFound } from './NotFound'
import { SoundPage } from './Sound'
import { LightPage } from './Light'
import { VisualsPage } from './Visuals'
import { ProductionPage } from './Production'
import { InstallationsPage } from './Installations'
import { ServiceFader } from '../components/service/ServiceFader'

export function CapabilitiesIndex() {
  return (
    <>
      <PageHead label="Services" title="Sound, light, visuals, and the systems that connect them.">
        How a sound system behaves in a room, how lighting responds to the music, how visuals can occupy unconventional
        surfaces, and how it all runs together. Each discipline has its own page; Production brings them into one experience, and
        for venues that want a system of their own, we consult on permanent installations.
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
      ) : c.id === 'production' ? (
        <ProductionPage />
      ) : (
        <InstallationsPage />
      )}
    </>
  )
}
