import { fullName, inRig, PHOTO_SOURCE, type Gear } from '../content/gear'
import { openExplore } from '../events'
import { gearImg } from './gearImg'
import { Link } from './Link'
import { Arrow } from './ui'

/** The product photograph on a neutral studio surface (white product backgrounds blend into it). */
export function GearPhoto({ g, large }: { g: Gear; large?: boolean }) {
  if (g.photo.source === 'none') {
    return (
      <div className={`gear-photo gear-photo--none ${large ? 'gear-photo--large' : ''}`}>
        <span className="gear-photo__name">{g.name}</span>
        <span className="gear-photo__source">Photo to come</span>
      </div>
    )
  }
  return (
    <div className={`gear-photo gear-photo--${g.photo.fit ?? g.photo.source} ${large ? 'gear-photo--large' : ''}`}>
      <img
        src={gearImg(g.photo.file, large ? 'full' : 'sm')}
        alt={g.photo.alt}
        width={g.photo.width}
        height={g.photo.height}
        loading={large ? 'eager' : 'lazy'}
        decoding="async"
      />
      {g.photo.source !== 'product' && <span className="gear-photo__source">{PHOTO_SOURCE[g.photo.source]}</span>}
    </div>
  )
}

/** Card in the equipment grid: picture first, then what it is, then the way into 3D. */
export function GearCard({ g }: { g: Gear }) {
  return (
    <article className="gear-card">
      <Link to={`/equipment/${g.id}`} className="gear-card__media" aria-label={`${fullName(g)}: details`}>
        <GearPhoto g={g} />
      </Link>
      <div className="gear-card__body">
        <p className="gear-card__meta">
          <span>{g.group}</span>
          {g.role && <span>{g.role}</span>}
        </p>
        <h3 className="gear-card__name">
          <Link to={`/equipment/${g.id}`}>
            {g.maker && <span className="gear-card__maker">{g.maker}</span>}
            {g.name}
          </Link>
        </h3>
        <p className="gear-card__about">{g.about}</p>
        <div className="gear-card__actions">
          <Link to={`/equipment/${g.id}`} className="text-link">
            Details <Arrow />
          </Link>
          {inRig(g) && (
            <button className="text-link text-link--quiet" onClick={() => openExplore(g.id)}>
              View in 3D <Arrow />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
