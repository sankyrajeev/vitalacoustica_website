import { PageHead } from '../components/PageHead'
import { Arrow, Cta, Label } from '../components/ui'
import { StageModelLauncher } from '../components/StageModel'
import { capabilities, capabilityById } from '../content/capabilities'
import { Link } from '../components/Link'
import { NotFound } from './NotFound'
import { SoundPage } from './Sound'
import { LightPage } from './Light'
import { VisualsPage } from './Visuals'
import { ProductionPage } from './Production'
import { InstallationsPage } from './Installations'
import { ServiceFader } from '../components/service/ServiceFader'

const FACTS = [
  ['d&b audiotechnik', 'Sound systems'],
  ['Beam · Retro · LED', 'Lighting'],
  ['Crew on every show', 'Setup & operation'],
  ['Audio & Lighting Integration', 'Consulting'],
]

/** Live: the hire side. What we do, the kit and the crew, and how to get a quote. */
export function CapabilitiesIndex() {
  return (
    <>
      <PageHead label="Live" title="We run the show">
        Professional sound and lighting for club nights, festivals, brand events and private celebrations across Bengaluru and
        South India, with the crew to deliver, set up and run it.
      </PageHead>

      <section className="section section--tight" aria-labelledby="live-what">
        <div className="wrap">
          <Label index="01">
            <span id="live-what">What we do</span>
          </Label>
        </div>
        <ol className="wrap cap-index">
          {capabilities.map((c) => (
            <li key={c.id}>
              <Link to={`/live/${c.id}`} className="cap-index__row">
                <span className="cap-index__n">{c.index}</span>
                <span className="cap-index__name">{c.name}</span>
                <span className="cap-index__statement">{c.statement}</span>
                <Arrow />
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="section section--solid live-kit" aria-labelledby="live-kit">
        <div className="wrap live-kit__inner">
          <div className="live-kit__text">
            <Label index="02">Equipment and crew</Label>
            <h2 id="live-kit" className="h1">
              The gear, and the people who run it
            </h2>
            <p>
              Every hire includes delivery, rigging, cabling and setup. If you want, a sound engineer and a lighting operator stay
              through the show, and we handle load-out at the end.
            </p>
            <dl className="facts-row live-kit__facts">
              {FACTS.map(([big, small]) => (
                <div key={small}>
                  <dt>{small}</dt>
                  <dd>{big}</dd>
                </div>
              ))}
            </dl>
            <div className="statement__actions">
              <Cta to="/equipment">Explore equipment</Cta>
            </div>
          </div>
          <StageModelLauncher caption="Our typical stage as an interactive model: walk around the rig, or fly through the venue." />
        </div>
      </section>

      <section className="section live-quote" aria-labelledby="live-quote">
        <div className="wrap live-quote__inner">
          <Label index="03">Get a quote</Label>
          <h2 id="live-quote" className="h1">
            Tell us about your show
          </h2>
          <p>Send the date, the venue and roughly how many people. We send a clear, itemised quote, usually within a day.</p>
          <div className="statement__actions">
            <Cta to="/contact">Get a quote</Cta>
            <Cta to="/testimonials" variant="quiet">
              What clients say
            </Cta>
          </div>
        </div>
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
