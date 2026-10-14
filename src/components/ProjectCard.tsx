import { TBC, type Project } from '../content/projects'
import { img } from '../media'
import { Link } from './Link'
import { Arrow } from './ui'

/** A project in an editorial grid. Placeholders stay visibly unfinished. */
export function ProjectCard({ project: p, variant = 'small' }: { project: Project; variant?: 'lead' | 'offset' | 'small' }) {
  const meta = [p.venue, p.year].filter((x) => x && x !== TBC).join(' · ') || 'Details to be confirmed'
  if (p.placeholder) {
    return (
      <article className={`project project--${variant} project--placeholder`}>
        <div className="project__media placeholder" style={{ aspectRatio: '4 / 3' }}>
          <span className="placeholder__tag">To be supplied</span>
          <p>Photography or film from a production you’d like to feature.</p>
        </div>
        <div className="project__body">
          <p className="project__meta">Reserved</p>
          <h3 className="project__title">{p.title}</h3>
          <p className="project__summary muted">{p.summary}</p>
        </div>
      </article>
    )
  }
  return (
    <article className={`project project--${variant}`}>
      <Link to={`/work/${p.slug}`} className="project__link" aria-label={`${p.title}: case study`}>
        <div className="project__media" style={{ aspectRatio: `${p.hero.width} / ${p.hero.height}` }}>
          <img
            src={img(p.hero.src, 1600)}
            srcSet={`${img(p.hero.src, 800)} 800w, ${img(p.hero.src, 1600)} 1600w`}
            sizes={variant === 'lead' ? '(max-width: 900px) 100vw, 58vw' : '(max-width: 900px) 100vw, 40vw'}
            alt={p.hero.alt}
            width={p.hero.width}
            height={p.hero.height}
            loading="lazy"
            decoding="async"
          />
        </div>
      </Link>
      <div className="project__body">
        <p className="project__meta">{meta}</p>
        <h3 className="project__title">
          <Link to={`/work/${p.slug}`}>{p.title}</Link>
        </h3>
        <p className="project__scope">{p.scope.join(' / ')}</p>
        <p className="project__summary">{p.summary}</p>
        <Link to={`/work/${p.slug}`} className="text-link">
          Case study <Arrow />
        </Link>
      </div>
    </article>
  )
}
