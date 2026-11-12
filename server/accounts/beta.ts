// "Request free beta access" on a product page: POST /api/beta/request. Testing is free and by
// invitation: the request waits on the admin page until the owner approves it (which sends the
// beta key) or declines it. The person gets a "we've got it" email; the admins get a heads-up.
// Until the database is set up, the request still reaches the team, by email only.

import { betaRequestAdmin, betaRequestReceived } from '../emails.ts'
import { teamInbox } from '../enquiry.ts'
import { clientIp, json, limited, now, readJson, siteUrl, type AccountsEnv, type D1Database } from './db.ts'
import { brand, sendMail } from './mail.ts'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
/** products with an open beta, and their names */
export const OPEN_BETAS: Record<string, string> = { vanta: 'VANTA' }

const field = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export async function requestBeta(request: Request, env: AccountsEnv, db: D1Database | undefined) {
  const body = await readJson<Record<string, unknown>>(request)
  if (!body) return json({ error: 'invalid' }, 400)
  if (field(body._gotcha, 100)) return json({ status: 'received' }) // a bot filled the hidden field
  const product = field(body.product, 40)
  const email = field(body.email, 254).toLowerCase()
  if (!OPEN_BETAS[product]) return json({ error: 'not_found' }, 404)
  if (!EMAIL.test(email)) return json({ error: 'invalid_email' }, 400)
  const r = { product: OPEN_BETAS[product], name: field(body.name, 80), email, about: field(body.about, 2000), system: field(body.system, 40), daw: field(body.daw, 80) }
  const site = siteUrl(env, request)
  const admins = (env.ADMIN_EMAILS || '').split(',').map((e) => e.trim()).filter(Boolean)

  if (!db) {
    // no database yet: the request goes to the team by email, so nothing is lost
    try {
      await Promise.all((admins.length ? admins : teamInbox(env)).map((a) => sendMail(env, a, betaRequestAdmin(brand(site), r, `${site}/account/admin`, false), email)))
    } catch (e) {
      console.error('beta request (email only)', e)
      return json({ error: 'unavailable' }, 503)
    }
    await sendMail(env, email, betaRequestReceived(brand(site), r), env.BETA_REPLY_TO || 'beta@vitalacoustica.com').catch((e) => console.error('beta request email', e))
    return json({ status: 'received' })
  }

  if ((await limited(db, `beta-ip:${clientIp(request)}`, 5, 3600)) || (await limited(db, `beta:${email}`, 3, 86400))) return json({ error: 'rate_limited' }, 429)
  // one open request per person and product: asking again just says it's received
  const res = await db
    .prepare('INSERT INTO beta_requests (product, email, name, about, system, daw, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING')
    .bind(product, email, r.name || null, r.about || null, r.system || null, r.daw || null, now())
    .run()
  if (res.meta.changes) {
    await Promise.all([
      sendMail(env, email, betaRequestReceived(brand(site), r), env.BETA_REPLY_TO || 'beta@vitalacoustica.com').catch((e) => console.error('beta request email', e)),
      ...admins.map((a) => sendMail(env, a, betaRequestAdmin(brand(site), r, `${site}/account/admin`), email).catch((e) => console.error('beta admin email', e))),
    ])
  }
  return json({ status: 'received' })
}
