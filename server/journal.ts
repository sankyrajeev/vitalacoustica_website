// The Acoustica Journal on the Worker: the articles' API, and the HTML for /journal pages with
// their own title, description, canonical link, sharing tags and structured data (so search
// engines and link previews see them without running the app).
//
// Articles come from content/journal/*.md, compiled by scripts/journal.mjs into
// server/generated/journal.json at build time. Only live articles are ever served: `published` or
// `scheduled`, from their publishAt time, so a scheduled article appears by itself without a
// redeploy. Articles in `review` (or `draft`) can be read with the preview key:
//   /journal/<slug>?preview=<JOURNAL_PREVIEW_TOKEN>   (never indexed, never listed)
//
// Environment: JOURNAL_PREVIEW_TOKEN (a secret, optional; without it there is no preview).

import data from './generated/journal.json'
import { isLive, type Article, type ArticleMeta, type JournalData } from '../src/journal/types.ts'
import { crumbs, esc, organisation, page, SITE_NAME } from './seo.ts'

export type JournalEnv = { JOURNAL_PREVIEW_TOKEN?: string; SITE_URL?: string }
type Assets = { fetch: (request: Request) => Promise<Response> }

const journal = data as unknown as JournalData
export const JOURNAL_TITLE = 'The Acoustica Journal'
const JOURNAL_LINE = 'Perspectives on the art and engineering of live sound and light.'

const meta = (a: Article): ArticleMeta => {
  const { html: _html, verify: _verify, ...rest } = a
  return rest
}
const json = (body: unknown, status = 200, cache = 'public, max-age=300') =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': cache } })

/** Constant-time comparison, so the preview key can't be guessed a character at a time. */
function sameKey(given: string | null, key: string | undefined) {
  if (!given || !key || given.length !== key.length) return false
  let diff = 0
  for (let i = 0; i < key.length; i++) diff |= given.charCodeAt(i) ^ key.charCodeAt(i)
  return diff === 0
}

export function liveArticles(now = Date.now()) {
  return journal.articles.filter((a) => isLive(a, now))
}

/** An article if the visitor may read it: live, or any status with the preview key. */
function find(slug: string, preview: boolean, now = Date.now()) {
  const a = journal.articles.find((x) => x.slug === slug)
  if (!a) return null
  if (isLive(a, now)) return { article: a, preview: false }
  return preview ? { article: a, preview: true } : null
}

/** GET /api/journal and /api/journal/<slug>. */
export function handleJournalApi(request: Request, env: JournalEnv): Response {
  const url = new URL(request.url)
  const preview = sameKey(url.searchParams.get('preview'), env.JOURNAL_PREVIEW_TOKEN)
  const rest = url.pathname.replace(/^\/api\/journal\/?/, '')
  if (!rest) {
    const list = preview ? journal.articles : liveArticles()
    return json({ articles: list.map(meta), preview }, 200, preview ? 'private, no-store' : 'public, max-age=300')
  }
  const found = find(decodeURIComponent(rest), preview)
  if (!found) return json({ error: 'not_found' }, 404, 'public, max-age=60')
  const related = found.article.related
    .map((s) => journal.articles.find((x) => x.slug === s))
    .filter((x): x is Article => !!x && (found.preview || isLive(x)))
  // fill up to three related articles with the latest in the same category, then the latest overall
  const pool = liveArticles().filter((x) => x.slug !== found.article.slug && !related.includes(x))
  const more = [...pool.filter((x) => x.category === found.article.category), ...pool.filter((x) => x.category !== found.article.category)]
  return json(
    { article: found.article, related: [...related, ...more].slice(0, 3).map(meta), preview: found.preview },
    200,
    found.preview ? 'private, no-store' : 'public, max-age=300',
  )
}

/* ─────────────── the pages, with their metadata ─────────────── */
// page(), the tags and the plain version are shared with every other page: server/seo.ts

