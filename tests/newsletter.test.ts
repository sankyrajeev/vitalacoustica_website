// The Acoustica Edit, the weekly newsletter: double opt-in, unsubscribing, and the Monday edition
// sent within the daily email allowance. The database is an in-memory SQLite standing in for D1,
// with the real migrations; emails are printed nowhere and captured here. Run with `npm test`.

import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { beforeEach, test } from 'node:test'
import type { D1Database, D1PreparedStatement } from '../server/accounts/db.ts'
import { ensureSchema, resetSchemaCheck } from '../server/accounts/migrate.ts'
import { confirm, isoWeek, runNewsletter, subscribe, unsubscribe, weekLabel, weekPosts, type NewsletterEnv, type Post } from '../server/newsletter.ts'

function d1(): D1Database {
  const db = new DatabaseSync(':memory:')
  const statement = (sql: string, args: unknown[] = []): D1PreparedStatement => ({
    bind: (...values) => statement(sql, values),
    first: async <T,>() => ((r) => (r ? { ...r } : null))(db.prepare(sql).get(...(args as never[])) as object | undefined) as T | null,
    all: async <T,>() => ({ results: (db.prepare(sql).all(...(args as never[])) as object[]).map((r) => ({ ...r })) as T[] }),
    run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...(args as never[])).changes) } }),
  })
  return {
    prepare: (sql) => statement(sql),
    batch: async (statements) => {
      db.exec('BEGIN')
      try {
        const out = []
        for (const s of statements) out.push(await s.run())
        db.exec('COMMIT')
        return out
      } catch (e) {
        db.exec('ROLLBACK')
        throw e
      }
    },
  }
}

const SITE = 'https://vitalacoustica.com'
type Sent = { to: string; subject: string; text: string; headers?: Record<string, string> }
let sent: Sent[] = []
let env: NewsletterEnv & { DB: D1Database }

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input)
  assert.equal(url, 'https://api.resend.com/emails/batch')
  const list = JSON.parse(String(init?.body)) as { to: string[]; subject: string; text: string; headers?: Record<string, string> }[]
  assert.ok(list.length <= 100, 'Resend takes at most 100 emails per batch')
  for (const m of list) sent.push({ to: m.to[0], subject: m.subject, text: m.text, headers: m.headers })
  return new Response(JSON.stringify({ data: list.map((_, i) => ({ id: String(i) })) }))
}) as typeof fetch

beforeEach(async () => {
  resetSchemaCheck()
  sent = []
  env = { DB: d1(), RESEND_API_KEY: 're_test', ENQUIRY_FROM: 'Vital Acoustica <hello@vitalacoustica.com>', SITE_URL: SITE }
  await ensureSchema(env.DB)
})

const signUp = (email: string, extra: Record<string, unknown> = {}) =>
  subscribe(new Request(`${SITE}/api/newsletter`, { method: 'POST', body: JSON.stringify({ email, consent: true, ...extra }) }), env)
const linkIn = (m: Sent | undefined, path: string) => {
  const link = m?.text.match(new RegExp(`${SITE}${path}\\S+`))?.[0]
  assert.ok(link, `no ${path} link in the email`)
  return link
}
const status = async (email: string) =>
  (await env.DB.prepare('SELECT status FROM newsletter_subscribers WHERE email = ?').bind(email).first<{ status: string }>())?.status
const location = (r: Response) => r.headers.get('Location') ?? ''

test('without a database, sign-up says it opens soon and saves nothing', async () => {
  const r = await subscribe(new Request(`${SITE}/api/newsletter`, { method: 'POST', body: JSON.stringify({ email: 'a@example.com', consent: true }) }), {})
  assert.equal(r.status, 503)
  assert.equal(sent.length, 0)
})

