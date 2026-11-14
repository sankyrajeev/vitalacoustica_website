// The activation server the apps talk to, under /api/licence/ (the apps are built with
// -DVANTA_LICENCE_SERVER=https://vitalacoustica.com/api/licence and add /v1/activate themselves).
// It answers exactly as VANTA's own reference server does (vanta_vitalacoustica, tools/licensing/admin.py),
// for every product; only the signed licence differs (products.ts `format`):
//
//   POST /v1/activate   { key, machine, machineName }  → 200 { licence } | 400 | 403 | 404 | 409 { error, devices }
//   POST /v1/deactivate { key, machine }               → 200 { ok: true } | 404 (the app frees itself either way)
//
// Activating again from the same computer keeps its slot and returns a fresh licence, so it's also how
// Pixel Forge renews its lease.
//
// Also here: issuing keys for an order, and the account page's view of them.

import { newLicenceKey, normaliseKey, parseEd25519Key, parseSigningKey, signLicence, signPf1 } from './licence.ts'
import { clientIp, json, limited, now, readJson, type AccountsEnv, type D1Database } from './db.ts'
import { PRODUCTS, isProduct, type ProductId } from './products.ts'

type LicenceRow = { key: string; product: string; email: string; edition: string; max_devices: number; expires: string | null; revoked: number; owner: string | null }

const today = () => new Date().toISOString().slice(0, 10)
const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

export async function activate(request: Request, env: AccountsEnv, db: D1Database) {
  // fields we don't use are ignored, so newer apps can send more
  const body = await readJson<{ key?: string; machine?: string; machineName?: string; os?: string; termsVersion?: string; termsAccepted?: string }>(request)
  if (!body) return json({ error: 'The request was not understood.' }, 400)
  if (await limited(db, `activate:${clientIp(request)}`, 30, 3600)) return json({ error: 'Too many attempts. Try again in an hour.' }, 429)
  const key = normaliseKey(String(body.key ?? ''))
  const machine = String(body.machine ?? '')
  const machineName = String(body.machineName ?? '').slice(0, 64)

  const row = key
    ? await db
        .prepare('SELECT l.key, l.product, l.email, l.edition, l.max_devices, l.expires, l.revoked, u.name AS owner FROM licences l LEFT JOIN users u ON u.id = l.user_id WHERE l.key = ?')
        .bind(key)
        .first<LicenceRow>()
    : null
  if (!row) return json({ error: 'Unknown licence key.' }, 404)
  if (row.revoked) return json({ error: 'This licence key has been revoked. Contact support.' }, 403)
  if (row.expires && row.expires < today()) return json({ error: 'This licence has expired.' }, 403)
  if (!machine || machine.length > 128) return json({ error: 'Missing computer ID.' }, 400)
  const product = isProduct(row.product) ? PRODUCTS[row.product] : null
  const secret = product ? (env as Record<string, string | undefined>)[product.signingKey] : undefined
  const signingKey = product?.format === 'vanta' ? parseSigningKey(secret) : product?.format === 'pf1' ? await parseEd25519Key(secret) : null
  if (!product || !signingKey) return json({ error: 'Activation is not available yet. Contact support.' }, 503)

  const active = (await db.prepare('SELECT machine, machine_name FROM activations WHERE key = ?').bind(key).all<{ machine: string; machine_name: string | null }>()).results
  if (!active.some((a) => a.machine === machine) && active.length >= row.max_devices)
    return json(
      {
        error:
          row.max_devices === 1
            ? `This key is active on another computer (${active[0].machine_name || 'unnamed'}). Deactivate ${product.name} there first, or remove that computer from your account at vitalacoustica.com/account.`
            : `This key is already active on ${active.length} computers (the limit is ${row.max_devices}). Deactivate ${product.name} on one of them first, or remove one from your account at vitalacoustica.com/account.`,
        devices: active.map((a) => a.machine_name || a.machine.slice(0, 8)),
      },
      409,
    )
  // re-activating a computer (a reinstall) keeps its slot, and its name if none is sent
  const saved = await db
    .prepare(
      `INSERT INTO activations (key, machine, machine_name, activated_at, os, terms_version, terms_accepted) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
       ON CONFLICT (key, machine) DO UPDATE SET
         machine_name = CASE WHEN excluded.machine_name != '' THEN excluded.machine_name ELSE machine_name END,
         activated_at = excluded.activated_at,
         os = COALESCE(excluded.os, os),
         terms_version = COALESCE(excluded.terms_version, terms_version),
         terms_accepted = COALESCE(excluded.terms_accepted, terms_accepted),
         lease_notice = 0
       RETURNING machine_name`,
    )
    .bind(key, machine, machineName, now(), text(body.os, 80), text(body.termsVersion, 40), text(body.termsAccepted, 40))
    .first<{ machine_name: string | null }>()
  if (product.format === 'pf1') {
    const lease = product.leaseDays ? new Date(Date.now() + product.leaseDays * 86400e3).toISOString().slice(0, 10) : null
    const licence = await signPf1(signingKey as CryptoKey, {
      id: key,
      n: row.owner || row.email,
      e: row.email,
      t: 'full',
      i: today(),
      x: row.expires,
      m: machine,
      r: lease,
    })
    return json({ licence })
  }
  const licence = await signLicence(signingKey as Exclude<typeof signingKey, CryptoKey>, {
    product: product.licenceName,
    key,
    email: row.email,
    machine,
    machineName: saved?.machine_name ?? machineName,
    edition: row.edition,
    issued: today(),
    expires: row.expires,
  })
  return json({ licence })
}

