// Accounts, orders and licences, end to end: sign-up and email verification, sign-in, password
// reset, a Paddle purchase, activating and deactivating computers, a refund, Google sign-in.
// The database is an in-memory SQLite standing in for D1, with the real migrations; Paddle,
// Google and email are stubbed. A throwaway signing key is made for the run. Run with `npm test`.

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash, generateKeyPairSync, verify as edVerify } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { after, before, test } from 'node:test'
import { handleAccounts } from '../server/accounts/index.ts'
import type { AccountsEnv, D1Database, D1PreparedStatement } from '../server/accounts/db.ts'
import { hmacHex } from '../server/accounts/crypto.ts'
import { verifyPaddleSignature } from '../server/accounts/paddle.ts'

/* ── a D1 stand-in ── */
function d1(): D1Database {
  const db = new DatabaseSync(':memory:')
  db.exec('PRAGMA foreign_keys = ON')
  const dir = new URL('../migrations/', import.meta.url)
  for (const f of readdirSync(dir).sort()) db.exec(readFileSync(new URL(f, dir), 'utf8'))
  const statement = (sql: string, args: unknown[] = []): D1PreparedStatement => ({
    bind: (...values) => statement(sql, values),
    first: async <T,>() => (db.prepare(sql).get(...(args as never[])) as T) ?? null,
    all: async <T,>() => ({ results: db.prepare(sql).all(...(args as never[])) as T[] }),
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

/* ── stubs: email, Paddle, Google ── */
const SITE = 'https://vitalacoustica.com'
const mail: { to: string; subject: string; text: string }[] = []
const lastLink = (to: string, path: string) => {
  const m = [...mail].reverse().find((x) => x.to === to)
  const link = m?.text.match(new RegExp(`${SITE}${path}\\S+`))?.[0]
  assert.ok(link, `no ${path} link emailed to ${to}`)
  return link
}
let googleClaims: Record<string, unknown> = {}
let paddleEmail = 'Buyer@Example.com'
const realFetch = globalThis.fetch
let workDir = ''
let env: AccountsEnv & Record<string, string | undefined>
let publicKey: { e: bigint; n: bigint }
const pixelForge = generateKeyPairSync('ed25519')

before(() => {
  // a throwaway signing key, made and converted by the real script
  workDir = mkdtempSync(join(tmpdir(), 'va-licence-'))
  execFileSync('node', ['scripts/licence-key.mjs', 'new', join(workDir, 'k')])
  const signing = execFileSync('node', ['scripts/licence-key.mjs', 'convert', join(workDir, 'k', 'private_key.json')], { encoding: 'utf8' }).trim()
  const [e, n] = readFileSync(join(workDir, 'k', 'public_key.txt'), 'utf8').trim().split(',')
  publicKey = { e: BigInt(`0x${e}`), n: BigInt(`0x${n}`) }
  env = {
    DB: d1(),
    SITE_URL: SITE,
    RESEND_API_KEY: 'test',
    ENQUIRY_FROM: 'Test <test@example.com>',
    PADDLE_WEBHOOK_SECRET: 'pdl_ntfset_test',
    PADDLE_API_KEY: 'test',
    PADDLE_ENV: 'sandbox',
    PADDLE_PRODUCTS: JSON.stringify({ pro_vanta: 'vanta', pro_orbit: 'orbit', pro_pf: 'pixel-forge' }),
    GOOGLE_CLIENT_ID: 'gid.apps.googleusercontent.com',
    GOOGLE_CLIENT_SECRET: 'test',
    LICENCE_KEY_VANTA: signing,
    LICENCE_KEY_PIXELFORGE: pixelForge.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  }
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input)
    if (url === 'https://api.resend.com/emails') {
      const b = JSON.parse(String(init?.body))
      mail.push({ to: b.to[0], subject: b.subject, text: b.text })
      return Response.json({ id: 'email' })
    }
    if (url.startsWith('https://sandbox-api.paddle.com/customers/')) return Response.json({ data: { email: paddleEmail } })
    if (url === 'https://oauth2.googleapis.com/token') {
      const part = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
      return Response.json({ id_token: `${part({ alg: 'RS256' })}.${part(googleClaims)}.sig` })
    }
    throw new Error(`unexpected fetch ${url}`)
  }) as typeof fetch
})
after(() => {
  globalThis.fetch = realFetch
  rmSync(workDir, { recursive: true, force: true })
})

