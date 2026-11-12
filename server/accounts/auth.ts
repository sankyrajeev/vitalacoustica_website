// Customer accounts: sign-up with email verification, sign-in by password or Google, password
// reset, sessions. Routes under /api/account/ (see handleAccount in ./index.ts).
//
// Sessions are a random token in an HttpOnly, Secure, SameSite=Lax cookie; the database keeps
// only its SHA-256. Every route that changes something accepts JSON from our own pages only.

import { accountExists, accountReset, accountVerify } from '../emails.ts'
import { b64url, checkPassword, hashPassword, newId, randomToken, sha256Hex } from './crypto.ts'
import { clientIp, json, limited, now, readJson, siteUrl, type AccountsEnv, type D1Database } from './db.ts'
import { brand, sendMail } from './mail.ts'

const COOKIE = 'va_session'
const SESSION_DAYS = 30
const VERIFY_HOURS = 24
const RESET_HOURS = 1
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const CLIENT_HASH = /^[0-9a-f]{64}$/ // what the browser sends instead of the password

export type User = { id: string; email: string; name: string | null; password_hash: string | null; google_sub: string | null; email_verified: number }

const cookieValue = (request: Request, name: string) =>
  (request.headers.get('Cookie') || '')
    .split(';')
    .map((c) => c.trim().split('='))
    .find(([k]) => k === name)?.[1]

const sessionCookie = (token: string, maxAge: number) =>
  `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`

export async function startSession(db: D1Database, userId: string) {
  const token = randomToken()
  await db
    .prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256Hex(token), userId, now(), now() + SESSION_DAYS * 86400)
    .run()
  return sessionCookie(token, SESSION_DAYS * 86400)
}

