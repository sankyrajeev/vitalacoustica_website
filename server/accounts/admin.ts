// The owner's admin page (/account/admin): beta keys, testers and their feedback. Only signed-in,
// verified accounts whose email is in ADMIN_EMAILS can use these routes; everyone else gets 404.
//
//   GET  /api/admin/beta              testers: keys, devices, terms, last seen, version, sessions
//   GET  /api/admin/feedback          reports, newest first (?crash=1 for crashes only), without logs
//   GET  /api/admin/feedback/item     one report with its logs (?id=)
//   POST /api/admin/beta/issue        { email, name?, expires, note?, send? } → a beta key (and the invitation)
//   POST /api/admin/beta/revoke       { key }
//   GET  /api/admin/beta/requests     people who asked to join the beta (?status=pending|approved|declined)
//   POST /api/admin/beta/approve      { id, expires } → a beta key and the invitation, to the person who asked
//   POST /api/admin/beta/decline      { id }
//   GET  /api/admin/launch            how many wait for each product ("Tell me when it's out")
//   POST /api/admin/launch/send       { product }: email them all that it's out

import { accountReset, accountVerify, betaInvite, betaRequestReceived, launchAlertOut, launchAlertSaved, leaseReminder, licenceDelivery, type Mail } from '../emails.ts'
import type { User } from './auth.ts'
import { newsletterOverview, sendTestEdition } from '../newsletter.ts'
import { json, now, readJson, siteUrl, type AccountsEnv, type D1Database } from './db.ts'
import { newLicenceKey, normaliseKey } from './licence.ts'
import { brand, sendMail } from './mail.ts'
import { launchAlertCounts, sendLaunch } from './launch.ts'
import { PRODUCTS } from './products.ts'
import { setupStatus } from './status.ts'

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

