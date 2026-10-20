// The Acoustica Journal: types and constants shared by the site, the Worker and the publishing
// script. Articles themselves live in content/journal/*.md (see docs/journal.md).

export const CATEGORIES = [
  'Audio Engineering',
  'Lighting & Production',
  'Industry News',
  'Production Notes',
  'Guides & Insights',
] as const
export type Category = (typeof CATEGORIES)[number]

/**
 * draft: being written; never shown.
 * review: written, waiting for sign-off; visible only with the preview key.
 * scheduled: goes live by itself at publishAt.
 * published: live (from publishAt, if that is in the future).
 */
export type Status = 'draft' | 'review' | 'scheduled' | 'published'

export type Source = { title: string; url: string; publisher: string; date?: string }

/** An article's details, without its body: what lists and cards need. */
export type ArticleMeta = {
  slug: string
  title: string
  excerpt: string
  category: Category
  status: Status
  publishAt: string // ISO 8601, with the time zone
  updatedAt?: string
  author: string
  cover?: string // name of a photo in public/media/journal: <cover>-{480,800,1600}.webp
  coverAlt?: string
  coverCredit?: string
  coverCreditUrl?: string
  featured?: boolean
  services: string[] // capability ids, e.g. 'sound', 'light'
  related: string[] // slugs
  readingTime: number // minutes
  sources?: Source[]
  verify?: string[] // what still needs checking before it can go out
  verified?: boolean
}

export type Article = ArticleMeta & { html: string }

/** The file the publishing script writes and the Worker reads. */
export type JournalData = { generatedAt: string; articles: Article[] }

/** Is this article live at `now`? Drafts and reviews never are; the rest from their publish time. */
export function isLive(a: Pick<ArticleMeta, 'status' | 'publishAt'>, now = Date.now()) {
  return (a.status === 'published' || a.status === 'scheduled') && Date.parse(a.publishAt) <= now
}

/* ─────────────── Industry Pulse ─────────────── */

export const PULSE_CATEGORIES = [
  'Audio & Loudspeakers',
  'Consoles & Networking',
  'Lighting & Control',
  'Live Production',
  'Industry',
] as const
export type PulseCategory = (typeof PULSE_CATEGORIES)[number]

export type PulseItem = {
  id: string
  title: string
  url: string
  source: string
  sourceUrl: string
  published: string // ISO, as the source dated it
  summary: string
  category: PulseCategory
}

export type PulseFeed = {
  items: PulseItem[]
  fetchedAt: string | null
  sources: { name: string; ok: boolean; count: number }[]
  configured: boolean
}