test('sign-up needs a real address and consent; the hidden field catches bots', async () => {
  assert.equal((await subscribe(new Request(`${SITE}/api/newsletter`, { method: 'POST', body: JSON.stringify({ email: 'nope', consent: true }) }), env)).status, 400)
  assert.equal((await subscribe(new Request(`${SITE}/api/newsletter`, { method: 'POST', body: JSON.stringify({ email: 'a@example.com' }) }), env)).status, 400)
  assert.equal((await signUp('bot@example.com', { website: 'spam.example' })).status, 200)
  assert.equal(sent.length, 0)
  assert.equal(await status('bot@example.com'), undefined)
})

test('double opt-in: nobody is on the list until they click', async () => {
  assert.equal((await signUp('Reader@Example.com')).status, 200)
  assert.equal(await status('reader@example.com'), 'pending')
  assert.equal(sent.length, 1)
  assert.match(sent[0].subject, /Confirm/)
  assert.ok(!sent[0].text.includes('reader@example.com'), 'links carry a token, not the address')

  // asking again straight away sends nothing more
  await signUp('reader@example.com')
  assert.equal(sent.length, 1)

  const r = await confirm(new Request(linkIn(sent[0], '/api/newsletter/confirm')), env)
  assert.equal(r.status, 303)
  assert.match(location(r), /\/blog\?edit=confirmed/)
  assert.equal(await status('reader@example.com'), 'active')

  // already subscribed: the same answer, no email (so the form can't reveal who subscribes)
  assert.equal((await signUp('reader@example.com')).status, 200)
  assert.equal(sent.length, 1)
})

test('a made-up or old confirmation link does nothing', async () => {
  const r = await confirm(new Request(`${SITE}/api/newsletter/confirm?t=made-up`), env)
  assert.match(location(r), /edit=expired/)
  await signUp('late@example.com')
  await env.DB.prepare('UPDATE newsletter_subscribers SET confirm_sent_at = confirm_sent_at - 8 * 86400').run()
  assert.match(location(await confirm(new Request(linkIn(sent[0], '/api/newsletter/confirm')), env)), /edit=expired/)
  assert.equal(await status('late@example.com'), 'pending')
})

async function subscriber(email: string) {
  sent = []
  await signUp(email)
  await confirm(new Request(linkIn(sent[0], '/api/newsletter/confirm')), env)
  sent = []
}

// Monday 16 November 2026, 03:17 UTC: when the cron runs
const MONDAY = Date.parse('2026-11-16T03:17:00Z')
const post = (slug: string, publishAt: string, category = 'Daily Roundup'): Post => ({ slug, title: `Title ${slug}`, excerpt: `About ${slug}.`, category, publishAt })
const POSTS = [
  post('roundup-2026-11-16', '2026-11-16T07:00:00+05:30'),
  post('roundup-2026-11-12', '2026-11-12T07:00:00+05:30'),
  post('a-guide', '2026-11-10T09:00:00+05:30', 'Guides & Insights'),
  post('last-week', '2026-11-09T07:00:00+05:30'), // sent in the week before
  post('next-week', '2026-11-20T09:00:00+05:30'), // not out yet
]

test('the edition covers the seven days before Monday morning, newest first', () => {
  assert.deepEqual(
    weekPosts(POSTS, MONDAY).map((p) => p.slug),
    ['roundup-2026-11-16', 'roundup-2026-11-12', 'a-guide'],
  )
  assert.equal(weekLabel(MONDAY), '9 – 15 November 2026')
  assert.equal(isoWeek(MONDAY), '2026-W47')
  assert.equal(isoWeek(Date.parse('2027-01-01T03:17:00Z')), '2026-W53')
})