/** The signed-in user, or null. */
export async function currentUser(db: D1Database, request: Request): Promise<User | null> {
  const token = cookieValue(request, COOKIE)
  if (!token || token.length > 100) return null
  return db
    .prepare(
      `SELECT u.id, u.email, u.name, u.password_hash, u.google_sub, u.email_verified FROM sessions s
       JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .bind(await sha256Hex(token), now())
    .first<User>()
}

async function newEmailToken(db: D1Database, userId: string, purpose: 'verify' | 'reset', hours: number) {
  const token = randomToken()
  await db
    .prepare('INSERT INTO email_tokens (token_hash, user_id, purpose, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256Hex(token), userId, purpose, now() + hours * 3600)
    .run()
  return token
}

/** Uses up a one-time email token; returns its user id if it was valid. */
async function takeEmailToken(db: D1Database, token: string, purpose: 'verify' | 'reset') {
  if (!token || token.length > 100) return null
  const row = await db
    .prepare('DELETE FROM email_tokens WHERE token_hash = ? AND purpose = ? RETURNING user_id, expires_at')
    .bind(await sha256Hex(token), purpose)
    .first<{ user_id: string; expires_at: number }>()
  return row && row.expires_at > now() ? row.user_id : null
}

/** Licences and orders bought with this email before the account existed (or while signed out) join it. */
export async function claimPurchases(db: D1Database, userId: string, email: string) {
  await db.batch([
    db.prepare('UPDATE licences SET user_id = ? WHERE user_id IS NULL AND email = ?').bind(userId, email),
    db.prepare('UPDATE orders SET user_id = ? WHERE user_id IS NULL AND email = ?').bind(userId, email),
  ])
}

async function sendVerification(env: AccountsEnv, db: D1Database, site: string, user: { id: string; email: string; name: string | null }) {
  const token = await newEmailToken(db, user.id, 'verify', VERIFY_HOURS)
  await sendMail(env, user.email, accountVerify(brand(site), `${site}/api/account/verify?token=${token}`, user.name ?? ''))
}

const normaliseEmail = (e: unknown) => (typeof e === 'string' ? e.trim().toLowerCase() : '')

/* ─────────────── routes ─────────────── */

export async function signup(request: Request, env: AccountsEnv, db: D1Database) {
  const body = await readJson<{ email?: string; name?: string; password?: string }>(request)
  const email = normaliseEmail(body?.email)
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 80) : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!EMAIL.test(email) || email.length > 254) return json({ error: 'invalid_email' }, 400)
  if (!CLIENT_HASH.test(password)) return json({ error: 'invalid_password' }, 400)
  if (await limited(db, `signup:${clientIp(request)}`, 10, 3600)) return json({ error: 'rate_limited' }, 429)
  const site = siteUrl(env, request)
  const existing = await db.prepare('SELECT id, email_verified FROM users WHERE email = ?').bind(email).first<{ id: string; email_verified: number }>()
  if (existing) {
    // the same answer either way, so the form can't be used to find out who has an account
    if (!(await limited(db, `exists-mail:${email}`, 2, 3600)))
      await sendMail(env, email, accountExists(brand(site), `${site}/account`, `${site}/account/forgot`))
    return json({ status: 'check_email' })
  }
  const id = newId()
  await db
    .prepare('INSERT INTO users (id, email, name, password_hash, email_verified, created_at) VALUES (?, ?, ?, ?, 0, ?)')
    .bind(id, email, name || null, await hashPassword(password), now())
    .run()
  await sendVerification(env, db, site, { id, email, name })
  return json({ status: 'check_email' })
}

export async function verify(request: Request, env: AccountsEnv, db: D1Database) {
  const site = siteUrl(env, request)
  const userId = await takeEmailToken(db, new URL(request.url).searchParams.get('token') || '', 'verify')
  if (!userId) return Response.redirect(`${site}/account?notice=link_expired`, 303)
  const user = await db.prepare('UPDATE users SET email_verified = 1 WHERE id = ? RETURNING email').bind(userId).first<{ email: string }>()
  if (!user) return Response.redirect(`${site}/account?notice=link_expired`, 303)
  await claimPurchases(db, userId, user.email)
  const cookie = await startSession(db, userId)
  return new Response(null, { status: 303, headers: { Location: `${site}/account?notice=verified`, 'Set-Cookie': cookie } })
}

export async function login(request: Request, env: AccountsEnv, db: D1Database) {
  const body = await readJson<{ email?: string; password?: string }>(request)
  const email = normaliseEmail(body?.email)
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!EMAIL.test(email) || !CLIENT_HASH.test(password)) return json({ error: 'invalid_credentials' }, 400)
  if ((await limited(db, `login-ip:${clientIp(request)}`, 30, 900)) || (await limited(db, `login:${email}`, 8, 900)))
    return json({ error: 'rate_limited' }, 429)
  const user = await db.prepare('SELECT id, email, name, password_hash, email_verified FROM users WHERE email = ?').bind(email).first<User>()
  if (!user || !(await checkPassword(password, user.password_hash))) return json({ error: 'invalid_credentials' }, 401)
  if (!user.email_verified) {
    if (!(await limited(db, `verify-mail:${email}`, 3, 3600))) await sendVerification(env, db, siteUrl(env, request), user)
    return json({ error: 'unverified' }, 403)
  }
  return json({ status: 'signed_in' }, 200, { 'Set-Cookie': await startSession(db, user.id) })
}

export async function logout(request: Request, db: D1Database) {
  const token = cookieValue(request, COOKIE)
  if (token) await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run()
  return json({ status: 'signed_out' }, 200, { 'Set-Cookie': sessionCookie('', 0) })
}

export async function forgot(request: Request, env: AccountsEnv, db: D1Database) {
  const body = await readJson<{ email?: string }>(request)
  const email = normaliseEmail(body?.email)
  if (!EMAIL.test(email)) return json({ error: 'invalid_email' }, 400)
  if ((await limited(db, `forgot-ip:${clientIp(request)}`, 10, 3600)) || (await limited(db, `forgot:${email}`, 3, 3600)))
    return json({ status: 'check_email' }) // quietly: no more emails this hour
  const user = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>()
  if (user) {
    const site = siteUrl(env, request)
    const token = await newEmailToken(db, user.id, 'reset', RESET_HOURS)
    await sendMail(env, email, accountReset(brand(site), `${site}/account/reset?token=${token}`))
  }
  return json({ status: 'check_email' })
}

/** GET /api/account/reset?token=… → the account's email, which the page needs to hash the new password. */
export async function resetInfo(request: Request, db: D1Database) {
  const token = new URL(request.url).searchParams.get('token') || ''
  if (!token || token.length > 100) return json({ error: 'link_expired' }, 400)
  const row = await db
    .prepare(`SELECT u.email FROM email_tokens t JOIN users u ON u.id = t.user_id WHERE t.token_hash = ? AND t.purpose = 'reset' AND t.expires_at > ?`)
    .bind(await sha256Hex(token), now())
    .first<{ email: string }>()
  return row ? json({ email: row.email }) : json({ error: 'link_expired' }, 400)
}

export async function reset(request: Request, db: D1Database) {
  const body = await readJson<{ token?: string; password?: string }>(request)
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!CLIENT_HASH.test(password)) return json({ error: 'invalid_password' }, 400)
  const userId = await takeEmailToken(db, typeof body?.token === 'string' ? body.token : '', 'reset')
  if (!userId) return json({ error: 'link_expired' }, 400)
  // a reset proves the email address, and signs out every other session
  const user = await db
    .prepare('UPDATE users SET password_hash = ?, email_verified = 1 WHERE id = ? RETURNING email')
    .bind(await hashPassword(password), userId)
    .first<{ email: string }>()
  await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run()
  if (user) await claimPurchases(db, userId, user.email)
  return json({ status: 'signed_in' }, 200, { 'Set-Cookie': await startSession(db, userId) })
}

/** Change the password while signed in (or set one on a Google-only account). */
export async function changePassword(request: Request, db: D1Database, user: User) {
  const body = await readJson<{ current?: string; next?: string }>(request)
  const next = typeof body?.next === 'string' ? body.next : ''
  if (!CLIENT_HASH.test(next)) return json({ error: 'invalid_password' }, 400)
  if (user.password_hash && !(await checkPassword(typeof body?.current === 'string' ? body.current : '', user.password_hash)))
    return json({ error: 'wrong_password' }, 403)
  await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(await hashPassword(next), user.id).run()
  const token = cookieValue(request, COOKIE)
  // sign out everywhere else
  await db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').bind(user.id, token ? await sha256Hex(token) : '').run()
  return json({ status: 'changed' })
}

/* ─────────────── Google ─────────────── */

const OAUTH_COOKIE = 'va_oauth'

export async function googleStart(request: Request, env: AccountsEnv) {
  const site = siteUrl(env, request)
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return Response.redirect(`${site}/account?notice=google_unavailable`, 303)
  const state = randomToken(16)
  const verifier = randomToken(32)
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${site}/api/account/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString()
  return new Response(null, {
    status: 303,
    headers: {
      Location: url.toString(),
      'Set-Cookie': `${OAUTH_COOKIE}=${state}.${verifier}; Path=/api/account/google; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  })
}

