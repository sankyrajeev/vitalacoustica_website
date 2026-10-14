import { GearCard, GearPhoto } from '../components/Equipment'
import { Link } from '../components/Link'
import { PageHead } from '../components/PageHead'
import { Arrow, Cta, Label, MediaFrame } from '../components/ui'
import { fullName, gear, GEAR_GROUPS, PHOTO_SOURCE } from '../content/gear'
import { projects } from '../content/projects'
import { openDrone, openExplore } from '../events'
import { NotFound } from './NotFound'

export function EquipmentIndex() {
  return (
    <>
      <PageHead label="Equipment" title="The rig we hire out.">
        Every item comes with delivery, setup and, if you want it, a technician to run it. Open any piece for its specs, or see
        it in place on our 3D stage.
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
              <div className="gear-grid">
                {gear
                  .filter((g) => g.group === group)
                  .map((g) => (
                    <GearCard key={g.id} g={g} />
                  ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </>
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
            <span>{g.role}</span>
          </p>
          <h1 className="display display--sm gear-detail__name">
            {g.maker && <span className="gear-detail__maker">{g.maker}</span>}
            {g.name}
          </h1>
          <p className="lede">{g.description}</p>

          <dl className="spec-table">
            {g.specs.map(([k, v]) => (
              <div key={k} className={v === 'To be confirmed' ? 'is-tbc' : ''}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          {g.specSource && <p className="fineprint">Specifications as published by {g.specSource}.</p>}

          <div className="gear-detail__actions">
            <button className="cta cta--primary" onClick={() => openExplore(g.id)}>
              <span>View in the 3D rig</span>
              <Arrow />
            </button>
            <Cta to={`/contact?item=${g.id}`} variant="quiet">
              Get a quote for this
            </Cta>
          </div>
        </div>
      </div>

      {seenIn.length > 0 && (
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
