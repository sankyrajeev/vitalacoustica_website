// GET /api/pulse — Industry Pulse: current news from the professional audio, lighting and live
// production trade press, read from the publishers' own RSS/Atom feeds.
//
// What it keeps from each story: the headline, the link to the original, the source, the date the
// source gave it, and a short excerpt of the source's own summary (at most ~30 words), credited
// and linked. No images and no full text: readers go to the publisher for the story.
//
// Filters: stories older than MAX_AGE_DAYS, undated or future-dated ones, ones that don't mention
// anything relevant to live sound, light or production, and duplicates (the same story from two
// feeds, or the same link twice).
//
// Caching: the result is kept in Cloudflare's cache for FRESH_SECONDS; a longer-lived copy is kept
// as a fallback, served if every feed fails on refresh. The feeds are re-read at most every
// FRESH_SECONDS per data centre, never on every visit.
//
// Configuration (optional; Cloudflare → the Worker → Settings → Variables):
//   PULSE_FEEDS  a JSON list replacing the sources below: [{"name":"…","url":"…","home":"…"}]
//   PULSE_OFF    "1" turns the section off; the site then shows its "no news" state
// No API keys are needed.

import { PULSE_CATEGORIES, type PulseCategory, type PulseFeed, type PulseItem } from '../src/journal/types.ts'

export type PulseEnv = { PULSE_FEEDS?: string; PULSE_OFF?: string }
type Source = { name: string; url: string; home: string }

/**
 * Trade publications' public feeds. Each is fetched independently; one failing doesn't affect the
 * others. Check new sources' terms before adding them, and prefer publishers' official feeds.
 */
export const SOURCES: Source[] = [
  { name: 'FOH', url: 'https://fohonline.com/feed/', home: 'https://fohonline.com' },
  { name: 'PLSN', url: 'https://plsn.com/feed/', home: 'https://plsn.com' },
  { name: 'ProSoundWeb', url: 'https://www.prosoundweb.com/feed/', home: 'https://www.prosoundweb.com' },
  { name: 'TPi', url: 'https://www.tpimagazine.com/feed/', home: 'https://www.tpimagazine.com' },
  { name: 'Pro Sound News', url: 'https://www.prosoundnetwork.com/feeds/all', home: 'https://www.prosoundnetwork.com' },
  { name: 'Live Design', url: 'https://www.livedesignonline.com/rss.xml', home: 'https://www.livedesignonline.com' },
]

const MAX_AGE_DAYS = 45
const PER_SOURCE = 8
const MAX_ITEMS = 30
const FRESH_SECONDS = 2 * 3600
const FALLBACK_SECONDS = 7 * 24 * 3600
const SUMMARY_WORDS = 30
const CACHE_VERSION = 'v1'

/* ─────────────── relevance and categories ─────────────── */

