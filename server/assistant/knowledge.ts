// What the site assistant knows: the site's own content, cut into short passages it can search.
// Built from the same files the pages are built from (src/content/), plus the blog's live posts
// and the answers the team has taught it on the admin page, so it learns about anything new the
// moment it's published.

import { capabilities, process as steps } from '../../src/content/capabilities.ts'
import { fullName, gear } from '../../src/content/gear.ts'
import { price, productPath, products, statusOf } from '../../src/content/shop.ts'
import { testimonials } from '../../src/content/testimonials.ts'

export type Passage = { id: string; title: string; text: string; link?: string }

/** A blog post as the assistant needs it (server/journal.ts hands these over). */
export type PostInfo = { slug: string; title: string; excerpt: string; category: string; publishAt: string; html: string }

/** An answer the team taught it on the admin page. */
export type Taught = { id: number; question: string; answer: string }

const clean = (s: string) => s.replace(/\s+/g, ' ').trim()
const fromHtml = (html: string) =>
  clean(
    html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#39;|&rsquo;/g, '’')
      .replace(/&quot;/g, '"'),
  )

/** The basics, true for every question: always given to the model. */
export const BASICS = clean(`
Vital Acoustica is a sound, light and software company based in Bengaluru, India, started by two
best friends, Sankarsh and Harsh. It has two sides. Live: it hires out professional sound
(d&b audiotechnik systems), lighting and production gear, with the crew to deliver, set up and run
it, for club nights, festivals, open-airs, brand events and private celebrations of up to around
1,000 people, across Bengaluru, Karnataka and South India (Mysuru, Hubballi, Belagavi, Mangaluru,
Hyderabad and more). Software: it makes its own software for artists and audio engineers:
VANTA (a synthesizer plugin, in free beta), VANTA Dynamics, ORBIT, Pixel Forge (LED pixel mapping),
Lumière Link and Lumière Resident (see the Software pages). It does not build custom software for
clients. It also writes a blog with a daily news roundup. Prices for live events are quoted per
event: people get a quote through the event form, Plan your event (/contact) or on WhatsApp (the WhatsApp button in
this chat).
`)

/** Facts the old assistant answered, kept as passages. */
const FACTS: Passage[] = [
  {
    id: 'process',
    title: 'How hiring works',
    text: `Four steps: 1) Enquire with the date, venue and audience. 2) We recommend a system and send an itemised quote, usually within a day. 3) We deliver, rig and cable everything, then tune the sound and focus the lights before doors. 4) Our engineer and lighting operator can run the show, and we load out afterwards. The fuller production process: ${steps.map((s) => `${s.title}: ${s.body}`).join(' ')}`,
    link: '/live',
  },
  {
    id: 'prices',
    title: 'Prices and quotes',
    text: 'Every quote depends on the venue, the date, the crowd and how much of the setup we run, so each event is priced individually. Send the date, the venue and roughly how many people through Plan your event (the form at /contact), or on WhatsApp, and we send a clear, itemised quote, usually within a day. There is no public price list for hire.',
    link: '/contact',
  },
  {
    id: 'crew',
    title: 'Crew and setup',
    text: 'Every hire includes delivery, rigging, cabling and setup. If you want, a sound engineer and a lighting operator stay through the show, and we handle load-out at the end.',
  },
  {
    id: 'payment',
    title: 'Payment and invoices',
    text: 'Payment terms, including any advance to hold a date, are set out in the quote. We send a GST invoice (GSTIN 29ABCFV2853P1ZF).',
  },
  {
    id: 'installations',
    title: 'Permanent installations',
    text: 'We design and set up permanent sound and lighting for venues: assessment, system design, installation, tuning and training for the venue’s team.',
    link: '/live/installations',
  },
  {
    id: 'contact',
    title: 'Contacting the team',
    text: 'The quickest way is WhatsApp (the button in this chat), or the enquiry form on the site (/contact). We’re on Instagram as @vitalacoustica and on LinkedIn (linkedin.com/company/vital-acoustica). For an account or licence problem, write to support@vitalacoustica.com; for the VANTA beta, beta@vitalacoustica.com.',
  },
  {
    id: 'account',
    title: 'Accounts, licence keys and downloads',
    text: 'Software bought from us, and beta keys, live in your Vital Acoustica account (/account): licence keys, the computers they’re active on, downloads and orders. Create the account with the same email the key was sent to. Forgotten password: /account/forgot. If a confirmation email doesn’t arrive, check spam, then use “Send the link again” on the sign-in page.',
    link: '/account',
  },
  {
    id: 'careers',
    title: 'Careers',
    text: 'The crew is full right now, but we’d still love to hear from people who want to work with us.',
    link: '/careers',
  },
  {
    id: 'newsletter',
    title: 'The newsletter',
    text: 'The Acoustica Edit is a free weekly email, every Monday, with the best of the week’s news in sound, light and visuals and our newest guides. Sign up at the bottom of any page.',
    link: '/blog',
  },
]

