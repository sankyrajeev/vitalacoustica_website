import { productPath, type Software } from '../../content/shop'
import { Link } from '../Link'
import { Arrow } from '../ui'

/**
 * Software that isn't out yet: a quiet list under what is, on the homepage and the shop's
 * Software shelf. Each links to its page, where people can ask to be told when it's out.
 */
export function ComingSoon({ items, title = 'Coming soon' }: { items: Software[]; title?: string }) {
  if (!items.length) return null
  return (
    <section className="soon" aria-label={title}>
      <h3 className="soon__title">{title}</h3>
      <ul className="soon__list">
        {items.map((p) => (
          <li key={p.id}>
            <Link to={productPath(p)} className="soon__item">
              <span className="soon__name">{p.name}</span>
              <span className="soon__type">{p.type}</span>
              <span className="soon__line">{p.tagline}</span>
              <span className="soon__go" aria-hidden>
                <Arrow />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