export async function deactivate(request: Request, db: D1Database) {
  const body = await readJson<{ key?: string; machine?: string }>(request)
  const key = normaliseKey(String(body?.key ?? ''))
  const machine = String(body?.machine ?? '')
  if (!key || !machine) return json({ error: 'This computer is not activated with that key.' }, 404)
  const res = await db.prepare('DELETE FROM activations WHERE key = ? AND machine = ?').bind(key, machine).run()
  return res.meta.changes ? json({ ok: true }) : json({ error: 'This computer is not activated with that key.' }, 404)
}

/** New keys for a paid order: one per unit bought. */
export async function issueLicences(
  db: D1Database,
  order: { id: string; userId: string | null; email: string },
  items: { product: ProductId; quantity: number }[],
) {
  const keys: { product: string; key: string; devices: number }[] = []
  const statements = []
  for (const item of items) {
    const p = PRODUCTS[item.product]
    for (let i = 0; i < Math.min(item.quantity, 20); i++) {
      const key = newLicenceKey(p.keyPrefix)
      keys.push({ product: p.name, key, devices: p.maxDevices })
      statements.push(
        db
          .prepare('INSERT INTO licences (key, product, user_id, email, order_id, edition, max_devices, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(key, p.id, order.userId, order.email, order.id, 'Full', p.maxDevices, now()),
      )
    }
  }
  if (statements.length) await db.batch(statements)
  return keys
}

/** The account page's list: each licence with the computers it's active on. */
export async function licencesFor(db: D1Database, userId: string) {
  const licences = (
    await db
      .prepare('SELECT key, product, edition, max_devices, expires, revoked, order_id, created_at FROM licences WHERE user_id = ? ORDER BY created_at DESC')
      .bind(userId)
      .all<{ key: string; product: string; edition: string; max_devices: number; expires: string | null; revoked: number; order_id: string | null; created_at: number }>()
  ).results
  const devices = (
    await db
      .prepare('SELECT a.key, a.machine, a.machine_name, a.activated_at FROM activations a JOIN licences l ON l.key = a.key WHERE l.user_id = ? ORDER BY a.activated_at')
      .bind(userId)
      .all<{ key: string; machine: string; machine_name: string | null; activated_at: number }>()
  ).results
  return licences.map((l) => ({
    key: l.key,
    product: l.product,
    name: isProduct(l.product) ? PRODUCTS[l.product].name : l.product,
    edition: l.edition,
    maxDevices: l.max_devices,
    expires: l.expires,
    revoked: !!l.revoked,
    orderId: l.order_id,
    created: l.created_at,
    download: isProduct(l.product) && !!PRODUCTS[l.product].releases?.length && !l.revoked,
    devices: devices
      .filter((d) => d.key === l.key)
      .map((d) => ({ machine: d.machine, name: d.machine_name || `Computer ${d.machine.slice(0, 6)}`, activated: d.activated_at })),
  }))
}

/** Frees a computer's slot from the account page (for a computer that's gone, or can't reach us). */
export async function removeDevice(request: Request, db: D1Database, userId: string) {
  const body = await readJson<{ key?: string; machine?: string }>(request)
  const key = normaliseKey(String(body?.key ?? ''))
  const machine = String(body?.machine ?? '')
  const res = await db
    .prepare('DELETE FROM activations WHERE key = ? AND machine = ? AND key IN (SELECT key FROM licences WHERE user_id = ?)')
    .bind(key, machine, userId)
    .run()
  return res.meta.changes ? json({ status: 'removed' }) : json({ error: 'not_found' }, 404)
}

/* ─────────────── beta builds: feedback and check-ins ─────────────── */
// As VANTA's reference server (tools/licensing/admin.py feedback() and ping()). Only beta builds call
// these, and they ignore failures; the owner reads the results on the admin page.

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : v == null ? '' : String(v).slice(0, max))
const keyPrefixProduct = (key: string) => Object.values(PRODUCTS).find((p) => key.startsWith(`${p.keyPrefix}-`))?.id ?? null

/** POST /v1/feedback { type, message, email?, crash, system, logs, key?, machine }: reports can carry logs, so up to 2 MB. */
export async function feedback(request: Request, db: D1Database) {
  if (await limited(db, `feedback:${clientIp(request)}`, 30, 3600)) return json({ error: 'Too many reports. Try again later.' }, 429)
  const body = await readJson<Record<string, unknown>>(request, 2 * 1024 * 1024)
  if (!body) return json({ error: 'The report was too large or not understood.' }, 400)
  const message = str(body.message, 20000).trim()
  if (!message) return json({ error: 'Empty feedback.' }, 400)
  const key = normaliseKey(str(body.key, 64))
  await db
    .prepare('INSERT INTO feedback (received_at, product, key, machine, type, email, crash, message, system, logs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(now(), keyPrefixProduct(key), key || null, str(body.machine, 128), str(body.type, 64), str(body.email, 254), body.crash ? 1 : 0, message, str(body.system, 4000), str(body.logs, 400000))
    .run()
  return json({ ok: true })
}

/** POST /v1/ping { machine, key?, version }: a beta build opening, to see who's testing and on which version. */
export async function ping(request: Request, db: D1Database) {
  const body = await readJson<Record<string, unknown>>(request)
  const machine = str(body?.machine, 128)
  if (!machine) return json({ error: 'No machine.' }, 400)
  if (await limited(db, `ping:${clientIp(request)}`, 200, 3600)) return json({ ok: true }) // quietly: nothing recorded
  await db
    .prepare(
      `INSERT INTO pings (key, machine, last_seen, version, sessions) VALUES (?, ?, ?, ?, 1)
       ON CONFLICT (key, machine) DO UPDATE SET last_seen = excluded.last_seen, version = excluded.version, sessions = sessions + 1`,
    )
    .bind(normaliseKey(str(body?.key, 64)), machine, now(), str(body?.version, 32))
    .run()
  return json({ ok: true })
}