/** Every passage from the site's content; `posts` are the blog's live posts, `taught` the team's answers. */
export function buildKnowledge(posts: PostInfo[], taught: Taught[] = []): Passage[] {
  const out: Passage[] = [...FACTS]

  for (const c of capabilities)
    out.push({
      id: `service-${c.id}`,
      title: `Service: ${c.name}`,
      text: `${c.statement} ${c.summary} It covers: ${c.covers.join(', ')}. ${c.approach.map((a) => `${a.title}: ${a.body}`).join(' ')}`,
      link: `/live/${c.id}`,
    })

  for (const g of gear)
    out.push({
      id: `gear-${g.id}`,
      title: `Equipment for hire: ${fullName(g)} (${g.group})`,
      text: `${g.description} ${g.specs.map(([k, v]) => `${k}: ${v}`).join('; ')}.`,
      link: `/equipment/${g.id}`,
    })

  for (const p of products) {
    if (p.sample) continue
    const status = statusOf(p)
    const state =
      status === 'available' ? `On sale for ${price(p)}.` : status === 'beta' ? 'In free beta: people can ask to join from its page (testing is free and by invitation). Not on sale yet.' : 'Coming soon: not on sale yet; people can ask to be told when it’s out on its page.'
    const extra =
      p.kind === 'software'
        ? [
            p.type,
            p.features.join('; '),
            p.specs.map(([k, v]) => `${k}: ${v}`).join('; '),
            ...(p.story ?? []).map((s) => `${s.title}: ${s.text} ${(s.points ?? []).join('; ')}`),
          ].join(' ')
        : 'specs' in p
          ? p.specs.map(([k, v]) => `${k}: ${v}`).join('; ')
          : ''
    out.push({ id: `product-${p.id}`, title: `${p.kind === 'software' ? 'Software' : 'Shop'}: ${p.name} — ${p.tagline}`, text: clean(`${state} ${p.description} ${extra}`), link: productPath(p) })
  }

  for (const t of testimonials)
    if (!t.sample) out.push({ id: `voice-${t.name}`, title: `What a client said: ${t.name}${t.context ? `, ${t.context}` : ''}`, text: t.quote, link: '/testimonials' })

  for (const a of posts) {
    const date = a.publishAt.slice(0, 10)
    out.push({
      id: `post-${a.slug}`,
      title: `Blog (${a.category}, ${date}): ${a.title}`,
      text: `${a.excerpt} ${fromHtml(a.html).slice(0, 1800)}`,
      link: `/blog/${a.slug}`,
    })
  }

  for (const t of taught) out.push({ id: `taught-${t.id}`, title: `The team’s answer to: ${t.question}`, text: t.answer })
  return out
}

/* ─────────────── finding the passages for a question (BM25) ─────────────── */

const STOP = new Set(
  'a an and are as at be but by can do does for from have how i in is it me my of on or our so that the this to us we what when where which who will with you your about any there their they them was were has had been just also than then into over'.split(' '),
)

export const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[^a-z0-9&]+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w))

export type Index = { passages: Passage[]; tokens: string[][]; df: Map<string, number>; avg: number }

export function index(passages: Passage[]): Index {
  const tokens = passages.map((p) => words(`${p.title} ${p.title} ${p.text}`))
  const df = new Map<string, number>()
  for (const t of tokens) for (const w of new Set(t)) df.set(w, (df.get(w) ?? 0) + 1)
  const avg = tokens.reduce((n, t) => n + t.length, 0) / Math.max(1, tokens.length)
  return { passages, tokens, df, avg }
}

/** The passages that best match the question, best first. */
export function search(ix: Index, question: string, k = 6): Passage[] {
  const q = [...new Set(words(question))]
  if (!q.length) return []
  const N = ix.passages.length
  const scored = ix.tokens.map((t, i) => {
    const tf = new Map<string, number>()
    for (const w of t) tf.set(w, (tf.get(w) ?? 0) + 1)
    let score = 0
    for (const w of q) {
      const f = tf.get(w)
      if (!f) continue
      const idf = Math.log(1 + (N - (ix.df.get(w) ?? 0) + 0.5) / ((ix.df.get(w) ?? 0) + 0.5))
      score += (idf * f * 2.2) / (f + 1.2 * (0.25 + 0.75 * (t.length / ix.avg)))
    }
    // the team's own answers win ties
    if (score > 0 && ix.passages[i].id.startsWith('taught-')) score *= 1.5
    return { i, score }
  })
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((s) => ix.passages[s.i])
}