/** Makes a beta key for a tester and, if asked, emails them the invitation. */
export async function issueBetaKey(
  env: AccountsEnv,
  db: D1Database,
  site: string,
  t: { email: string; name: string; expires: string; note: string; send: boolean },
) {
  const product = PRODUCTS.vanta
  const key = newLicenceKey(product.keyPrefix)
  const note = [t.name, t.note].filter(Boolean).join(' · ').slice(0, 300) || null
  // if the tester already has a verified account, the key goes straight into it; otherwise it joins
  // the account they make with this email
  const user = await db.prepare('SELECT id FROM users WHERE email = ? AND email_verified = 1').bind(t.email).first<{ id: string }>()
  await db
    .prepare('INSERT INTO licences (key, product, user_id, email, edition, max_devices, expires, note, created_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)')
    .bind(key, product.id, user?.id ?? null, t.email, 'Beta', t.expires, note, now())
    .run()
  let sent = false
  if (t.send) {
    const until = new Date(`${t.expires}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    try {
      await sendMail(
        env,
        t.email,
        betaInvite(brand(site), { product: product.name, name: t.name, key, expires: until, download: `${site}/account`, guide: env.BETA_GUIDE_URL || undefined }),
        env.BETA_REPLY_TO || 'beta@vitalacoustica.com',
      )
      sent = true
    } catch (e) {
      console.error('beta invite', e)
    }
  }
  return { key, sent }
}

const validExpiry = (d: string) => DATE.test(d) && d > new Date().toISOString().slice(0, 10)

async function issue(request: Request, env: AccountsEnv, db: D1Database) {
  const body = await readJson<{ email?: string; name?: string; expires?: string; note?: string; send?: boolean }>(request)
  const email = (body?.email || '').trim().toLowerCase()
  const expires = (body?.expires || '').trim()
  if (!EMAIL.test(email)) return json({ error: 'invalid_email' }, 400)
  if (!validExpiry(expires)) return json({ error: 'invalid_expiry' }, 400)
  const t = { email, name: (body?.name || '').trim().slice(0, 80), expires, note: (body?.note || '').trim(), send: !!body?.send }
  return json(await issueBetaKey(env, db, siteUrl(env, request), t))
}

type BetaRequest = { id: number; product: string; email: string; name: string | null; about: string | null; system: string | null; daw: string | null; status: string; licence_key: string | null; created_at: number; decided_at: number | null }

async function approve(request: Request, env: AccountsEnv, db: D1Database) {
  const body = await readJson<{ id?: number; expires?: string }>(request)
  const expires = (body?.expires || '').trim()
  if (!validExpiry(expires)) return json({ error: 'invalid_expiry' }, 400)
  const r = await db.prepare("SELECT * FROM beta_requests WHERE id = ? AND status = 'pending'").bind(Number(body?.id)).first<BetaRequest>()
  if (!r) return json({ error: 'not_found' }, 404)
  const result = await issueBetaKey(env, db, siteUrl(env, request), {
    email: r.email,
    name: r.name || '',
    expires,
    note: [r.system, r.daw].filter(Boolean).join(', '),
    send: true,
  })
  await db.prepare("UPDATE beta_requests SET status = 'approved', licence_key = ?, decided_at = ? WHERE id = ?").bind(result.key, now(), r.id).run()
  return json(result)
}

async function decline(request: Request, db: D1Database) {
  const id = Number((await readJson<{ id?: number }>(request))?.id)
  const res = await db.prepare("UPDATE beta_requests SET status = 'declined', decided_at = ? WHERE id = ? AND status = 'pending'").bind(now(), id).run()
  return res.meta.changes ? json({ status: 'declined' }) : json({ error: 'not_found' }, 404)
}

/** Sample versions of the customer emails, sent only to the signed-in admin: no keys, accounts or lists change. */
const SAMPLES: Record<string, (site: string) => Mail> = {
  'beta-invite': (site) => betaInvite(brand(site), { product: 'VANTA', name: 'Sample Tester', key: 'VNTA-SAMPL-EKEY2-NOTRE-AL234', expires: '31 January 2027', download: `${site}/account` }),
  'beta-request-received': (site) => betaRequestReceived(brand(site), { product: 'VANTA', name: 'Sample Tester' }),
  'licence-keys': (site) => licenceDelivery(brand(site), [{ product: 'VANTA', key: 'VNTA-SAMPL-EKEY2-NOTRE-AL234', devices: 2 }], `${site}/account`),
  'confirm-email': (site) => accountVerify(brand(site), `${site}/account`, 'Sample Tester'),
  'reset-password': (site) => accountReset(brand(site), `${site}/account`),
  'launch-signup': (site) => launchAlertSaved(brand(site), { product: 'ORBIT', detail: '', link: `${site}/shop/orbit` }),
  'launch-out': (site) => launchAlertOut(brand(site), { product: 'ORBIT', detail: '', link: `${site}/shop/orbit` }),
  'offline-reminder': (site) => leaseReminder(brand(site), { product: 'Pixel Forge', computer: 'Studio Mac', until: '26 November 2026', daysLeft: 14 }, `${site}/account`),
}

async function testEmail(request: Request, env: AccountsEnv, user: User) {
  const which = String((await readJson<{ which?: string }>(request))?.which || '')
  const make = SAMPLES[which]
  if (!make) return json({ error: 'not_found' }, 404)
  const mail = make(siteUrl(env, request))
  try {
    await sendMail(env, user.email, { ...mail, subject: `[Test] ${mail.subject}` })
  } catch (e) {
    console.error('test email', e)
    return json({ error: 'unavailable' }, 503)
  }
  return json({ sent: user.email })
}

/** This week's newsletter as subscribers will get it, sent only to the signed-in admin. */
async function testEdition(request: Request, env: AccountsEnv, user: User) {
  try {
    const posts = await sendTestEdition(env, user.email, siteUrl(env, request))
    return json({ sent: user.email, posts })
  } catch (e) {
    console.error('test edition', e)
    return json({ error: 'unavailable' }, 503)
  }
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
    if (pathname === '/api/admin/launch') return json({ alerts: await launchAlertCounts(db) })
    if (pathname === '/api/admin/status') return json(setupStatus(env))
    if (pathname === '/api/admin/newsletter') return json(await newsletterOverview(env, db))
    if (pathname === '/api/admin/beta/requests') {
      const status = ['pending', 'approved', 'declined'].includes(url.searchParams.get('status') || '') ? url.searchParams.get('status') : 'pending'
      const rows = (await db.prepare('SELECT * FROM beta_requests WHERE status = ? ORDER BY created_at DESC LIMIT 300').bind(status).all<BetaRequest>()).results
      return json({ requests: rows })
    }
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
    if (pathname === '/api/admin/beta/approve') return approve(request, env, db)
    if (pathname === '/api/admin/beta/decline') return decline(request, db)
    if (pathname === '/api/admin/launch/send') return sendLaunch(request, env, db)
    if (pathname === '/api/admin/test-email') return testEmail(request, env, user!)
    if (pathname === '/api/admin/newsletter/test') return testEdition(request, env, user!)
  }
  return json({ error: 'not_found' }, 404)
}
