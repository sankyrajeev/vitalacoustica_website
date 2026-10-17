import { GearCard, GearPhoto } from '../components/Equipment'
import { Link } from '../components/Link'
import { PageHead } from '../components/PageHead'
import { Arrow, Cta, Label, MediaFrame } from '../components/ui'
import { COMING_SOON, fullName, gear, GEAR_GROUPS, inRig, PHOTO_SOURCE } from '../content/gear'
import { projects } from '../content/projects'
import { published } from '../content/site'
import { openDrone, openExplore } from '../events'
import { NotFound } from './NotFound'

export function EquipmentIndex() {
  return (
    <>
      <PageHead label="Equipment" title="The rig we hire out.">
        Every item comes with delivery, setup and, if you want it, a technician to run it. Open any piece for its specs, or see it
        in place on our 3D stage.
      </PageHead>
      <section className="section section--tight">
        <div className="wrap">
          <div className="rig-actions">
            <button className="cta cta--primary" onClick={() => openExplore(null)}>
              <span>Explore the full rig in 3D</span>
              <Arrow />
            </button>
            <button className="cta cta--quiet" onClick={openDrone}>
              <span>Fly through the venue</span>
              <Arrow />
            </button>
          </div>
          {GEAR_GROUPS.map((group) => (
            <section key={group} className="gear-group" aria-labelledby={`group-${group}`}>
              <h2 id={`group-${group}`} className="gear-group__title">
                {group}
              </h2>
              {COMING_SOON[group] ? (
                <div className="coming-soon">
                  <span className="label">Coming soon</span>
                  <p>{COMING_SOON[group]}</p>
                </div>
              ) : (
                <div className="gear-grid">
                  {gear
                    .filter((g) => g.group === group)
                    .map((g) => (
                      <GearCard key={g.id} g={g} />
                    ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </section>
      <HowHiringWorks />
    </>
  )
}

const STEPS = [
  ['Enquire', 'Tell us the date, venue, audience size and what you need. Equipment only, or with crew.'],
  ['Proposal & quote', 'We recommend a system for the space and send a clear, itemised quote.'],
  ['Delivery, setup & tuning', 'We deliver, rig and cable everything, then tune the sound and focus the lights before doors.'],
  ['Show & collection', 'Our engineer and lighting operator run the show if you want them, and we load out afterwards.'],
]

function HowHiringWorks() {
  return (
    <section className="section section--solid hiring" aria-labelledby="hiring-title">
      <div className="wrap">
        <header className="section-head">
          <Label>How hiring works</Label>
          <h2 id="hiring-title" className="h1">
            From enquiry to load-out.
          </h2>
        </header>
        <ol className="steps">
          {STEPS.map(([t, b], i) => (
            <li key={t}>
              <span className="steps__n">0{i + 1}</span>
              <strong>{t}</strong>
              <p>{b}</p>
            </li>
          ))}
        </ol>
        <div className="hiring__cta">
          <Cta to="/contact">Get a quote</Cta>
        </div>
      </div>
    </section>
  )
}

export function EquipmentDetail({ id }: { id: string }) {
  const index = gear.findIndex((g) => g.id === id)
  const g = gear[index]
  if (!g) return <NotFound />
  const prev = gear[(index - 1 + gear.length) % gear.length]
  const next = gear[(index + 1) % gear.length]
  // show photographs where this item is marked
  const seenIn = projects.flatMap((p) => p.gallery.filter((m) => m.hotspots?.some((h) => h.gear === g.id)).map((m) => ({ p, m })))

  return (
    <article className="gear-detail">
      <div className="wrap gear-detail__top">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/equipment">Equipment</Link>
          <span aria-hidden>/</span>
          <span>{g.group}</span>
        </nav>
      </div>

      <div className="wrap gear-detail__grid">
        <figure className="gear-detail__figure">
          <GearPhoto g={g} large />
          <figcaption className="muted">{PHOTO_SOURCE[g.photo.source]}</figcaption>
        </figure>

        <div className="gear-detail__info">
          <p className="gear-card__meta">
            <span>{g.group}</span>
            {g.role && <span>{g.role}</span>}
          </p>
          <h1 className="display display--sm gear-detail__name">
            {g.maker && <span className="gear-detail__maker">{g.maker}</span>}
            {g.name}
          </h1>
          <p className="lede">{g.description}</p>

          <dl className="spec-table">
            {g.specs.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          {g.specSource && <p className="fineprint">Specifications as published by {g.specSource}.</p>}

          <div className="gear-detail__actions">
            {inRig(g) && (
              <button className="cta cta--primary" onClick={() => openExplore(g.id)}>
                <span>View in the 3D rig</span>
                <Arrow />
              </button>
            )}
            <Cta to={`/contact?item=${g.id}`} variant={inRig(g) ? 'quiet' : 'primary'}>
              Get a quote for this
            </Cta>
          </div>
        </div>
      </div>

      {published.work && seenIn.length > 0 && (
        <section className="wrap gear-detail__seen" aria-label="In our shows">
          <Label>In our shows</Label>
          <div className="case__grid">
            {seenIn.slice(0, 2).map(({ p, m }) => (
              <MediaFrame
                key={m.src}
                media={m}
                showGear
                sizes="(max-width: 900px) 100vw, 50vw"
                caption={
                  <Link to={`/work/${p.slug}`} className="underline">
                    {p.title}
                  </Link>
                }
              />
            ))}
          </div>
        </section>
      )}

      <nav className="wrap gear-detail__pager" aria-label="More equipment">
        <Link to={`/equipment/${prev.id}`} className="pager">
          <span className="label">Previous</span>
          <span className="pager__name">{fullName(prev)}</span>
        </Link>
        <Link to={`/equipment/${next.id}`} className="pager pager--next">
          <span className="label">Next</span>
          <span className="pager__name">{fullName(next)}</span>
        </Link>
      </nav>
    </article>
  )
}
