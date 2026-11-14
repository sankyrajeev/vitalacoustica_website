// The Acoustica Edit: the weekly newsletter. Subscribers are kept in the site's own database (D1,
// migrations/0007_newsletter.sql), with double opt-in: nobody is on the list until they click the
// link in the confirmation email.
//
//   POST /api/newsletter                     { email, consent: true }  → sends a confirmation email
//   GET  /api/newsletter/confirm?t=…         the link in that email    → confirmed, back to /blog
//   GET  /api/newsletter/unsubscribe?t=…     the link in every edition → /blog asks "leave?"
//   POST /api/newsletter/unsubscribe?t=…     unsubscribes (that button, and one-click from mail apps)
//
// Links carry each subscriber's random token, never the address, so nobody can confirm or
// unsubscribe someone else. The answer to a sign-up is the same whether or not the address is
// already on the list, so the form can't be used to find out who subscribes. A repeat sign-up
// within 15 minutes sends nothing. Opening an unsubscribe link only asks; the button unsubscribes,
// so mail scanners that open links can't unsubscribe anyone by accident.
//
// Every Monday the daily cron (worker/index.ts) makes the week's edition from the posts that went
// up in the last seven days, and sends it. At most NEWSLETTER_DAILY_LIMIT emails go a day (default
// 80, inside Resend's free 100 a day with room for account emails); a larger list is finished on
// the following days.
//
// Environment: DB, RESEND_API_KEY and ENQUIRY_FROM (all already set). Optional: NEWSLETTER_FROM
// (another sender), NEWSLETTER_DAILY_LIMIT. Without a database, sign-up answers 503 and the form
// says the newsletter opens soon.

import type { D1Database } from './accounts/db.ts'
import { ensureSchema } from './accounts/migrate.ts'
import { newsletterConfirm, newsletterDigest, type DigestItem, type Mail } from './emails.ts'
import { BRAND } from './enquiry.ts'

export type NewsletterEnv = {
  DB?: D1Database
  RESEND_API_KEY?: string
  NEWSLETTER_FROM?: string
  NEWSLETTER_DAILY_LIMIT?: string
  ENQUIRY_FROM?: string
  SITE_URL?: string
  DEV_EMAIL_LOG?: string
}

/** What the newsletter needs to know about a post. */
export type Post = { slug: string; title: string; excerpt: string; category: string; publishAt: string }