test('Monday: the week’s edition goes to every subscriber, once, with a one-click unsubscribe', async () => {
  await subscriber('one@example.com')
  await subscriber('two@example.com')
  await signUp('unconfirmed@example.com')
  sent = []

  // not on other days
  assert.deepEqual(await runNewsletter(env, env.DB, POSTS, MONDAY - 86400e3), { created: null, sent: 0 })

  const r = await runNewsletter(env, env.DB, POSTS, MONDAY)
  assert.deepEqual(r, { created: '2026-W47', sent: 2 })
  assert.deepEqual(sent.map((m) => m.to).sort(), ['one@example.com', 'two@example.com'])
  const m = sent[0]
  assert.equal(m.subject, 'The Acoustica Edit: 9 – 15 November 2026')
  assert.ok(m.text.includes(`${SITE}/blog/roundup-2026-11-12`) && m.text.includes(`${SITE}/blog/a-guide`))
  assert.ok(!m.text.includes('last-week') && !m.text.includes('next-week'))
  assert.equal(m.headers?.['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click')
  assert.match(m.headers?.['List-Unsubscribe'] ?? '', /^<https:\/\/vitalacoustica\.com\/api\/newsletter\/unsubscribe\?t=/)

  // the same day again (or a retry): nobody gets it twice
  assert.deepEqual(await runNewsletter(env, env.DB, POSTS, MONDAY + 3600e3), { created: null, sent: 0 })
  assert.equal(sent.length, 2)
  const ed = await env.DB.prepare('SELECT status, sent FROM newsletter_editions WHERE id = ?').bind('2026-W47').first<{ status: string; sent: number }>()
  assert.deepEqual(ed, { status: 'sent', sent: 2 })
})

test('a quiet week sends nothing', async () => {
  await subscriber('one@example.com')
  assert.deepEqual(await runNewsletter(env, env.DB, [post('old', '2026-10-01T09:00:00+05:30')], MONDAY), { created: '2026-W47', sent: 0 })
  assert.equal(sent.length, 0)
})

test('a long list is spread over several days, within the daily allowance', async () => {
  env.NEWSLETTER_DAILY_LIMIT = '3'
  for (let i = 0; i < 7; i++) await subscriber(`reader${i}@example.com`)
  assert.equal((await runNewsletter(env, env.DB, POSTS, MONDAY)).sent, 3)
  assert.equal((await runNewsletter(env, env.DB, POSTS, MONDAY + 600e3)).sent, 0, 'the day’s allowance is used up')
  assert.equal((await runNewsletter(env, env.DB, POSTS, MONDAY + 86400e3)).sent, 3)
  assert.equal((await runNewsletter(env, env.DB, POSTS, MONDAY + 2 * 86400e3)).sent, 1)
  assert.equal(new Set(sent.map((m) => m.to)).size, 7, 'everyone got it once')
  const ed = await env.DB.prepare('SELECT status FROM newsletter_editions').first<{ status: string }>()
  assert.equal(ed?.status, 'sent')
})

test('unsubscribe: opening the link only asks; the button (or the mail app) unsubscribes', async () => {
  await subscriber('leaving@example.com')
  await runNewsletter(env, env.DB, POSTS, MONDAY)
  const link = linkIn(sent[0], '/api/newsletter/unsubscribe')

  const opened = await unsubscribe(new Request(link), env)
  assert.match(location(opened), /\/blog\?edit=leave&t=/)
  assert.equal(await status('leaving@example.com'), 'active', 'a mail scanner opening the link changes nothing')

  const r = await unsubscribe(new Request(link, { method: 'POST', body: 'List-Unsubscribe=One-Click' }), env)
  assert.equal(r.status, 200)
  assert.equal(await status('leaving@example.com'), 'unsubscribed')
  assert.equal((await unsubscribe(new Request(`${SITE}/api/newsletter/unsubscribe?t=made-up`, { method: 'POST' }), env)).status, 400)

  // next week they get nothing
  sent = []
  await runNewsletter(env, env.DB, [post('later', '2026-11-20T09:00:00+05:30')], MONDAY + 7 * 86400e3)
  assert.equal(sent.length, 0)

  // signing up again needs a fresh confirmation, and the old link stops working
  await signUp('leaving@example.com')
  assert.equal(await status('leaving@example.com'), 'pending')
  assert.equal((await unsubscribe(new Request(link, { method: 'POST' }), env)).status, 400)
})