/* ── helpers ── */
const call = async (path: string, init: { method?: string; body?: unknown; cookie?: string; headers?: Record<string, string>; raw?: string } = {}) => {
  const headers: Record<string, string> = { ...init.headers }
  if (init.body !== undefined || init.raw !== undefined) headers['Content-Type'] ??= 'application/json'
  if (init.cookie) headers.Cookie = init.cookie
  if ((init.method ?? 'GET') === 'POST' && !path.startsWith('/api/licence') && !path.startsWith('/api/paddle')) headers.Origin ??= SITE
  const res = await handleAccounts(
    new Request(`${SITE}${path}`, { method: init.method ?? 'GET', headers, body: init.raw ?? (init.body === undefined ? undefined : JSON.stringify(init.body)) }),
    env,
  )
  assert.ok(res, `${path} was not handled`)
  return res
}
const cookieOf = (res: Response) => res.headers.getSetCookie().find((c) => c.startsWith('va_session='))?.split(';')[0] ?? ''
const clientHash = (password: string) => createHash('sha256').update(password).digest('hex') // stands in for the browser's PBKDF2

async function paddle(event: object) {
  const raw = JSON.stringify(event)
  const ts = Math.floor(Date.now() / 1000)
  const h1 = await hmacHex(env.PADDLE_WEBHOOK_SECRET!, `${ts}:${raw}`)
  return call('/api/paddle/webhook', { method: 'POST', raw, headers: { 'Paddle-Signature': `ts=${ts};h1=${h1}` } })
}
const purchase = (id: string, txn: string, items: { product: string; quantity: number }[], userId?: string) =>
  paddle({
    event_id: id,
    event_type: 'transaction.completed',
    data: {
      id: txn,
      status: 'completed',
      customer_id: 'ctm_1',
      currency_code: 'USD',
      invoice_number: '325-10001',
      custom_data: userId ? { user_id: userId } : null,
      items: items.map((i) => ({ quantity: i.quantity, price: { product_id: i.product } })),
      details: { totals: { total: '4900' }, line_items: items.map((i) => ({ product_id: i.product, product: { id: i.product, name: 'VANTA' }, quantity: i.quantity, totals: { total: '4900' } })) },
    },
  })

/** Checks a licence file the way the app does: signature^e mod n must equal SHA-256(payload). */
function verifyLicence(text: string) {
  const file = JSON.parse(text)
  assert.equal(file.format, 'vanta-licence-1')
  let r = 1n
  let b = BigInt(`0x${file.signature}`) % publicKey.n
  let e = publicKey.e
  while (e > 0n) {
    if (e & 1n) r = (r * b) % publicKey.n
    b = (b * b) % publicKey.n
    e >>= 1n
  }
  assert.equal(r, BigInt(`0x${createHash('sha256').update(file.payload).digest('hex')}`), 'licence signature')
  return JSON.parse(Buffer.from(file.payload, 'base64').toString('utf8'))
}

/* ── the flow ── */
let session = ''
let key = ''

test('sign up, verify the email, sign in', async () => {
  let res = await call('/api/account/signup', { method: 'POST', body: { email: 'Buyer@Example.com', name: 'Asha Rao', password: clientHash('correct horse') } })
  assert.deepEqual(await res.json(), { status: 'check_email' })
  // not verified yet: no sign-in, and the verification email goes again
  res = await call('/api/account/login', { method: 'POST', body: { email: 'buyer@example.com', password: clientHash('correct horse') } })
  assert.equal(res.status, 403)
  const link = lastLink('buyer@example.com', '/api/account/verify')
  res = await call(link.slice(SITE.length))
  assert.equal(res.status, 303)
  assert.equal(res.headers.get('Location'), `${SITE}/account?notice=verified`)
  assert.ok(cookieOf(res))
  // the link works once
  assert.match((await call(link.slice(SITE.length))).headers.get('Location')!, /link_expired/)

  assert.equal((await call('/api/account/login', { method: 'POST', body: { email: 'buyer@example.com', password: clientHash('wrong') } })).status, 401)
  res = await call('/api/account/login', { method: 'POST', body: { email: 'buyer@example.com', password: clientHash('correct horse') } })
  assert.equal(res.status, 200)
  session = cookieOf(res)
  const me = (await (await call('/api/account/me', { cookie: session })).json()) as { user: { email: string; name: string } }
  assert.equal(me.user.email, 'buyer@example.com')
  assert.equal(me.user.name, 'Asha Rao')
})

