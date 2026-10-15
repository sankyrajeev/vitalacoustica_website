import { TBC, type Project } from '../content/projects'
import { img, imgSet, preview } from '../media'
import { Link } from './Link'
import { Arrow, Placeholder } from './ui'

/** A project in an editorial grid. A placeholder project shows a sample photo and isn't linked. */
export function ProjectCard({ project: p, variant = 'small' }: { project: Project; variant?: 'lead' | 'offset' | 'small' }) {
  const meta = [p.venue, p.year].filter((x) => x && x !== TBC).join(' · ')
  if (p.placeholder) {
    return (
      <article className={`project project--${variant} project--placeholder`}>
        <div className="project__media">
          <Placeholder ratio="4 / 3" sample="club-neon">
            Photography from a production you’d like to feature.
          </Placeholder>
        </div>
        <div className="project__body">
          <p className="project__meta">Coming soon</p>
          <h3 className="project__title">{p.title}</h3>
          <p className="project__summary muted">{p.summary}</p>
        </div>
      </article>
    )
  }
  return (
    <article className={`project project--${variant}`}>
      <Link to={`/work/${p.slug}`} className="project__link" aria-label={`${p.title}: case study`}>
        <div className="project__media" style={{ aspectRatio: `${p.hero.width} / ${p.hero.height}`, ...preview(p.hero.src) }}>
          <img
            src={img(p.hero.src, 800)}
            srcSet={imgSet(p.hero.src)}
            sizes={variant === 'lead' ? '(max-width: 760px) 260px, (max-width: 900px) 100vw, 58vw' : '(max-width: 760px) 260px, (max-width: 900px) 100vw, 40vw'}
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
