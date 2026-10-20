import { useState, type MouseEvent } from 'react'
import { AcousticaEdit } from '../components/journal/AcousticaEdit'
import { ArticleCard, ArticleMetaLine, Cover, StatusTag } from '../components/journal/Cards'
import { Link } from '../components/Link'
import { Arrow, Label, TextLink } from '../components/ui'
import { capabilityById } from '../content/capabilities'
import { journal as studioNotes } from '../content/journal'
import { OFFLINE, coverSrc, featuredFirst, formatDate, loadArticle, loadJournal, loadPulse, useLoad } from '../journal/data'
import { usePageMeta } from '../journal/meta'
import { CATEGORIES, PULSE_CATEGORIES, type Category, type PulseCategory, type PulseFeed } from '../journal/types'
import { navigate } from '../router'
import { NotFound } from './NotFound'

const PAGE = 6 // articles per "Load more"
const JOURNAL_LINE = 'Perspectives on the art and engineering of live sound and light.'

/* ─────────────── /journal ─────────────── */

export function JournalIndex() {
  const list = useLoad(loadJournal, 'journal')
  const [category, setCategory] = useState<Category | 'All'>('All')
  const [shown, setShown] = useState(PAGE)
  usePageMeta({ title: 'The Acoustica Journal — Vital Acoustica', description: JOURNAL_LINE, path: '/journal' })

  const articles = list.state === 'ready' ? list.data.articles : []
  const featured = featuredFirst(articles)[0]
  const rest = articles.filter((a) => a !== featured)
  const filtered = category === 'All' ? rest : articles.filter((a) => a.category === category)
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, articles.filter((a) => a.category === c).length]))

  const pick = (c: Category | 'All') => {
    setCategory(c)
    setShown(PAGE)
  }

  return (
    <>
      <header className="page-head wrap j-hero">
        <Label>Journal</Label>
        <h1 className="display display--sm">The Acoustica Journal</h1>
        <p className="lede">{JOURNAL_LINE}</p>
      </header>

      {list.state === 'ready' && list.data.preview && (
        <div className="wrap">
          <div className="notice j-preview" role="note">
            <p className="label">Preview</p>
            <p>Articles in review are shown here, marked as such. Visitors to the site see only published articles.</p>
          </div>
        </div>
      )}

      {list.state === 'loading' && <div className="wrap j-loading" aria-busy="true" />}

      {list.state === 'error' && (
        <div className="wrap">
          <div className="coming-soon">
            <span className="label">Unavailable</span>
            <p>The Journal couldn’t be loaded just now. Please refresh the page in a moment.</p>
          </div>
        </div>
      )}

      {list.state === 'ready' && !featured && (
        <section className="section section--tight">
          <div className="wrap">
            <div className="coming-soon j-empty">
              <span className="label">First stories soon</span>
              <p>
                Guides, production notes and analysis on sound, light and live production are on their way. Industry Pulse below brings
                the latest news from the trade press in the meantime, and The Acoustica Edit will bring new stories to your inbox.
              </p>
            </div>
          </div>
        </section>
      )}

      {featured && (
        <section className="section section--tight j-featured" aria-labelledby="featured-title">
          <div className="wrap j-featured__inner">
            <Link to={`/journal/${featured.slug}`} className="j-featured__media" aria-hidden tabIndex={-1}>
              <Cover a={featured} sizes="(max-width: 900px) 100vw, 60vw" priority ratio="16 / 10" />
            </Link>
            <div className="j-featured__text">
              <p className="label">Featured</p>
              <ArticleMetaLine a={featured} />
              <h2 id="featured-title" className="h1 j-featured__title">
                <Link to={`/journal/${featured.slug}`}>{featured.title}</Link> <StatusTag a={featured} />
              </h2>
              <p className="j-featured__excerpt">{featured.excerpt}</p>
              <TextLink to={`/journal/${featured.slug}`}>Read the story</TextLink>
            </div>
          </div>
        </section>
      )}

      {featured && (
        <section className="section section--tight j-latest" aria-labelledby="latest-title">
          <div className="wrap">
            <header className="j-latest__head">
              <h2 id="latest-title" className="h2">
                Latest articles
              </h2>
              <div className="chips j-filters" role="group" aria-label="Filter by category">
                <button type="button" className="chip" aria-pressed={category === 'All'} onClick={() => pick('All')}>
                  All
                </button>
                {CATEGORIES.map((c) => (
                  <button
                    type="button"
                    key={c}
                    className="chip"
                    aria-pressed={category === c}
                    onClick={() => pick(c)}
                    disabled={counts[c] === 0}
                  >
                    {c}
                    <span className="j-filters__n">{counts[c]}</span>
                  </button>
                ))}
              </div>
            </header>

            {filtered.length === 0 ? (
              <p className="muted j-latest__none">
                {category === 'All' ? 'More articles soon.' : `No articles in ${category} yet. New ones appear here as they are published.`}
              </p>
            ) : (
              <div className="j-grid" aria-live="polite">
                {filtered.slice(0, shown).map((a) => (
                  <ArticleCard key={a.slug} a={a} />
                ))}
              </div>
            )}
            {filtered.length > shown && (
              <div className="j-more">
                <button type="button" className="cta cta--quiet" onClick={() => setShown((n) => n + PAGE)}>
                  <span>Load more</span>
                  <span className="muted j-more__n">{filtered.length - shown} more</span>
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      <IndustryPulse />

      <section className="section section--tight j-studio" aria-labelledby="studio-title">
        <div className="wrap">
          <header className="section-head">
            <Label>From the studio</Label>
            <h2 id="studio-title" className="h2">
              Studies, experiments and field notes.
            </h2>
          </header>
          <ol className="journal">
            {studioNotes.map((j) => (
              <li key={j.slug} className={`journal__entry ${j.placeholder ? 'is-placeholder' : ''}`}>
                <p className="journal__meta">
                  <span className="tag">{j.label}</span>
                  <span>{j.date === 'TBC' ? 'Upcoming' : j.date}</span>
                </p>
                <h3 className="h2">{j.title}</h3>
                <p>{j.body}</p>
                {j.link && <TextLink to={j.link.to}>{j.link.label}</TextLink>}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <AcousticaEdit />
    </>
  )
}

/* ─────────────── Industry Pulse ─────────────── */

const PULSE_PAGE = 9

function IndustryPulse() {
  const pulse = useLoad(loadPulse, 'pulse')
  const [filter, setFilter] = useState<PulseCategory | 'All'>('All')
  const [shown, setShown] = useState(PULSE_PAGE)
  const feed: PulseFeed | null = pulse.state === 'ready' ? pulse.data : null
  const items = feed ? feed.items.filter((i) => filter === 'All' || i.category === filter) : []
  const present = feed ? PULSE_CATEGORIES.filter((c) => feed.items.some((i) => i.category === c)) : []

  return (
    <section className="section section--solid j-pulse" aria-labelledby="pulse-title">
      <div className="wrap">
        <header className="section-head j-pulse__head">
          <Label>Industry Pulse</Label>
          <h2 id="pulse-title" className="h1">
            The week in sound, light and live production.
          </h2>
          <p className="section-head__sub">
            Current news from the professional audio, lighting and event-production trade press. Every headline links to its original
            publisher.
          </p>
        </header>

        {pulse.state === 'loading' && <div className="j-pulse__loading" aria-busy="true" />}

        {(pulse.state === 'error' || (feed && feed.items.length === 0)) && (
          <div className="coming-soon j-pulse__empty">
            <span className="label">No headlines right now</span>
            <p>
              {OFFLINE
                ? 'This copy of the site isn’t connected to the news feed. On the live site, this shows the latest headlines from the trade press.'
                : feed && !feed.configured
                ? 'The news feed is switched off at the moment.'
                : 'The news feed couldn’t be reached just now. Headlines from the trade press will appear here as soon as it’s back.'}
            </p>
          </div>
        )}

        {feed && feed.items.length > 0 && (
          <>
            {present.length > 1 && (
              <div className="chips j-filters j-pulse__filters" role="group" aria-label="Filter news by topic">
                <button type="button" className="chip" aria-pressed={filter === 'All'} onClick={() => (setFilter('All'), setShown(PULSE_PAGE))}>
                  All
                </button>
                {present.map((c) => (
                  <button type="button" key={c} className="chip" aria-pressed={filter === c} onClick={() => (setFilter(c), setShown(PULSE_PAGE))}>
                    {c}
                  </button>
                ))}
              </div>
            )}
            <ol className="j-pulse__list">
              {items.slice(0, shown).map((it) => (
                <li key={it.id} className="j-pulse__item">
                  <p className="j-meta">
                    <span className="j-meta__cat">{it.category}</span>
                    <a href={it.sourceUrl} target="_blank" rel="noopener noreferrer" className="j-pulse__source">
                      {it.source}
                    </a>
                    <time dateTime={it.published}>{formatDate(it.published)}</time>
                  </p>
                  <h3 className="j-pulse__title">
                    <a href={it.url} target="_blank" rel="noopener noreferrer">
                      {it.title}
                      <span className="sr-only"> (opens {it.source} in a new tab)</span>
                    </a>
                  </h3>
                  {it.summary && <p className="j-pulse__summary">{it.summary}</p>}
                </li>
              ))}
            </ol>
            <div className="j-pulse__foot">
              {items.length > shown && (
                <button type="button" className="cta cta--quiet" onClick={() => setShown((n) => n + PULSE_PAGE)}>
                  <span>More headlines</span>
                </button>
              )}
              <p className="fineprint">
                Headlines and short excerpts are from each publisher’s own news feed, credited and linked to the original.
                {feed.fetchedAt && ` Updated ${new Date(feed.fetchedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })} IST.`}
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

/* ─────────────── /journal/:slug ─────────────── */

export function JournalArticle({ slug }: { slug: string }) {
  const res = useLoad(() => loadArticle(slug), `article:${slug}`)
  const found = res.state === 'ready' ? res.data : null
  const a = found?.article
  usePageMeta(
    a
      ? {
          title: `${a.title} — The Acoustica Journal`,
          description: a.excerpt,
          path: `/journal/${a.slug}`,
          image: a.cover ? coverSrc(a.cover, 1600) : undefined,
          type: 'article',
        }
      : null,
  )

  if (res.state === 'loading') return <div className="wrap j-loading j-loading--article" aria-busy="true" />
  if (res.state === 'error')
    return (
      <div className="wrap section">
        <div className="coming-soon">
          <span className="label">Unavailable</span>
          <p>This article couldn’t be loaded just now. Please refresh the page in a moment.</p>
        </div>
      </div>
    )
  if (!found || !a) return <NotFound />

  // links inside the article to other pages of the site stay inside the app
  const onBodyClick = (e: MouseEvent<HTMLDivElement>) => {
    const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-internal]')
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    navigate(link.getAttribute('href')!)
  }
  const services = a.services.map((id) => capabilityById(id)).filter((c): c is NonNullable<typeof c> => !!c)

  return (
    <article className="j-article">
      <div className="wrap">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/journal">The Acoustica Journal</Link>
          <span aria-hidden>/</span>
          <span>{a.category}</span>
        </nav>
      </div>

      {found.preview && (
        <div className="wrap">
          <div className="notice j-preview" role="note">
            <p className="label">Preview</p>
            <p>
              This article is {a.status === 'review' ? 'in review' : a.status} and isn’t public.
              {a.verify && !a.verified && ` Before it can be published: ${a.verify.join('; ')}.`}
            </p>
          </div>
        </div>
      )}

      <header className="wrap j-article__head">
        <ArticleMetaLine a={a} />
        <h1 className="display display--sm j-article__title">{a.title}</h1>
        <p className="lede j-article__excerpt">{a.excerpt}</p>
        <p className="j-article__byline">
          By {a.author}
          {a.updatedAt && a.updatedAt !== a.publishAt && <> · Updated {formatDate(a.updatedAt)}</>}
        </p>
      </header>

      <figure className="wrap j-article__cover">
        <Cover a={a} sizes="(max-width: 1360px) 100vw, 1360px" priority ratio="16 / 9" />
        {a.coverCredit && (
          <figcaption className="j-article__credit">
            {a.coverCreditUrl ? (
              <a href={a.coverCreditUrl} target="_blank" rel="noopener noreferrer">
                {a.coverCredit}
              </a>
            ) : (
              a.coverCredit
            )}
          </figcaption>
        )}
      </figure>

      <div className="wrap j-article__layout">
        <div className="j-article__body" onClick={onBodyClick} dangerouslySetInnerHTML={{ __html: a.html }} />

        <aside className="j-article__aside" aria-label="About this article">
          {a.sources && a.sources.length > 0 && (
            <div className="j-aside__block">
              <p className="label">Sources</p>
              <ul className="j-aside__list">
                {a.sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.title}
                    </a>
                    <span className="muted">
                      {s.publisher}
                      {s.date && `, ${formatDate(s.date)}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {services.length > 0 && (
            <div className="j-aside__block">
              <p className="label">Related services</p>
              <ul className="j-aside__list">
                {services.map((c) => (
                  <li key={c.id}>
                    <Link to={`/capabilities/${c.id}`} className="text-link">
                      {c.name} <Arrow />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="j-aside__block j-aside__quote">
            <p className="label">Planning an event?</p>
            <p className="muted">Tell us the date, the venue and roughly how many people, and we’ll reply with a proposal.</p>
            <TextLink to="/contact">Request a quote</TextLink>
          </div>
        </aside>
      </div>

      {found.related.length > 0 && (
        <section className="section section--tight j-related" aria-labelledby="related-title">
          <div className="wrap">
            <header className="section-head">
              <Label>Keep reading</Label>
              <h2 id="related-title" className="h2">
                Related articles
              </h2>
            </header>
            <div className="j-grid">
              {found.related.map((r) => (
                <ArticleCard key={r.slug} a={r} />
              ))}
            </div>
            <p className="j-related__all">
              <TextLink to="/journal">All articles</TextLink>
            </p>
          </div>
        </section>
      )}

      <p className="wrap fineprint j-article__dates">
        Published {formatDate(a.publishAt)} in {a.category}.
      </p>
    </article>
  )
}