// matched as whole words or phrases, ignoring case
const TOPICS: Record<PulseCategory, string[]> = {
  'Audio & Loudspeakers': [
    'loudspeaker', 'loudspeakers', 'speaker', 'speakers', 'line array', 'line arrays', 'subwoofer', 'subwoofers', 'amplifier',
    'amplifiers', 'PA', 'sound system', 'sound reinforcement', 'immersive audio', 'd&b', 'd&b audiotechnik', 'L-Acoustics',
    'Meyer Sound', 'Martin Audio', 'Adamson', 'JBL', 'Coda Audio', 'Funktion-One', 'NEXO', 'Nexo', 'Holoplot', 'Powersoft',
    'Lab.gruppen', 'microphone', 'microphones', 'wireless', 'in-ear', 'IEM', 'Shure', 'Sennheiser',
  ],
  'Consoles & Networking': [
    'console', 'consoles', 'mixer', 'mixing desk', 'mixing', 'FOH', 'monitor engineer', 'stagebox', 'Dante', 'Audinate', 'AES67',
    'Milan', 'AVB', 'audio network', 'networking', 'DiGiCo', 'Allen & Heath', 'Midas', 'Yamaha', 'Avid', 'SSL', 'Solid State Logic',
    'DSP', 'processor',
  ],
  'Lighting & Control': [
    'lighting', 'lighting designer', 'luminaire', 'luminaires', 'fixture', 'fixtures', 'moving head', 'moving heads', 'DMX',
    'Art-Net', 'sACN', 'RDM', 'grandMA', 'MA Lighting', 'Robe', 'Claypaky', 'Ayrton', 'Chauvet', 'ETC', 'Elation', 'GLP',
    'Martin Professional', 'Avolites', 'ChamSys', 'laser', 'lasers', 'haze', 'hazer', 'LED', 'strobe', 'followspot', 'pixel',
  ],
  'Live Production': [
    'tour', 'touring', 'festival', 'festivals', 'concert', 'concerts', 'live event', 'live events', 'production', 'stage',
    'staging', 'rigging', 'truss', 'venue', 'arena', 'stadium', 'club', 'video wall', 'LED wall', 'media server', 'disguise',
    'Resolume', 'TouchDesigner', 'show', 'rental',
  ],
  Industry: ['PLASA', 'Prolight + Sound', 'ISE', 'InfoComm', 'LDI', 'NAMM', 'acquisition', 'acquires', 'appoints', 'distribution', 'distributor'],
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const PATTERNS = Object.fromEntries(
  Object.entries(TOPICS).map(([cat, words]) => [
    cat,
    // names and acronyms (anything with a capital) match exactly; ordinary words in any case
    words.map((w) => new RegExp(`(^|[^\\w&])${escapeRe(w)}(?=$|[^\\w&])`, /[A-Z]/.test(w) ? '' : 'i')),
  ]),
) as Record<PulseCategory, RegExp[]>

/** The best-matching category, or null if the story isn't about anything we cover. */
export function categorise(text: string): PulseCategory | null {
  let best: PulseCategory | null = null
  let score = 0
  let total = 0
  for (const cat of PULSE_CATEGORIES) {
    const n = PATTERNS[cat].filter((re) => re.test(text)).length
    total += n
    if (n > score) {
      best = cat
      score = n
    }
  }
  // a story needs at least one subject term; trade-show and business words alone aren't enough
  if (!total || (best === 'Industry' && total === score && !/\b(audio|sound|lighting|production|live)\b/i.test(text))) return null
  return best
}

/* ─────────────── reading feeds ─────────────── */

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“',
  rdquo: '”', hellip: '…', eacute: 'é', egrave: 'è', uuml: 'ü', ouml: 'ö', auml: 'ä', copy: '©', reg: '®', trade: '™',
}

export function decode(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
}

const stripTags = (s: string) => s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
const squash = (s: string) => s.replace(/\s+/g, ' ').trim()
/** Text of the first <name> element in a fragment of XML, decoded, without tags. */
function tag(xml: string, ...names: string[]) {
  for (const name of names) {
    const m = xml.match(new RegExp(`<${escapeRe(name)}(?:\\s[^>]*)?>([\\s\\S]*?)</${escapeRe(name)}>`, 'i'))
    if (m) return squash(stripTags(decode(decode(m[1]))))
  }
  return ''
}

function link(xml: string) {
  const atom = xml.match(/<link\b[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i) ?? xml.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?>/i)
  if (atom) return decode(atom[1])
  return tag(xml, 'link', 'guid')
}

/** Publishers' boilerplate that isn't part of the story. */
function tidySummary(s: string, title: string) {
  s = s
    .replace(/The post .*? appeared first on .*?\.?$/i, '')
    .replace(/\s*(\[(…|\.\.\.|&hellip;)\]|Continue reading.*|Read more.*|Read the full story.*)$/i, '')
    .trim()
  if (s.toLowerCase().startsWith(title.toLowerCase())) s = s.slice(title.length).replace(/^[\s:–—-]+/, '')
  const words = s.split(/\s+/).filter(Boolean)
  if (words.length <= SUMMARY_WORDS) return s
  return `${words.slice(0, SUMMARY_WORDS).join(' ').replace(/[,;:.–—-]+$/, '')}…`
}

/** Strips tracking parameters and fragments, so the same story is recognised from two feeds. */
export function canonicalUrl(u: string) {
  try {
    const url = new URL(u)
    url.hash = ''
    for (const k of [...url.searchParams.keys()]) if (/^(utm_|fbclid|gclid|mc_)/i.test(k)) url.searchParams.delete(k)
    return url.toString()
  } catch {
    return ''
  }
}

const titleKey = (t: string) =>
  t
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .slice(0, 80)