const coverUrl = (site: string, a: ArticleMeta) => (a.cover ? `${site}/media/journal/${a.cover}-1600.webp` : `${site}/media/og.jpg`)


/** GET /journal and /journal/<slug>: the app's HTML, with the page's own metadata. */
export async function journalPage(request: Request, env: JournalEnv, assets: Assets): Promise<Response> {
  const url = new URL(request.url)
  const site = (env.SITE_URL || url.origin).replace(/\/$/, '')
  // one address per page: no trailing slash, like the rest of the site
  if (url.pathname.length > 1 && url.pathname.endsWith('/'))
    return Response.redirect(`${url.origin}${url.pathname.replace(/\/+$/, '')}${url.search}`, 301)


  if (url.pathname === '/journal') {
    const live = liveArticles()
    return page(request, assets, {
      title: `${JOURNAL_TITLE} — ${SITE_NAME}`,
      description: `${JOURNAL_LINE} Guides, production notes and industry news from ${SITE_NAME}.`,
      canonical: `${site}/journal`,
      image: live[0] ? coverUrl(site, live[0]) : `${site}/media/og.jpg`,
      type: 'website',
      body: `<h1>${JOURNAL_TITLE}</h1><p>${esc(JOURNAL_LINE)}</p><ul>${live
        .map((a) => `<li><a href="/journal/${esc(a.slug)}">${esc(a.title)}</a>: ${esc(a.excerpt)}</li>`)
        .join('')}</ul>`,
      structured: [
        {
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: JOURNAL_TITLE,
          description: JOURNAL_LINE,
          url: `${site}/journal`,
          publisher: organisation(site),
          blogPost: live.slice(0, 12).map((a) => ({
            '@type': 'BlogPosting',
            headline: a.title,
            url: `${site}/journal/${a.slug}`,
            datePublished: a.publishAt,
          })),
        },
        crumbs([
          ['Home', `${site}/`],
          [JOURNAL_TITLE, `${site}/journal`],
        ]),
      ],
    })
  }

  const slug = decodeURIComponent(url.pathname.slice('/journal/'.length))
  const preview = sameKey(url.searchParams.get('preview'), env.JOURNAL_PREVIEW_TOKEN)
  const found = slug.includes('/') ? null : find(slug, preview)
  if (!found) {
    return page(
      request,
      assets,
      {
        title: `Not found — ${SITE_NAME}`,
        description: 'This page could not be found.',
        canonical: `${site}/journal`,
        image: `${site}/media/og.jpg`,
        type: 'website',
        noindex: true,
      },
      404,
    )
  }
  const a = found.article
  const canonical = `${site}/journal/${a.slug}`
  const image = coverUrl(site, a)
  return page(request, assets, {
    title: `${a.title} — ${JOURNAL_TITLE}`,
    description: a.excerpt,
    canonical,
    image,
    imageAlt: a.coverAlt,
    type: 'article',
    noindex: found.preview,
    // the article itself, for crawlers that don't run the app
    body: `<p><a href="/journal">${JOURNAL_TITLE}</a></p><article><h1>${esc(a.title)}</h1><p>${esc(a.excerpt)}</p>${a.html}</article>`,
    extra: [
      `<meta property="article:published_time" content="${esc(a.publishAt)}">`,
      `<meta property="article:modified_time" content="${esc(a.updatedAt ?? a.publishAt)}">`,
      `<meta property="article:section" content="${esc(a.category)}">`,
    ].join('\n'),
    structured: [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: a.title,
        description: a.excerpt,
        image: [image],
        datePublished: a.publishAt,
        dateModified: a.updatedAt ?? a.publishAt,
        articleSection: a.category,
        author:
          a.author === JOURNAL_TITLE ? { '@type': 'Organization', name: SITE_NAME, url: site } : { '@type': 'Person', name: a.author },
        publisher: organisation(site),
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
      },
      crumbs([
        ['Home', `${site}/`],
        [JOURNAL_TITLE, `${site}/journal`],
        [a.title, canonical],
      ]),
    ],
  })
}
