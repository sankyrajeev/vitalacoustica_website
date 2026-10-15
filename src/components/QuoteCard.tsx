import { projectBySlug } from '../content/projects'
import type { Testimonial } from '../content/testimonials'
import { Link } from './Link'

/** One testimonial: the quote, who said it, and the show it was about. */
export function QuoteCard({ t }: { t: Testimonial }) {
  const project = t.project ? projectBySlug(t.project) : undefined
  return (
    <figure className="quote-card">
      {t.sample && <span className="quote-card__sample">Sample</span>}
      <blockquote>
        <p>“{t.quote}”</p>
      </blockquote>
      <figcaption>
        <strong>{t.name}</strong>
        {t.context && <span>{t.context}</span>}
        {project && (
          <Link to={`/work/${project.slug}`} className="underline">
            {project.title}
          </Link>
        )}
      </figcaption>
    </figure>
  )
}