test('signing up again with the same email reveals nothing, and emails the owner', async () => {
  const before = mail.length
  const res = await call('/api/account/signup', { method: 'POST', body: { email: 'buyer@example.com', password: clientHash('x') } })
  assert.deepEqual(await res.json(), { status: 'check_email' })
  assert.equal(mail.length, before + 1)
  assert.match(mail.at(-1)!.subject, /already/i)
})

test('requests from other sites are refused', async () => {
  const res = await call('/api/account/login', { method: 'POST', body: {}, headers: { Origin: 'https://evil.example' } })
  assert.equal(res.status, 403)
  assert.equal((await call('/api/account/me')).status, 401)
})

test('the Paddle webhook checks its signature', async () => {
  assert.equal((await call('/api/paddle/webhook', { method: 'POST', raw: '{}', headers: { 'Paddle-Signature': 'ts=1;h1=00' } })).status, 401)
  const ts = Math.floor(Date.now() / 1000)
  assert.equal(await verifyPaddleSignature('s', `ts=${ts};h1=${await hmacHex('s', `${ts}:body`)}`, 'body'), true)
  assert.equal(await verifyPaddleSignature('s', `ts=${ts - 3600};h1=${await hmacHex('s', `${ts - 3600}:body`)}`, 'body'), false) // too old
})

test('a purchase records the order, issues a key and emails it', async () => {
  const res = await purchase('evt_1', 'txn_1', [{ product: 'pro_vanta', quantity: 1 }])
  assert.equal(res.status, 200)
  const email = mail.at(-1)!
  assert.equal(email.to, 'buyer@example.com')
  key = email.text.match(/VNTA(-[A-Z2-9]{5}){4}/)![0]
  // a retried delivery does nothing
  await purchase('evt_1', 'txn_1', [{ product: 'pro_vanta', quantity: 1 }])
  await purchase('evt_1b', 'txn_1', [{ product: 'pro_vanta', quantity: 1 }])
  const me = (await (await call('/api/account/me', { cookie: session })).json()) as { licences: { key: string }[]; orders: { invoice: string; items: unknown[] }[] }
  assert.deepEqual(me.licences.map((l) => l.key), [key])
  assert.equal(me.orders.length, 1)
  assert.equal(me.orders[0].invoice, '325-10001')
})

test('activating: signed licence, two computers, re-activation keeps its slot', async () => {
  const activate = (machine: string, machineName = '') => call('/api/licence/v1/activate', { method: 'POST', body: { key: key.toLowerCase(), machine, machineName } })
  let res = await activate('a'.repeat(32), 'Studio Mac')
  assert.equal(res.status, 200)
  const licence = verifyLicence(((await res.json()) as { licence: string }).licence)
  assert.deepEqual(
    { product: licence.product, key: licence.key, email: licence.email, machineName: licence.machineName, edition: licence.edition, expires: licence.expires },
    { product: 'VANTA', key, email: 'buyer@example.com', machineName: 'Studio Mac', edition: 'Full', expires: null },
  )
  assert.equal((await activate('b'.repeat(32), 'Laptop')).status, 200)
  assert.equal((await activate('a'.repeat(32))).status, 200) // reinstall
  res = await activate('c'.repeat(32), 'Third')
  assert.equal(res.status, 409)
  assert.deepEqual(((await res.json()) as { devices: string[] }).devices, ['Studio Mac', 'Laptop'])
  assert.equal((await activate('')).status, 400)
  assert.equal((await call('/api/licence/v1/activate', { method: 'POST', body: { key: 'VNTA-AAAAA-AAAAA-AAAAA-AAAAA', machine: 'x' } })).status, 404)
})

