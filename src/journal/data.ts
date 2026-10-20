import { useEffect, useState } from 'react'
import { queryParam } from '../router'
import { isLive, type Article, type ArticleMeta, type PulseFeed } from './types'

// Where the Journal's articles come from:
// - on the live site, the Worker's /api/journal, which only ever returns live articles (and, with
//   the preview key, the ones in review);
// - in development (`npm run dev`) and in builds made with VITE_JOURNAL_EMBED, from the compiled
//   file itself, because there is no Worker. VITE_JOURNAL_EMBED=all shows every article, marked
//   with its status, for private review copies of the site; any other value shows live ones only.

const EMBED: string = import.meta.env.DEV ? 'all' : (import.meta.env.VITE_JOURNAL_EMBED ?? '')
const PREVIEW_KEY = 'va-journal-preview'

/** The preview key from ?preview=, remembered for this browser tab so the list shows reviews too. */
function previewKey() {
  const fromUrl = queryParam('preview')
  try {
    if (fromUrl) sessionStorage.setItem(PREVIEW_KEY, fromUrl)
    return fromUrl ?? sessionStorage.getItem(PREVIEW_KEY)
  } catch {
    return fromUrl
  }
}

const strip = ({ html: _html, ...meta }: Article): ArticleMeta => meta

let embedded: Promise<Article[]> | null = null
function embeddedArticles() {
  embedded ??= import('virtual:journal-embedded').then((m) => {
    const all = m.default.articles
    return EMBED === 'all' ? all : all.filter((a) => isLive(a))
  })
  return embedded
}

type ListResult = { articles: ArticleMeta[]; preview: boolean }
let listCache: Promise<ListResult> | null = null

export function loadJournal(): Promise<ListResult> {
  listCache ??= (async () => {
    if (EMBED) return { articles: (await embeddedArticles()).map(strip), preview: EMBED === 'all' }
    const key = previewKey()
    const res = await fetch(`/api/journal${key ? `?preview=${encodeURIComponent(key)}` : ''}`, { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`journal ${res.status}`)
    return (await res.json()) as ListResult
  })()
  listCache.catch(() => (listCache = null))
  return listCache
}

type ArticleResult = { article: Article; related: ArticleMeta[]; preview: boolean } | null

export async function loadArticle(slug: string): Promise<ArticleResult> {
  if (EMBED) {
    const all = await embeddedArticles()
    const article = all.find((a) => a.slug === slug)
    if (!article) return null
    const related = [
      ...article.related.map((s) => all.find((a) => a.slug === s)).filter((a): a is Article => !!a),
      ...all.filter((a) => a.slug !== slug && a.category === article.category),
      ...all.filter((a) => a.slug !== slug && a.category !== article.category),
    ].filter((a, i, list) => list.findIndex((b) => b.slug === a.slug) === i)
    return { article, related: related.slice(0, 3).map(strip), preview: EMBED === 'all' && !isLive(article) }
  }
  const key = previewKey()
  const res = await fetch(`/api/journal/${encodeURIComponent(slug)}${key ? `?preview=${encodeURIComponent(key)}` : ''}`, {
    headers: { Accept: 'application/json' },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`journal ${res.status}`)
  return (await res.json()) as ArticleResult
}

export type Loading<T> = { state: 'loading' } | { state: 'ready'; data: T } | { state: 'error' }

/** Runs a loader when `key` changes and keeps its result. */
export function useLoad<T>(load: () => Promise<T>, key: string): Loading<T> {
  const [result, setResult] = useState<{ key: string; value: Loading<T> }>({ key, value: { state: 'loading' } })
  useEffect(() => {
    let live = true
    load().then(
      (data) => live && setResult({ key, value: { state: 'ready', data } }),
      () => live && setResult({ key, value: { state: 'error' } }),
    )
    return () => {
      live = false
    }
    // the loader is recreated each render; `key` says when it really changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return result.key === key ? result.value : { state: 'loading' }
}

/* ─────────────── Industry Pulse ─────────────── */

const EMPTY_PULSE: PulseFeed = { items: [], fetchedAt: null, sources: [], configured: false }
let pulseCache: Promise<PulseFeed> | null = null

/** True in builds without a Worker (dev, review copies): Industry Pulse and sign-up aren't connected there. */
export const OFFLINE = !!EMBED

/** Industry Pulse from the Worker. Builds without a Worker show the section's "no news" state. */
export function loadPulse(): Promise<PulseFeed> {
  if (EMBED) return Promise.resolve(EMPTY_PULSE)
  pulseCache ??= fetch('/api/pulse', { headers: { Accept: 'application/json' } }).then((r) => {
    if (!r.ok) throw new Error(`pulse ${r.status}`)
    return r.json() as Promise<PulseFeed>
  })
  pulseCache.catch(() => (pulseCache = null))
  return pulseCache
}

/* ─────────────── presentation helpers ─────────────── */

export const formatDate = (iso: string, month: 'long' | 'short' = 'long') =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month, year: 'numeric', timeZone: 'Asia/Kolkata' })

export const coverSrc = (cover: string, w: 480 | 800 | 1600) => `${import.meta.env.BASE_URL}media/journal/${cover}-${w}.webp`
export const coverSet = (cover: string) => `${coverSrc(cover, 480)} 480w, ${coverSrc(cover, 800)} 800w, ${coverSrc(cover, 1600)} 1600w`

/** Featured articles first (newest first), then the rest by date. */
export function featuredFirst(list: ArticleMeta[]) {
  return [...list.filter((a) => a.featured), ...list.filter((a) => !a.featured)]
}