type Subscriber = {
  email: string
  token: string
  status: 'pending' | 'active' | 'unsubscribed'
  confirm_sent_at: number | null
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const CONFIRM_DAYS = 7
const THROTTLE = 15 * 60
const DAY = 86400

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

const sender = (env: NewsletterEnv) => env.NEWSLETTER_FROM || env.ENQUIRY_FROM
const canSend = (env: NewsletterEnv) => env.DEV_EMAIL_LOG === '1' || !!(env.RESEND_API_KEY && sender(env))
const site = (env: NewsletterEnv, request?: Request) => (env.SITE_URL || (request ? new URL(request.url).origin : 'https://vitalacoustica.com')).replace(/\/$/, '')
const seconds = (ms = Date.now()) => Math.floor(ms / 1000)
const brand = (base: string) => ({ ...BRAND, site: base })

function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

const unsubscribeLink = (base: string, token: string) => `${base}/api/newsletter/unsubscribe?t=${encodeURIComponent(token)}`

type Outgoing = { to: string; mail: Mail; unsubscribe?: string }

/** Sends up to 100 emails in one request (Resend's batch endpoint). */
async function send(env: NewsletterEnv, list: Outgoing[]) {
  if (!list.length) return
  if (env.DEV_EMAIL_LOG === '1') {
    for (const m of list) console.log(`[email to ${m.to}] ${m.mail.subject}\n${m.mail.text}`)
    return
  }
  const from = sender(env)
  if (!env.RESEND_API_KEY || !from) throw new Error('email is not configured (RESEND_API_KEY, ENQUIRY_FROM)')
  const res = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(
      list.map((m) => ({
        from,
        to: [m.to],
        subject: m.mail.subject,
        html: m.mail.html,
        text: m.mail.text,
        // the unsubscribe button mail apps show beside the sender (RFC 8058)
        ...(m.unsubscribe ? { headers: { 'List-Unsubscribe': `<${m.unsubscribe}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } } : {}),
      })),
    ),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
}

async function database(env: NewsletterEnv) {
  if (!env.DB) return null
  await ensureSchema(env.DB)
  return env.DB
}

/* ─────────────── Sign-up, confirm, unsubscribe ─────────────── */

/** POST /api/newsletter */
export async function subscribe(request: Request, env: NewsletterEnv): Promise<Response> {
  if (!env.DB || !canSend(env)) return json({ error: 'not_configured' }, 503)
  let raw: Record<string, unknown>
  try {
    raw = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'invalid_request' }, 400)
  }
  const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : ''
  if (!EMAIL.test(email) || email.length > 254) return json({ error: 'invalid_email' }, 400)
  if (raw.consent !== true) return json({ error: 'consent_required' }, 400)
  // the hidden field real people never fill in: say thanks, do nothing
  if (typeof raw.website === 'string' && raw.website) return json({ status: 'pending' })

  try {
    const db = (await database(env))!
    const t = seconds()
    const row = await db.prepare('SELECT email, token, status, confirm_sent_at FROM newsletter_subscribers WHERE email = ?').bind(email).first<Subscriber>()
    // already on the list, or a confirmation went a moment ago: nothing to send
    if (row?.status === 'active') return json({ status: 'pending' })
    if (row?.status === 'pending' && row.confirm_sent_at && t - row.confirm_sent_at < THROTTLE) return json({ status: 'pending' })

    let token = row?.token ?? newToken()
    if (!row) {
      await db
        .prepare("INSERT INTO newsletter_subscribers (email, token, status, created_at, confirm_sent_at) VALUES (?, ?, 'pending', ?, ?)")
        .bind(email, token, t, t)
        .run()
    } else if (row.status === 'unsubscribed') {
      // coming back: a new token, so links from before they left stop working
      token = newToken()
      await db
        .prepare("UPDATE newsletter_subscribers SET token = ?, status = 'pending', confirm_sent_at = ?, confirmed_at = NULL WHERE email = ?")
        .bind(token, t, email)
        .run()
    } else {
      await db.prepare('UPDATE newsletter_subscribers SET confirm_sent_at = ? WHERE email = ?').bind(t, email).run()
    }
    const base = site(env, request)
    await send(env, [{ to: email, mail: newsletterConfirm(brand(base), `${base}/api/newsletter/confirm?t=${encodeURIComponent(token)}`) }])
    return json({ status: 'pending' })
  } catch (err) {
    console.error('newsletter: sign-up failed', err)
    return json({ error: 'send_failed' }, 502)
  }
}

const back = (base: string, state: string, token = '') =>
  Response.redirect(`${base}/blog?edit=${state}${token ? `&t=${encodeURIComponent(token)}` : ''}#the-acoustica-edit`, 303)

const byToken = (db: D1Database, token: string) =>
  db.prepare('SELECT email, token, status, confirm_sent_at FROM newsletter_subscribers WHERE token = ?').bind(token).first<Subscriber>()

/** GET /api/newsletter/confirm */
export async function confirm(request: Request, env: NewsletterEnv): Promise<Response> {
  const base = site(env, request)
  const token = new URL(request.url).searchParams.get('t') ?? ''
  try {
    const db = await database(env)
    if (!db) return back(base, 'error')
    const row = token ? await byToken(db, token) : null
    if (row?.status === 'active') return back(base, 'confirmed')
    if (row?.status !== 'pending' || !row.confirm_sent_at || seconds() - row.confirm_sent_at > CONFIRM_DAYS * DAY) return back(base, 'expired')
    await db.prepare("UPDATE newsletter_subscribers SET status = 'active', confirmed_at = ? WHERE token = ?").bind(seconds(), token).run()
    return back(base, 'confirmed')
  } catch (err) {
    console.error('newsletter: confirm failed', err)
    return back(base, 'error')
  }
}

/** GET (asks first) or POST (unsubscribes) /api/newsletter/unsubscribe */
export async function unsubscribe(request: Request, env: NewsletterEnv): Promise<Response> {
  const base = site(env, request)
  const token = new URL(request.url).searchParams.get('t') ?? ''
  if (request.method !== 'POST') return back(base, token ? 'leave' : 'error', token)
  try {
    const db = await database(env)
    if (!db) return json({ error: 'not_configured' }, 503)
    const row = token ? await byToken(db, token) : null
    if (!row) return json({ error: 'invalid_link' }, 400)
    if (row.status !== 'unsubscribed')
      await db.prepare("UPDATE newsletter_subscribers SET status = 'unsubscribed', unsubscribed_at = ? WHERE token = ?").bind(seconds(), token).run()
    return json({ status: 'unsubscribed' })
  } catch (err) {
    console.error('newsletter: unsubscribe failed', err)
    return json({ error: 'failed' }, 502)
  }
}

/* ─────────────── The weekly edition ─────────────── */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const day = (ms: number) => {
  const d = new Date(ms)
  return { d: d.getUTCDate(), m: MONTHS[d.getUTCMonth()], y: d.getUTCFullYear() }
}
const longDate = (ms: number) => {
  const { d, m, y } = day(ms)
  return `${d} ${m} ${y}`
}

/** "9 – 15 November 2026": the seven days before `now`. */
export function weekLabel(now: number) {
  const a = day(now - 7 * DAY * 1000)
  const b = day(now - DAY * 1000)
  if (a.y !== b.y) return `${a.d} ${a.m} ${a.y} – ${b.d} ${b.m} ${b.y}`
  if (a.m !== b.m) return `${a.d} ${a.m} – ${b.d} ${b.m} ${b.y}`
  return `${a.d} – ${b.d} ${b.m} ${b.y}`
}

/** The ISO week of a time, e.g. 2026-W47: the edition's id. */
export function isoWeek(now: number) {
  const d = new Date(now)
  const date = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  const weekday = (d.getUTCDay() + 6) % 7 // Monday 0
  const thursday = new Date(date - weekday * DAY * 1000 + 3 * DAY * 1000)
  const jan1 = Date.UTC(thursday.getUTCFullYear(), 0, 1)
  const week = Math.floor((thursday.getTime() - jan1) / (7 * DAY * 1000)) + 1
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/** The posts that went up in the seven days before `now`, newest first. */
export function weekPosts(posts: Post[], now: number) {
  return posts
    .filter((p) => {
      const t = Date.parse(p.publishAt)
      return t <= now && t > now - 7 * DAY * 1000
    })
    .sort((a, b) => Date.parse(b.publishAt) - Date.parse(a.publishAt))
}

const digestItems = (base: string, posts: Post[]): DigestItem[] =>
  posts.map((p) => ({ title: p.title, excerpt: p.excerpt, category: p.category, url: `${base}/blog/${p.slug}`, date: longDate(Date.parse(p.publishAt)) }))

type Stored = { label: string; posts: Post[] }

/** The week's edition as one subscriber gets it. */
export const editionMail = (base: string, stored: Stored, token: string) =>
  newsletterDigest(brand(base), { week: stored.label, items: digestItems(base, stored.posts), unsubscribe: unsubscribeLink(base, token) })

const dailyLimit = (env: NewsletterEnv) => {
  const n = Number(env.NEWSLETTER_DAILY_LIMIT)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 80
}

/**
 * Run once a day by the cron: on Mondays, makes the week's edition (if it hasn't been made);
 * every day, sends any edition still going out, within the day's allowance.
 */
export async function runNewsletter(env: NewsletterEnv, db: D1Database, posts: Post[], now = Date.now()) {
  let created: string | null = null
  if (new Date(now).getUTCDay() === 1) {
    const id = isoWeek(now)
    if (!(await db.prepare('SELECT id FROM newsletter_editions WHERE id = ?').bind(id).first())) {
      const list = weekPosts(posts, now).map(({ slug, title, excerpt, category, publishAt }) => ({ slug, title, excerpt, category, publishAt }))
      const label = weekLabel(now)
      await db
        .prepare('INSERT INTO newsletter_editions (id, subject, items, status, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(id, `The Acoustica Edit: ${label}`, JSON.stringify({ label, posts: list } satisfies Stored), list.length ? 'sending' : 'empty', seconds(now))
        .run()
      created = id
    }
  }

  let sent = 0
  if (!canSend(env)) return { created, sent }
  const base = site(env)
  const startOfDay = seconds(now) - (seconds(now) % DAY)
  const editions = (await db.prepare("SELECT id, items FROM newsletter_editions WHERE status = 'sending' ORDER BY created_at").all<{ id: string; items: string }>()).results
  for (const ed of editions) {
    const today = (await db.prepare('SELECT COUNT(*) AS n FROM newsletter_subscribers WHERE last_sent_at >= ?').bind(startOfDay).first<{ n: number }>())?.n ?? 0
    const budget = dailyLimit(env) - today
    if (budget <= 0) break
    const stored = JSON.parse(ed.items) as Stored
    const due = (
      await db
        .prepare("SELECT email, token FROM newsletter_subscribers WHERE status = 'active' AND (last_edition IS NULL OR last_edition <> ?) ORDER BY confirmed_at LIMIT ?")
        .bind(ed.id, budget)
        .all<{ email: string; token: string }>()
    ).results
    for (let i = 0; i < due.length; i += 100) {
      const chunk = due.slice(i, i + 100)
      await send(
        env,
        chunk.map((s) => ({ to: s.email, mail: editionMail(base, stored, s.token), unsubscribe: unsubscribeLink(base, s.token) })),
      )
      const t = seconds(now)
      await db.batch([
        ...chunk.map((s) => db.prepare('UPDATE newsletter_subscribers SET last_edition = ?, last_sent_at = ? WHERE email = ?').bind(ed.id, t, s.email)),
        db.prepare('UPDATE newsletter_editions SET sent = sent + ? WHERE id = ?').bind(chunk.length, ed.id),
      ])
      sent += chunk.length
    }
    const left = await db
      .prepare("SELECT 1 FROM newsletter_subscribers WHERE status = 'active' AND (last_edition IS NULL OR last_edition <> ?) LIMIT 1")
      .bind(ed.id)
      .first()
    if (!left) await db.prepare("UPDATE newsletter_editions SET status = 'sent', finished_at = ? WHERE id = ?").bind(seconds(now), ed.id).run()
  }
  return { created, sent }
}

/* ─────────────── For the admin page ─────────────── */

// The Worker hands over the blog's posts at start-up (worker/index.ts); kept out of this file so
// the tests can load it without the build's generated data.
let postSource: () => Post[] = () => []
export const setPostSource = (fn: () => Post[]) => {
  postSource = fn
}

export async function newsletterOverview(env: NewsletterEnv, db: D1Database) {
  const counts = (await db.prepare('SELECT status, COUNT(*) AS n FROM newsletter_subscribers GROUP BY status').all<{ status: string; n: number }>()).results
  const editions = (
    await db.prepare('SELECT id, subject, status, sent, created_at, finished_at, items FROM newsletter_editions ORDER BY created_at DESC LIMIT 8').all<{
      id: string
      subject: string
      status: string
      sent: number
      created_at: number
      finished_at: number | null
      items: string
    }>()
  ).results.map(({ items, ...e }) => ({ ...e, posts: (JSON.parse(items) as Stored).posts.length }))
  const by = Object.fromEntries(counts.map((c) => [c.status, c.n]))
  return { subscribers: { active: by.active ?? 0, pending: by.pending ?? 0, unsubscribed: by.unsubscribed ?? 0 }, editions, dailyLimit: dailyLimit(env) }
}

/** This week's edition so far (or the latest posts, if none went up this week), sent only to `to`. */
export async function sendTestEdition(env: NewsletterEnv, to: string, base: string, now = Date.now()) {
  const all = postSource()
  let posts = weekPosts(all, now)
  if (!posts.length) posts = [...all].sort((a, b) => Date.parse(b.publishAt) - Date.parse(a.publishAt)).slice(0, 5)
  const stored: Stored = { label: weekLabel(now), posts }
  const mail = editionMail(base, stored, 'test-only')
  await send(env, [{ to, mail: { ...mail, subject: `[Test] ${mail.subject}` } }])
  return posts.length
}