test('freeing computers from the app and from the account page', async () => {
  assert.equal((await call('/api/licence/v1/deactivate', { method: 'POST', body: { key, machine: 'b'.repeat(32) } })).status, 200)
  assert.equal((await call('/api/licence/v1/deactivate', { method: 'POST', body: { key, machine: 'b'.repeat(32) } })).status, 404)
  assert.equal((await call('/api/account/device/remove', { method: 'POST', body: { key, machine: 'a'.repeat(32) }, cookie: session })).status, 200)
  const me = (await (await call('/api/account/me', { cookie: session })).json()) as { licences: { devices: unknown[] }[] }
  assert.equal(me.licences[0].devices.length, 0)
})

test('a purchase while signed out joins the verified account with that email', async () => {
  await purchase('evt_2', 'txn_2', [{ product: 'pro_orbit', quantity: 2 }])
  const me = (await (await call('/api/account/me', { cookie: session })).json()) as { licences: { product: string }[] }
  assert.equal(me.licences.filter((l) => l.product === 'orbit').length, 2)
})

test('a guest purchase joins the account made later with that email', async () => {
  paddleEmail = 'guest@example.com'
  await purchase('evt_g', 'txn_g', [{ product: 'pro_vanta', quantity: 1 }])
  paddleEmail = 'Buyer@Example.com'
  const guestKey = mail.at(-1)!.text.match(/VNTA(-[A-Z2-9]{5}){4}/)![0]
  await call('/api/account/signup', { method: 'POST', body: { email: 'guest@example.com', password: clientHash('guest pass') } })
  const res = await call(lastLink('guest@example.com', '/api/account/verify').slice(SITE.length))
  const me = (await (await call('/api/account/me', { cookie: cookieOf(res) })).json()) as { licences: { key: string }[]; orders: unknown[] }
  assert.deepEqual(me.licences.map((l) => l.key), [guestKey])
  assert.equal(me.orders.length, 1)
})

test('a full refund revokes the order’s keys', async () => {
  await paddle({ event_id: 'evt_3', event_type: 'adjustment.updated', data: { id: 'adj_1', action: 'refund', status: 'approved', type: 'full', transaction_id: 'txn_1' } })
  const res = await call('/api/licence/v1/activate', { method: 'POST', body: { key, machine: 'a'.repeat(32) } })
  assert.equal(res.status, 403)
  const me = (await (await call('/api/account/me', { cookie: session })).json()) as { licences: { key: string; revoked: boolean }[]; orders: { status: string }[] }
  assert.equal(me.licences.find((l) => l.key === key)!.revoked, true)
  assert.ok(me.orders.some((o) => o.status === 'refunded'))
})

test('forgotten password: the reset link signs out other sessions', async () => {
  await call('/api/account/forgot', { method: 'POST', body: { email: 'buyer@example.com' } })
  const token = new URL(lastLink('buyer@example.com', '/account/reset')).searchParams.get('token')
  assert.deepEqual(await (await call(`/api/account/reset?token=${token}`)).json(), { email: 'buyer@example.com' })
  const res = await call('/api/account/reset', { method: 'POST', body: { token, password: clientHash('new password') } })
  assert.equal(res.status, 200)
  assert.equal((await call('/api/account/me', { cookie: session })).status, 401) // old session gone
  session = cookieOf(res)
  assert.equal((await call('/api/account/me', { cookie: session })).status, 200)
  assert.equal((await call('/api/account/reset', { method: 'POST', body: { token, password: clientHash('again') } })).status, 400) // used once
  assert.equal((await call('/api/account/login', { method: 'POST', body: { email: 'buyer@example.com', password: clientHash('new password') } })).status, 200)
})