async function hash(s: string) {
  const d = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s))
  return [...new Uint8Array(d)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Every relevant, recent, dated story in one feed's XML. */
export async function parseFeed(xml: string, source: Source, now = Date.now()): Promise<PulseItem[]> {
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? []
  const out: PulseItem[] = []
  for (const block of blocks) {
    const title = tag(block, 'title')
    const url = canonicalUrl(link(block))
    const when = Date.parse(tag(block, 'pubDate', 'published', 'updated', 'dc:date'))
    if (!title || !url.startsWith('http') || Number.isNaN(when)) continue
    if (when > now + 86400e3 || now - when > MAX_AGE_DAYS * 86400e3) continue
    const summary = tidySummary(tag(block, 'description', 'summary', 'content:encoded', 'content'), title)
    const category = categorise(`${title} ${summary}`)
    if (!category) continue
    out.push({
      id: await hash(url),
      title,
      url,
      source: source.name,
      sourceUrl: source.home,
      published: new Date(when).toISOString(),
      summary,
      category,
    })
    if (out.length >= PER_SOURCE) break
  }
  return out
}

/** Merges the feeds: newest first, each story once. */
export function merge(lists: PulseItem[][]) {
  const seenUrl = new Set<string>()
  const seenTitle = new Set<string>()
  const all = lists.flat().sort((a, b) => b.published.localeCompare(a.published))
  const out: PulseItem[] = []
  for (const it of all) {
    const t = titleKey(it.title)
    if (seenUrl.has(it.url) || seenTitle.has(t)) continue
    seenUrl.add(it.url)
    seenTitle.add(t)
    out.push(it)
  }
  return out.slice(0, MAX_ITEMS)
}

function sources(env: PulseEnv): Source[] {
  if (!env.PULSE_FEEDS) return SOURCES
  try {
    const list = JSON.parse(env.PULSE_FEEDS) as Source[]
    return list.filter((s) => s && typeof s.name === 'string' && /^https:\/\//.test(s.url)).map((s) => ({ ...s, home: s.home || new URL(s.url).origin }))
  } catch {
    return SOURCES
  }
}

async function read(source: Source): Promise<{ items: PulseItem[]; ok: boolean }> {
  try {
    const res = await fetch(source.url, {
      headers: {
        'User-Agent': 'VitalAcousticaPulse/1.0 (+https://vitalacoustica.com/journal)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return { items: [], ok: false }
    const xml = (await res.text()).slice(0, 3_000_000)
    return { items: await parseFeed(xml, source), ok: true }
  } catch {
    return { items: [], ok: false }
  }
}

export async function buildPulse(env: PulseEnv): Promise<PulseFeed> {
  const list = sources(env)
  const results = await Promise.all(list.map(read))
  return {
    items: merge(results.map((r) => r.items)),
    fetchedAt: new Date().toISOString(),
    sources: list.map((s, i) => ({ name: s.name, ok: results[i].ok, count: results[i].items.length })),
    configured: true,
  }
}

/* ─────────────── the endpoint, with caching ─────────────── */

const respond = (feed: PulseFeed, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(feed), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=900', ...extra },
  })

const stored = (feed: PulseFeed, seconds: number) =>
  new Response(JSON.stringify(feed), { headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${seconds}` } })

export async function handlePulse(request: Request, env: PulseEnv, ctx: ExecutionContext): Promise<Response> {
  if (env.PULSE_OFF === '1') return respond({ items: [], fetchedAt: null, sources: [], configured: false })
  const origin = new URL(request.url).origin
  const freshKey = new Request(`${origin}/__pulse/${CACHE_VERSION}/fresh`)
  const fallbackKey = new Request(`${origin}/__pulse/${CACHE_VERSION}/fallback`)
  const cache = caches.default

  const hit = await cache.match(freshKey)
  if (hit) return respond((await hit.json()) as PulseFeed, { 'X-Pulse': 'cached' })

  const feed = await buildPulse(env)
  if (feed.items.length) {
    ctx.waitUntil(Promise.all([cache.put(freshKey, stored(feed, FRESH_SECONDS)), cache.put(fallbackKey, stored(feed, FALLBACK_SECONDS))]))
    return respond(feed, { 'X-Pulse': 'refreshed' })
  }
  // every feed failed or had nothing: serve the last good copy if there is one
  const old = await cache.match(fallbackKey)
  if (old) return respond({ ...((await old.json()) as PulseFeed), sources: feed.sources }, { 'X-Pulse': 'fallback' })
  return respond(feed, { 'Cache-Control': 'public, max-age=300', 'X-Pulse': 'empty' })
}
