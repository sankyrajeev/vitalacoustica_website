// Paddle (Billing) takes the payments; this receives its webhook at /api/paddle/webhook.
//
//   transaction.completed  → record the order, issue one licence key per unit, email the keys
//   adjustment.created/updated (an approved full refund or a chargeback) → revoke that order's keys
//
// Every delivery is signed: Paddle-Signature: ts=…;h1=HMAC-SHA256(secret, ts + ":" + raw body).
// Paddle retries until it gets a 2xx, so each event is handled once (webhook_events, and orders'
// unique provider_ref). Products are matched by Paddle product id through PADDLE_PRODUCTS.

import { licenceDelivery } from '../emails.ts'
import { hmacHex, newId, sameString } from './crypto.ts'
import { json, now, siteUrl, type AccountsEnv, type D1Database } from './db.ts'
import { issueLicences } from './licences.ts'
import { brand, sendMail } from './mail.ts'
import { isProduct, type ProductId } from './products.ts'

const TOLERANCE = 300 // seconds a signature stays acceptable

export async function verifyPaddleSignature(secret: string, header: string | null, body: string, at = now()) {
  if (!header) return false
  const parts = Object.fromEntries(header.split(';').map((p) => p.split('=') as [string, string]))
  const ts = Number(parts.ts)
  if (!ts || !parts.h1 || Math.abs(at - ts) > TOLERANCE) return false
  return sameString(await hmacHex(secret, `${parts.ts}:${body}`), parts.h1)
}

type Transaction = {
  id: string
  status: string
  customer_id: string | null
  currency_code: string
  invoice_number?: string | null
  custom_data?: { user_id?: string } | null
  items: { quantity: number; price: { product_id: string } }[]
  details?: { totals?: { total?: string }; line_items?: { product_id?: string; product?: { id: string; name: string }; quantity: number; totals?: { total?: string } }[] }
}
type Adjustment = { id: string; action: string; status: string; type?: string; transaction_id: string }

const apiBase = (env: AccountsEnv) => (env.PADDLE_ENV === 'sandbox' ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com')

async function customerEmail(env: AccountsEnv, customerId: string | null) {
  if (!customerId || !env.PADDLE_API_KEY) return null
  const res = await fetch(`${apiBase(env)}/customers/${encodeURIComponent(customerId)}`, { headers: { Authorization: `Bearer ${env.PADDLE_API_KEY}` } })
  if (!res.ok) throw new Error(`Paddle customer lookup ${res.status}`)
  const { data } = (await res.json()) as { data?: { email?: string } }
  return data?.email?.toLowerCase() ?? null
}

function productMap(env: AccountsEnv): Record<string, ProductId> {
  try {
    const map = JSON.parse(env.PADDLE_PRODUCTS || '{}') as Record<string, string>
    return Object.fromEntries(Object.entries(map).filter(([, v]) => isProduct(v))) as Record<string, ProductId>
  } catch {
    return {}
  }
}

async function completed(env: AccountsEnv, db: D1Database, request: Request, t: Transaction) {
  if (await db.prepare('SELECT id FROM orders WHERE provider_ref = ?').bind(t.id).first()) return // already recorded
  const map = productMap(env)
  const items = t.items.map((i) => ({ product: map[i.price.product_id], quantity: i.quantity })).filter((i) => i.product)
  if (!items.length) return // nothing we license (or PADDLE_PRODUCTS doesn't list it yet)

  const email = await customerEmail(env, t.customer_id)
  if (!email) throw new Error(`no customer email for ${t.id}`)
  // the order joins the account it was bought from, or the verified account with the same email
  const claimed = t.custom_data?.user_id
    ? await db.prepare('SELECT id FROM users WHERE id = ?').bind(t.custom_data.user_id).first<{ id: string }>()
    : null
  const user = claimed ?? (await db.prepare('SELECT id FROM users WHERE email = ? AND email_verified = 1').bind(email).first<{ id: string }>())

  const orderId = newId()
  const lines = t.details?.line_items ?? []
  await db.batch([
    db
      .prepare('INSERT INTO orders (id, user_id, email, provider, provider_ref, status, currency, total, invoice_number, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(orderId, user?.id ?? null, email, 'paddle', t.id, 'completed', t.currency_code, Number(t.details?.totals?.total ?? 0) || null, t.invoice_number ?? null, now()),
    ...items.map((i) => {
      const line = lines.find((l) => (l.product_id ?? l.product?.id) && map[(l.product_id ?? l.product?.id)!] === i.product)
      return db
        .prepare('INSERT INTO order_items (order_id, product, name, quantity, amount) VALUES (?, ?, ?, ?, ?)')
        .bind(orderId, i.product, line?.product?.name ?? i.product, i.quantity, Number(line?.totals?.total ?? 0) || null)
    }),
  ])
  const keys = await issueLicences(db, { id: orderId, userId: user?.id ?? null, email }, items)
  const site = siteUrl(env, request)
  // the keys are saved and on the account page; a failed email mustn't make Paddle retry the order
  await sendMail(env, email, licenceDelivery(brand(site), keys, `${site}/account`)).catch((e) => console.error('licence email', t.id, e))
}

async function refunded(db: D1Database, a: Adjustment) {
  const fullRefund = a.action === 'refund' && a.status === 'approved' && (a.type ?? 'full') === 'full'
  const chargeback = a.action === 'chargeback' && a.status === 'approved'
  if (!fullRefund && !chargeback) return
  const order = await db.prepare("UPDATE orders SET status = 'refunded' WHERE provider_ref = ? RETURNING id").bind(a.transaction_id).first<{ id: string }>()
  if (!order) return
  await db.batch([
    db.prepare('UPDATE licences SET revoked = 1 WHERE order_id = ?').bind(order.id),
    db.prepare('DELETE FROM activations WHERE key IN (SELECT key FROM licences WHERE order_id = ?)').bind(order.id),
  ])
}

export async function paddleWebhook(request: Request, env: AccountsEnv, db: D1Database) {
  if (!env.PADDLE_WEBHOOK_SECRET) return json({ error: 'not_configured' }, 503)
  const body = await request.text()
  if (!(await verifyPaddleSignature(env.PADDLE_WEBHOOK_SECRET, request.headers.get('Paddle-Signature'), body))) return json({ error: 'bad_signature' }, 401)
  const event = JSON.parse(body) as { event_id: string; event_type: string; data: unknown }
  if (await db.prepare('SELECT id FROM webhook_events WHERE id = ?').bind(event.event_id).first()) return json({ status: 'duplicate' })

  if (event.event_type === 'transaction.completed') await completed(env, db, request, event.data as Transaction)
  else if (event.event_type === 'adjustment.created' || event.event_type === 'adjustment.updated') await refunded(db, event.data as Adjustment)

  // recorded only once handled: if anything above failed, Paddle's retry runs it again
  await db.prepare('INSERT INTO webhook_events (id, received_at) VALUES (?, ?) ON CONFLICT DO NOTHING').bind(event.event_id, now()).run()
  return json({ status: 'ok' })
}