test('Google sign-in: state is checked, then the verified email signs in', async () => {
  let res = await call('/api/account/google')
  assert.equal(res.status, 303)
  const location = new URL(res.headers.get('Location')!)
  assert.equal(location.host, 'accounts.google.com')
  const state = location.searchParams.get('state')!
  const oauth = res.headers.getSetCookie()[0].split(';')[0]

  // a different state (someone else's link) fails
  res = await call('/api/account/google/callback?state=wrong&code=c', { cookie: oauth })
  assert.match(res.headers.get('Location')!, /google_failed/)

  googleClaims = { iss: 'https://accounts.google.com', aud: env.GOOGLE_CLIENT_ID, exp: Math.floor(Date.now() / 1000) + 600, sub: 'g-1', email: 'buyer@example.com', email_verified: true }
  res = await call(`/api/account/google/callback?state=${state}&code=c`, { cookie: oauth })
  assert.equal(res.headers.get('Location'), `${SITE}/account`)
  const me = (await (await call('/api/account/me', { cookie: cookieOf(res) })).json()) as { user: { google: boolean; hasPassword: boolean } }
  assert.deepEqual([me.user.google, me.user.hasPassword], [true, true]) // linked to the existing, verified account

  // an unverified Google address is refused
  googleClaims = { ...googleClaims, sub: 'g-2', email: 'other@example.com', email_verified: false }
  res = await call(`/api/account/google/callback?state=${state}&code=c`, { cookie: oauth })
  assert.match(res.headers.get('Location')!, /google_failed/)
})

test('Pixel Forge: one computer at a time, a PF1 token its app accepts, with a lease', async () => {
  await purchase('evt_pf', 'txn_pf', [{ product: 'pro_pf', quantity: 1 }])
  const pfKey = mail.at(-1)!.text.match(/PXFG(-[A-Z2-9]{5}){4}/)![0]
  const activate = (machine: string, machineName = '') => call('/api/licence/v1/activate', { method: 'POST', body: { key: pfKey, machine, machineName } })
  let res = await activate('AB12-CD34-EF56-7890', 'Lighting Mac')
  assert.equal(res.status, 200)
  const token = ((await res.json()) as { licence: string }).licence
  const [prefix, payload, signature] = token.split('.')
  assert.equal(prefix, 'PF1')
  const body = Buffer.from(payload, 'base64url')
  assert.ok(edVerify(null, Buffer.concat([Buffer.from('PF1'), body]), pixelForge.publicKey, Buffer.from(signature, 'base64url')), 'Ed25519 signature')
  const fields = JSON.parse(body.toString('utf8'))
  assert.equal(fields.id, pfKey)
  assert.equal(fields.m, 'AB12-CD34-EF56-7890')
  assert.equal(fields.t, 'full')
  assert.equal(fields.e, 'buyer@example.com')
  assert.equal(fields.x, null)
  assert.equal(Math.round((Date.parse(fields.r) - Date.parse(fields.i)) / 86400e3), 30)

  // Pixel Forge's own check (pixelforge/licensing.py), when that repository is next to this one
  const pf = new URL('../../pixel_forge/', import.meta.url)
  if (existsSync(new URL('pixelforge/licensing.py', pf))) {
    const raw = pixelForge.publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('base64url')
    const out = execFileSync('python3', ['-c', 'import sys; from pixelforge.licensing import verify; l = verify(sys.argv[1], sys.argv[2], this_machine=sys.argv[3]); print(l.licence_id)', token, raw, 'AB12-CD34-EF56-7890'], { cwd: pf, encoding: 'utf8' })
    assert.equal(out.trim(), pfKey)
  }

  // a second computer is refused until the first is freed
  res = await activate('9999-8888-7777-6666', 'Laptop')
  assert.equal(res.status, 409)
  assert.match(((await res.json()) as { error: string }).error, /another computer \(Lighting Mac\)/)
  assert.equal((await activate('AB12-CD34-EF56-7890')).status, 200) // the lease renews on the same computer
  await call('/api/licence/v1/deactivate', { method: 'POST', body: { key: pfKey, machine: 'AB12-CD34-EF56-7890' } })
  assert.equal((await activate('9999-8888-7777-6666', 'Laptop')).status, 200)
})

test('without the database, account routes say so and nothing else breaks', async () => {
  const res = await handleAccounts(new Request(`${SITE}/api/account/me`), {})
  assert.equal(res!.status, 503)
  assert.equal(await handleAccounts(new Request(`${SITE}/api/journal`), {}), null)
})
