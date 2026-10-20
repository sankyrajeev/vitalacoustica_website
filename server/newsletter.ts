// The Acoustica Edit: newsletter sign-up, with double opt-in, through Resend (the same provider as
// the enquiry emails). Subscribers are stored in a Resend audience, not on this site.
//
//   POST /api/newsletter                  { email, consent: true }  → sends a confirmation email
//   GET  /api/newsletter/confirm?…        the link in that email    → adds the contact, back to /journal
//   GET  /api/newsletter/unsubscribe?…    a signed unsubscribe link → marks the contact unsubscribed
//   POST /api/newsletter/unsubscribe?…    the same, for one-click unsubscribe from mail apps
//
// Links are signed with NEWSLETTER_SECRET, so nobody can subscribe or unsubscribe someone else.
// The answer to a sign-up is the same whether or not the address is already on the list, so the
// form can't be used to find out who subscribes. A repeat sign-up within 15 minutes sends nothing.
//
// Nothing is ever sent automatically to the list. Editions are written and sent from Resend's
// dashboard (Broadcasts), where Resend adds its own unsubscribe link. See docs/journal.md.
//
// Environment (Cloudflare → the Worker → Settings → Variables and Secrets):
//   RESEND_API_KEY      already set for the enquiry emails
//   RESEND_AUDIENCE_ID  the id of the Resend audience for The Acoustica Edit
//   NEWSLETTER_SECRET   a secret: any long random string, used to sign links
//   NEWSLETTER_FROM     optional sender; defaults to ENQUIRY_FROM
// Until the first three are set, sign-up answers 503 and the form says the newsletter opens soon.

import { newsletterConfirm } from './emails.ts'
import { BRAND } from './enquiry.ts'

