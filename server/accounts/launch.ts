// "Tell me when it's out" on products that aren't on sale yet: POST /api/notify { product, email, detail? }.
// One confirmation email now; one launch email when the owner presses "Tell them it's out" on the
// admin page (sendLaunch); nothing else.

import { launchAlertOut, launchAlertSaved } from '../emails.ts'
import { products } from '../../src/content/shop.ts'
import { clientIp, json, limited, now, readJson, siteUrl, type AccountsEnv, type D1Database } from './db.ts'
import { brand, sendMail } from './mail.ts'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const productNamed = (id: string) => products.find((p) => p.id === id)

export async function notifyMe(request: Request, env: AccountsEnv, db: D1Database) {
  const body = await readJson<{ product?: string; email?: string; detail?: string; _gotcha?: string }>(request)
  if (!body) return json({ error: 'invalid' }, 400)
  if (body._gotcha) return json({ status: 'saved' })
  const p = productNamed(String(body.product || ''))
  const email = String(body.email || '').trim().toLowerCase()
  if (!p) return json({ error: 'not_found' }, 404)
  if (!EMAIL.test(email) || email.length > 254) return json({ error: 'invalid_email' }, 400)
  if ((await limited(db, `notify-ip:${clientIp(request)}`, 20, 3600)) || (await limited(db, `notify:${email}`, 10, 86400))) return json({ error: 'rate_limited' }, 429)
  const detail = String(body.detail || '').trim().slice(0, 80)
  const res = await db
    .prepare('INSERT INTO launch_alerts (product, email, detail, created_at) VALUES (?, ?, ?, ?) ON CONFLICT (product, email) DO UPDATE SET detail = excluded.detail, notified_at = NULL')
    .bind(p.id, email, detail || null, now())
    .run()
  if (res.meta.changes) {
    const site = siteUrl(env, request)
    await sendMail(env, email, launchAlertSaved(brand(site), { product: p.name, detail, link: `${site}/shop/${p.id}` })).catch((e) => console.error('launch alert email', e))
  }
  return json({ status: 'saved' })
}

/** The admin page's list: how many people wait for each product. */
export async function launchAlertCounts(db: D1Database) {
  const rows = (
    await db
      .prepare('SELECT product, SUM(notified_at IS NULL) AS waiting, SUM(notified_at IS NOT NULL) AS told FROM launch_alerts GROUP BY product ORDER BY waiting DESC')
      .all<{ product: string; waiting: number; told: number }>()
  ).results
  return rows.map((r) => ({ ...r, name: productNamed(r.product)?.name ?? r.product }))
}

/** "Tell them it's out": emails everyone waiting for the product, once. */
export async function sendLaunch(request: Request, env: AccountsEnv, db: D1Database) {
  const p = productNamed(String((await readJson<{ product?: string }>(request))?.product || ''))
  if (!p) return json({ error: 'not_found' }, 404)
  const site = siteUrl(env, request)
  const waiting = (await db.prepare('SELECT email, detail FROM launch_alerts WHERE product = ? AND notified_at IS NULL LIMIT 500').bind(p.id).all<{ email: string; detail: string | null }>()).results
  let sent = 0
  for (const w of waiting) {
    try {
      await sendMail(env, w.email, launchAlertOut(brand(site), { product: p.name, detail: w.detail || '', link: `${site}/shop/${p.id}` }))
      await db.prepare('UPDATE launch_alerts SET notified_at = ? WHERE product = ? AND email = ?').bind(now(), p.id, w.email).run()
      sent++
    } catch (e) {
      console.error('launch email', w.email, e)
    }
  }
  return json({ sent, left: waiting.length - sent })
}
