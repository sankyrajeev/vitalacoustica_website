// The owner's admin page (/account/admin): beta keys, testers and their feedback. Only signed-in,
// verified accounts whose email is in ADMIN_EMAILS can use these routes; everyone else gets 404.
//
//   GET  /api/admin/beta              testers: keys, devices, terms, last seen, version, sessions
//   GET  /api/admin/feedback          reports, newest first (?crash=1 for crashes only), without logs
//   GET  /api/admin/feedback/item     one report with its logs (?id=)
//   POST /api/admin/beta/issue        { email, name?, expires, note?, send? } → a beta key (and the invitation)
//   POST /api/admin/beta/revoke       { key }

import { betaInvite } from '../emails.ts'
import type { User } from './auth.ts'
import { json, now, readJson, siteUrl, type AccountsEnv, type D1Database } from './db.ts'
import { newLicenceKey, normaliseKey } from './licence.ts'
import { brand, sendMail } from './mail.ts'
import { PRODUCTS } from './products.ts'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

export const isAdmin = (env: AccountsEnv, user: User | null) =>
  !!user?.email_verified &&
  (env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(user.email)

async function testers(db: D1Database) {
  const keys = (
    await db
      .prepare(
        `SELECT l.key, l.product, l.email, l.note, l.expires, l.revoked, l.created_at,
                COUNT(a.machine) AS devices, MAX(a.terms_accepted) AS terms_accepted, MAX(a.terms_version) AS terms_version
         FROM licences l LEFT JOIN activations a ON a.key = l.key
         WHERE l.edition = 'Beta' GROUP BY l.key ORDER BY l.created_at DESC`,
      )
      .all<{ key: string; product: string; email: string; note: string | null; expires: string | null; revoked: number; created_at: number; devices: number; terms_accepted: string | null; terms_version: string | null }>()
  ).results
  const seen = (
    await db
      .prepare(
        `SELECT p.key, MAX(p.last_seen) AS last_seen, SUM(p.sessions) AS sessions,
                (SELECT version FROM pings q WHERE q.key = p.key ORDER BY q.last_seen DESC LIMIT 1) AS version
         FROM pings p GROUP BY p.key`,
      )
      .all<{ key: string; last_seen: number; sessions: number; version: string | null }>()
  ).results
  const reports = (await db.prepare('SELECT key, COUNT(*) AS n, SUM(crash) AS crashes FROM feedback GROUP BY key').all<{ key: string | null; n: number; crashes: number }>()).results
  return keys.map((k) => {
    const s = seen.find((x) => x.key === k.key)
    const f = reports.find((x) => x.key === k.key)
    return {
      key: k.key,
      product: k.product,
      email: k.email,
      note: k.note,
      expires: k.expires,
      revoked: !!k.revoked,
      created: k.created_at,
      devices: k.devices,
      termsAccepted: k.terms_accepted,
      termsVersion: k.terms_version,
      lastSeen: s?.last_seen ?? null,
      version: s?.version ?? null,
      sessions: s?.sessions ?? 0,
      feedback: f?.n ?? 0,
      crashes: f?.crashes ?? 0,
    }
  })
}

async function issue(request: Request, env: AccountsEnv, db: D1Database) {
  const body = await readJson<{ email?: string; name?: string; expires?: string; note?: string; send?: boolean }>(request)
  const email = (body?.email || '').trim().toLowerCase()
  const expires = (body?.expires || '').trim()
  if (!EMAIL.test(email)) return json({ error: 'invalid_email' }, 400)
  if (!DATE.test(expires) || expires <= new Date().toISOString().slice(0, 10)) return json({ error: 'invalid_expiry' }, 400)
  const product = PRODUCTS.vanta
  const key = newLicenceKey(product.keyPrefix)
  const name = (body?.name || '').trim().slice(0, 80)
  const note = [name, (body?.note || '').trim()].filter(Boolean).join(' · ').slice(0, 300) || null
  // if the tester already has a verified account, the key goes straight into it; otherwise it joins
  // the account they make with this email
  const user = await db.prepare('SELECT id FROM users WHERE email = ? AND email_verified = 1').bind(email).first<{ id: string }>()
  await db
    .prepare('INSERT INTO licences (key, product, user_id, email, edition, max_devices, expires, note, created_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)')
    .bind(key, product.id, user?.id ?? null, email, 'Beta', expires, note, now())
    .run()
  let sent = false
  if (body?.send) {
    const site = siteUrl(env, request)
    const until = new Date(`${expires}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    try {
      await sendMail(
        env,
        email,
        betaInvite(brand(site), { product: product.name, name, key, expires: until, download: `${site}/account`, guide: env.BETA_GUIDE_URL || undefined }),
        env.BETA_REPLY_TO || 'beta@vitalacoustica.com',
      )
      sent = true
    } catch (e) {
      console.error('beta invite', e)
    }
  }
  return json({ key, sent })
}

async function revoke(request: Request, db: D1Database) {
  const key = normaliseKey(String((await readJson<{ key?: string }>(request))?.key ?? ''))
  const res = await db.prepare('UPDATE licences SET revoked = 1 WHERE key = ?').bind(key).run()
  if (!res.meta.changes) return json({ error: 'not_found' }, 404)
  await db.prepare('DELETE FROM activations WHERE key = ?').bind(key).run()
  return json({ status: 'revoked' })
}

export async function handleAdmin(request: Request, env: AccountsEnv, db: D1Database, user: User | null, pathname: string) {
  if (!isAdmin(env, user)) return json({ error: 'not_found' }, 404)
  const url = new URL(request.url)
  if (request.method === 'GET') {
    if (pathname === '/api/admin/beta') return json({ testers: await testers(db) })
    if (pathname === '/api/admin/feedback') {
      const crash = url.searchParams.get('crash') === '1'
      const rows = (
        await db
          .prepare(
            `SELECT id, received_at, product, key, machine, type, email, crash, message, system, LENGTH(logs) AS log_size FROM feedback
             ${crash ? 'WHERE crash = 1' : ''} ORDER BY received_at DESC LIMIT 300`,
          )
          .all()
      ).results
      return json({ feedback: rows })
    }
    if (pathname === '/api/admin/feedback/item') {
      const row = await db.prepare('SELECT * FROM feedback WHERE id = ?').bind(Number(url.searchParams.get('id'))).first()
      return row ? json({ item: row }) : json({ error: 'not_found' }, 404)
    }
  }
  if (request.method === 'POST') {
    if (pathname === '/api/admin/beta/issue') return issue(request, env, db)
    if (pathname === '/api/admin/beta/revoke') return revoke(request, db)
  }
  return json({ error: 'not_found' }, 404)
}