export type NewsletterEnv = {
  RESEND_API_KEY?: string
  RESEND_AUDIENCE_ID?: string
  NEWSLETTER_SECRET?: string
  NEWSLETTER_FROM?: string
  ENQUIRY_FROM?: string
  SITE_URL?: string
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const CONFIRM_DAYS = 7
const RESEND = 'https://api.resend.com'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

const ready = (env: NewsletterEnv) => !!(env.RESEND_API_KEY && env.RESEND_AUDIENCE_ID && env.NEWSLETTER_SECRET && (env.NEWSLETTER_FROM || env.ENQUIRY_FROM))
const site = (env: NewsletterEnv, request: Request) => (env.SITE_URL || new URL(request.url).origin).replace(/\/$/, '')
const normalise = (email: string) => email.trim().toLowerCase()

async function sign(secret: string, message: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return btoa(String.fromCharCode(...new Uint8Array(mac)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function verify(secret: string, message: string, sig: string | null) {
  if (!sig) return false
  const expected = await sign(secret, message)
  if (expected.length !== sig.length) return false
  let diff = 0
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i)
  return diff === 0
}

/** A signed unsubscribe link for an address: put it in every edition's footer if you send outside Resend Broadcasts. */
export async function unsubscribeUrl(env: NewsletterEnv, base: string, email: string) {
  const e = normalise(email)
  return `${base}/api/newsletter/unsubscribe?email=${encodeURIComponent(e)}&sig=${await sign(env.NEWSLETTER_SECRET!, `unsubscribe:${e}`)}`
}

function resend(env: NewsletterEnv, path: string, init: RequestInit = {}) {
  return fetch(`${RESEND}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
}

const contactPath = (env: NewsletterEnv, email?: string) =>
  `/audiences/${encodeURIComponent(env.RESEND_AUDIENCE_ID!)}/contacts${email ? `/${encodeURIComponent(email)}` : ''}`

/** Is this address already subscribed (on the list and not unsubscribed)? */
async function subscribed(env: NewsletterEnv, email: string) {
  const res = await resend(env, contactPath(env, email))
  if (!res.ok) return false
  const c = (await res.json()) as { unsubscribed?: boolean }
  return c.unsubscribed === false
}

/** Adds the address to the audience, or re-subscribes it if it was there before. */
async function upsert(env: NewsletterEnv, email: string, unsubscribed: boolean) {
  if (!unsubscribed) {
    const created = await resend(env, contactPath(env), { method: 'POST', body: JSON.stringify({ email, unsubscribed: false }) })
    if (created.ok) return
  }
  const updated = await resend(env, contactPath(env, email), { method: 'PATCH', body: JSON.stringify({ unsubscribed }) })
  // unsubscribing someone who isn't on the list is already done
  if (!updated.ok && !(unsubscribed && updated.status === 404)) throw new Error(`Resend ${updated.status}: ${await updated.text()}`)
}

/** POST /api/newsletter */
export async function subscribe(request: Request, env: NewsletterEnv, ctx: ExecutionContext): Promise<Response> {
  if (!ready(env)) return json({ error: 'not_configured' }, 503)
  let raw: Record<string, unknown>
  try {
    raw = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'invalid_request' }, 400)
  }
  const email = typeof raw.email === 'string' ? normalise(raw.email) : ''
  if (!EMAIL.test(email) || email.length > 254) return json({ error: 'invalid_email' }, 400)
  if (raw.consent !== true) return json({ error: 'consent_required' }, 400)
  // the hidden field real people never fill in: say thanks, do nothing
  if (typeof raw.website === 'string' && raw.website) return json({ status: 'pending' })

  // one confirmation email per address per quarter-hour, however often the form is sent
  const base = site(env, request)
  const throttle = new Request(`${base}/__edit/pending/${await sign(env.NEWSLETTER_SECRET!, `throttle:${email}`)}`)
  if (await caches.default.match(throttle)) return json({ status: 'pending' })
  const remember = () => ctx.waitUntil(caches.default.put(throttle, new Response('1', { headers: { 'Cache-Control': 'max-age=900' } })))

  try {
    if (await subscribed(env, email)) {
      remember()
      return json({ status: 'pending' })
    }
    const ts = Date.now().toString(36)
    const confirm = `${base}/api/newsletter/confirm?email=${encodeURIComponent(email)}&ts=${ts}&sig=${await sign(env.NEWSLETTER_SECRET!, `confirm:${email}:${ts}`)}`
    const mail = newsletterConfirm({ ...BRAND, site: base }, confirm)
    const res = await resend(env, '/emails', {
      method: 'POST',
      body: JSON.stringify({ from: env.NEWSLETTER_FROM || env.ENQUIRY_FROM, to: [email], subject: mail.subject, html: mail.html, text: mail.text }),
    })
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
    remember()
    return json({ status: 'pending' })
  } catch (err) {
    console.error('newsletter: sign-up failed', err)
    return json({ error: 'send_failed' }, 502)
  }
}

const back = (base: string, state: string) => Response.redirect(`${base}/journal?edit=${state}#the-acoustica-edit`, 303)

/** GET /api/newsletter/confirm */
export async function confirm(request: Request, env: NewsletterEnv): Promise<Response> {
  const base = site(env, request)
  if (!ready(env)) return back(base, 'error')
  const url = new URL(request.url)
  const email = normalise(url.searchParams.get('email') ?? '')
  const ts = url.searchParams.get('ts') ?? ''
  const age = Date.now() - parseInt(ts, 36)
  if (!EMAIL.test(email) || !(age >= 0 && age < CONFIRM_DAYS * 86400e3)) return back(base, 'expired')
  if (!(await verify(env.NEWSLETTER_SECRET!, `confirm:${email}:${ts}`, url.searchParams.get('sig')))) return back(base, 'expired')
  try {
    await upsert(env, email, false)
    return back(base, 'confirmed')
  } catch (err) {
    console.error('newsletter: confirm failed', err)
    return back(base, 'error')
  }
}

/** GET or POST /api/newsletter/unsubscribe */
export async function unsubscribe(request: Request, env: NewsletterEnv): Promise<Response> {
  const base = site(env, request)
  const url = new URL(request.url)
  const email = normalise(url.searchParams.get('email') ?? '')
  const ok = ready(env) && EMAIL.test(email) && (await verify(env.NEWSLETTER_SECRET!, `unsubscribe:${email}`, url.searchParams.get('sig')))
  if (!ok) return request.method === 'POST' ? json({ error: 'invalid_link' }, 400) : back(base, 'error')
  try {
    await upsert(env, email, true)
    return request.method === 'POST' ? json({ status: 'unsubscribed' }) : back(base, 'unsubscribed')
  } catch (err) {
    console.error('newsletter: unsubscribe failed', err)
    return request.method === 'POST' ? json({ error: 'failed' }, 502) : back(base, 'error')
  }
}
