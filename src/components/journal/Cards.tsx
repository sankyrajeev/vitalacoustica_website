import { useState } from 'react'
import { isLive, type ArticleMeta } from '../../journal/types'
import { coverSet, coverSrc, formatDate } from '../../journal/data'
import { Link } from '../Link'
import { Arrow } from '../ui'

/** An article's cover photo, sized for its slot; a quiet branded panel until the photo is added. */
export function Cover({ a, sizes, priority, ratio = '3 / 2' }: { a: ArticleMeta; sizes: string; priority?: boolean; ratio?: string }) {
  return (
    <div className="j-cover" style={{ aspectRatio: ratio }}>
      {a.cover ? (
        <img
          src={coverSrc(a.cover, 800)}
          srcSet={coverSet(a.cover)}
          sizes={sizes}
          alt={a.coverAlt ?? ''}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onError={(e) => e.currentTarget.parentElement?.classList.add('is-missing')}
        />
      ) : (
        <span className="j-cover__empty" aria-hidden>
          {a.category}
        </span>
      )}
    </div>
  )
}

/** Category · date · reading time. */
export function ArticleMetaLine({ a, time = true, short }: { a: ArticleMeta; time?: boolean; short?: boolean }) {
  return (
    <p className="j-meta">
      <span className="j-meta__cat">{a.category}</span>
      <time dateTime={a.publishAt}>{formatDate(a.publishAt, short ? 'short' : 'long')}</time>
      {time && <span>{a.readingTime} min read</span>}
    </p>
  )
}

/** In review: shown only in previews, so nobody mistakes a draft for a published article. */
export function StatusTag({ a }: { a: ArticleMeta }) {
  const [now] = useState(Date.now)
  if (isLive(a, now)) return null
  const label = a.status === 'scheduled' ? 'Scheduled' : a.status === 'review' ? 'In review' : 'Draft'
  return <span className="j-status">{label}</span>
}

/** The editorial card used in the Journal grid, the homepage (compact) and related articles. */
export function ArticleCard({
  a,
  compact,
  sizes = '(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 33vw',
}: {
  a: ArticleMeta
  compact?: boolean
  sizes?: string
}) {
  return (
    <article className={`j-card ${compact ? 'j-card--compact' : ''}`}>
      <Link to={`/journal/${a.slug}`} className="j-card__link" aria-label={a.title}>
        <Cover a={a} sizes={sizes} ratio={compact ? '16 / 9' : '3 / 2'} />
      </Link>
      <div className="j-card__body">
        <ArticleMetaLine a={a} short time={!compact} />
        <h3 className="j-card__title">
          <Link to={`/journal/${a.slug}`}>{a.title}</Link>
          <StatusTag a={a} />
        </h3>
        <p className="j-card__excerpt">{a.excerpt}</p>
        <Link to={`/journal/${a.slug}`} className="text-link j-card__more" tabIndex={-1} aria-hidden>
          Read <Arrow />
        </Link>
      </div>
    </article>
  )
}