type GoogleClaims = { iss: string; aud: string; exp: number; sub: string; email?: string; email_verified?: boolean; name?: string }

export async function googleCallback(request: Request, env: AccountsEnv, db: D1Database) {
  const site = siteUrl(env, request)
  const fail = (why: string) =>
    new Response(null, { status: 303, headers: { Location: `${site}/account?notice=${why}`, 'Set-Cookie': `${OAUTH_COOKIE}=; Path=/api/account/google; Max-Age=0` } })
  const url = new URL(request.url)
  const [state, verifier] = (cookieValue(request, OAUTH_COOKIE) || '').split('.')
  if (!state || !verifier || url.searchParams.get('state') !== state || !url.searchParams.get('code')) return fail('google_failed')
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return fail('google_unavailable')

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: url.searchParams.get('code')!,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${site}/api/account/google/callback`,
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
  })
  if (!tokenRes.ok) return fail('google_failed')
  const { id_token } = (await tokenRes.json()) as { id_token?: string }
  // The ID token came straight from Google over TLS, in exchange for our secret, so its claims can be
  // read without checking its signature (OpenID Connect Core 3.1.3.7); its audience, issuer and expiry are still checked.
  let claims: GoogleClaims
  try {
    claims = JSON.parse(atob((id_token || '').split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as GoogleClaims
  } catch {
    return fail('google_failed')
  }
  if (
    claims.aud !== env.GOOGLE_CLIENT_ID ||
    !['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss) ||
    claims.exp < now() ||
    !claims.email ||
    claims.email_verified !== true
  )
    return fail('google_failed')

  const email = claims.email.toLowerCase()
  let user =
    (await db.prepare('SELECT id, email, email_verified FROM users WHERE google_sub = ?').bind(claims.sub).first<User>()) ??
    (await db.prepare('SELECT id, email, email_verified FROM users WHERE email = ?').bind(email).first<User>())
  if (user) {
    // Google has proved the address. If the account's own address was never confirmed, someone else
    // may have set its password, so that password is removed: the owner can set a new one.
    await db
      .prepare(`UPDATE users SET google_sub = ?, email_verified = 1, password_hash = CASE WHEN email_verified = 1 THEN password_hash ELSE NULL END WHERE id = ?`)
      .bind(claims.sub, user.id)
      .run()
  } else {
    const id = newId()
    await db
      .prepare('INSERT INTO users (id, email, name, google_sub, email_verified, created_at) VALUES (?, ?, ?, ?, 1, ?)')
      .bind(id, email, claims.name?.slice(0, 80) ?? null, claims.sub, now())
      .run()
    user = { id, email, name: null, password_hash: null, google_sub: claims.sub, email_verified: 1 }
  }
  await claimPurchases(db, user.id, email)
  const headers = new Headers({ Location: `${site}/account` })
  headers.append('Set-Cookie', await startSession(db, user.id))
  headers.append('Set-Cookie', `${OAUTH_COOKIE}=; Path=/api/account/google; Max-Age=0`)
  return new Response(null, { status: 303, headers })
}
