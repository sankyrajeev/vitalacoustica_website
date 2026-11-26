import { statusOf, type Software } from '../../content/shop'
import { Link } from '../Link'
import { Cta } from '../ui'
import { SoftwareCover } from './Art'

const STATUS = { available: 'Available', beta: 'Free beta', soon: 'Coming soon' } as const

/**
 * Software that's out, shown large: its logo, where it stands, what it is in a sentence and the
 * way in, beside its real interface. On the homepage and at the top of the shop's Software shelf.
 */
export function SoftwareFeature({ p }: { p: Software }) {
  const status = statusOf(p)
  const shot = p.screenshots?.[0]
  return (
    <article className="soft-feature">
      <div className="soft-feature__text">
        {p.logo && <img className="soft-feature__logo" src={`${import.meta.env.BASE_URL}${p.logo.src}`} alt="" />}
        <span className={`shop-status shop-status--${status}`}>{STATUS[status]}</span>
        <h3 className="soft-feature__name">{p.name}</h3>
        <p className="soft-feature__type">{p.type}</p>
        <p className="soft-feature__line">{p.description.split(/(?<=\.)\s/)[0]}</p>
        <div className="soft-feature__actions">
          {status === 'beta' ? <Cta to={`/shop/${p.id}?beta=1`}>Join the free beta</Cta> : <Cta to={`/shop/${p.id}`}>Get {p.name}</Cta>}
          <Cta to={`/shop/${p.id}`} variant="quiet">
            More about {p.name}
          </Cta>
        </div>
      </div>
      <Link to={`/shop/${p.id}`} className="soft-feature__shot" aria-hidden tabIndex={-1}>
        {shot ? <img src={`${import.meta.env.BASE_URL}${shot.src}`} alt="" loading="lazy" /> : <SoftwareCover p={p} />}
      </Link>
    </article>
  )
}
