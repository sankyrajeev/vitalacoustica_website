// Routes for accounts, orders and licences. Everything here needs the D1 database (binding DB);
// until it's set up these routes answer 503 not_configured and the rest of the site is unaffected.

import { changePassword, currentUser, type User, forgot, googleCallback, googleStart, login, logout, reset, resetInfo, signup, verify } from './auth.ts'
import { json, notConfigured, sameOrigin, type AccountsEnv, type D1Database } from './db.ts'
import { download, listDownloads } from './downloads.ts'
import { handleAdmin, isAdmin } from './admin.ts'
import { requestBeta } from './beta.ts'
import { notifyMe } from './launch.ts'
import { activate, deactivate, feedback, licencesFor, ping, removeDevice } from './licences.ts'
import { paddleWebhook } from './paddle.ts'
import { latestVersion } from './updates.ts'

export type { AccountsEnv } from './db.ts'

const methodNotAllowed = (allow: string) => new Response('Method not allowed', { status: 405, headers: { Allow: allow } })

async function me(db: D1Database, user: User, admin: boolean) {
  const orders = (
    await db
      .prepare('SELECT id, status, currency, total, invoice_number, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 100')
      .bind(user.id)
      .all<{ id: string; status: string; currency: string | null; total: number | null; invoice_number: string | null; created_at: number }>()
  ).results
  const items = (
    await db
      .prepare('SELECT i.order_id, i.product, i.name, i.quantity FROM order_items i JOIN orders o ON o.id = i.order_id WHERE o.user_id = ?')
      .bind(user.id)
      .all<{ order_id: string; product: string; name: string; quantity: number }>()
  ).results
  return json({
    user: { id: user.id, admin, email: user.email, name: user.name, hasPassword: !!user.password_hash, google: !!user.google_sub },
    licences: await licencesFor(db, user.id),
    orders: orders.map((o) => ({
      id: o.id,
      status: o.status,
      currency: o.currency,
      total: o.total,
      invoice: o.invoice_number,
      created: o.created_at,
      items: items.filter((i) => i.order_id === o.id).map((i) => ({ product: i.product, name: i.name, quantity: i.quantity })),
    })),
  })
}

/** /api/account/*, /api/licence/*, /api/paddle/webhook. Returns null for any other address. */
export async function handleAccounts(request: Request, env: AccountsEnv): Promise<Response | null> {
  const { pathname } = new URL(request.url)
  const method = request.method
  if (!pathname.startsWith('/api/account') && !pathname.startsWith('/api/licence') && !pathname.startsWith('/api/admin') && pathname !== '/api/notify' && pathname !== '/api/beta/request' && pathname !== '/api/pixelforge/v1/latest' && pathname !== '/api/paddle/webhook') return null

  if (pathname === '/api/licence/health') return json({ ok: true, configured: !!env.DB })
  // update checks need no database
  if (pathname === '/api/pixelforge/v1/latest') return method === 'GET' || method === 'HEAD' ? latestVersion(request, env, 'pixel-forge') : methodNotAllowed('GET')
  // the shop's forms work before the database is set up too (by email to the team)
  if (pathname === '/api/beta/request' || pathname === '/api/notify') {
    if (method !== 'POST') return methodNotAllowed('POST')
    if (!sameOrigin(request, env)) return json({ error: 'forbidden' }, 403)
    return pathname === '/api/notify' ? notifyMe(request, env, env.DB) : requestBeta(request, env, env.DB)
  }

  const db = env.DB
  if (!db) return notConfigured()

  // the apps (no cookies, no Origin): JSON in, JSON out
  if (pathname === '/api/licence/v1/activate') return method === 'POST' ? activate(request, env, db) : methodNotAllowed('POST')
  if (pathname === '/api/licence/v1/feedback') return method === 'POST' ? feedback(request, db) : methodNotAllowed('POST')
  if (pathname === '/api/licence/v1/ping') return method === 'POST' ? ping(request, db) : methodNotAllowed('POST')
  if (pathname === '/api/licence/v1/deactivate') return method === 'POST' ? deactivate(request, db) : methodNotAllowed('POST')
  if (pathname === '/api/paddle/webhook') return method === 'POST' ? paddleWebhook(request, env, db) : methodNotAllowed('POST')

  // links from emails and Google: plain GETs that end in a redirect
  if (pathname === '/api/account/verify') return method === 'GET' ? verify(request, env, db) : methodNotAllowed('GET')
  if (pathname === '/api/account/google') return method === 'GET' ? googleStart(request, env) : methodNotAllowed('GET')
  if (pathname === '/api/account/reset' && method === 'GET') return resetInfo(request, db)
  if (pathname === '/api/account/google/callback') return method === 'GET' ? googleCallback(request, env, db) : methodNotAllowed('GET')

  if (method === 'POST') {
    if (!sameOrigin(request, env)) return json({ error: 'forbidden' }, 403)
    if (pathname === '/api/account/signup') return signup(request, env, db)
    if (pathname === '/api/account/login') return login(request, env, db)
    if (pathname === '/api/account/logout') return logout(request, db)
    if (pathname === '/api/account/forgot') return forgot(request, env, db)
    if (pathname === '/api/account/reset') return reset(request, db)
  }

  if (pathname.startsWith('/api/admin/')) {
    if (method === 'POST' && !sameOrigin(request, env)) return json({ error: 'forbidden' }, 403)
    return handleAdmin(request, env, db, await currentUser(db, request), pathname)
  }

  const user = await currentUser(db, request)
  const signedIn = (handler: () => Promise<Response>) => (user ? handler() : Promise.resolve(json({ error: 'signed_out' }, 401)))
  if (pathname === '/api/account/me') return method === 'GET' ? signedIn(() => me(db, user!, isAdmin(env, user))) : methodNotAllowed('GET')
  if (pathname === '/api/account/downloads') return method === 'GET' ? signedIn(() => listDownloads(request, env, db, user!.id)) : methodNotAllowed('GET')
  if (pathname === '/api/account/download') return method === 'GET' ? signedIn(() => download(request, env, db, user!.id)) : methodNotAllowed('GET')
  if (method === 'POST') {
    if (pathname === '/api/account/password') return signedIn(() => changePassword(request, db, user!))
    if (pathname === '/api/account/device/remove') return signedIn(() => removeDevice(request, db, user!.id))
  }
  return json({ error: 'not_found' }, 404)
}
