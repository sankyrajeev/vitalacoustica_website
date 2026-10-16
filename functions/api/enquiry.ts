// POST /api/enquiry — the enquiry and testimonial forms send here (a Cloudflare Pages Function).
// It checks the submission, emails our team (to, cc, with replies going to the person who wrote)
// and sends them a thank-you, through Resend. The addresses live here and in the environment,
// never in the website itself.
//
// Environment variables (Cloudflare → the Pages project → Settings → Variables and Secrets):
//   RESEND_API_KEY  required, a secret: the key from resend.com
//   ENQUIRY_FROM    required: the sender, on a domain verified in Resend,
//                   e.g. "Vital Acoustica <hello@vitalacoustica.com>"
//   ENQUIRY_TO      optional: who receives enquiries (default below)
//   ENQUIRY_CC      optional: copied on every enquiry, comma-separated (default below)
//   SITE_URL        optional: the site's address, for links and the logo in emails
// Until RESEND_API_KEY and ENQUIRY_FROM are set it answers 503, and the forms offer WhatsApp instead.

import {
  enquiryForClient,
  enquiryForTeam,
  testimonialForClient,
  testimonialForTeam,
  type Enquiry,
  type Mail,
  type Testimonial,
} from '../../server/emails.ts'

type Env = {
  RESEND_API_KEY?: string
  ENQUIRY_FROM?: string
  ENQUIRY_TO?: string
  ENQUIRY_CC?: string
  SITE_URL?: string
}

const DEFAULT_TO = 'lakshmiranganatha@thevitalvines.com'
const DEFAULT_CC = 'sankarsh@thevitalvines.com'
const BRAND = { whatsapp: '918904858422', instagram: 'vitalacoustica', x: 'vitalacoustica' } // DUMMY: confirm the X handle

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const LIMITS: Record<string, number> = { description: 4000, quote: 2000 } // characters; everything else 200

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/** Trims every field to a string of a sensible length. */
function clean(raw: Record<string, unknown>) {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v !== 'string') continue
    out[k] = v.trim().slice(0, LIMITS[k] ?? 200)
  }
  return out
}

async function send(env: Env, mail: Mail, to: string[], extra: { cc?: string[]; replyTo?: string } = {}) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.ENQUIRY_FROM,
      to,
      ...(extra.cc?.length ? { cc: extra.cc } : {}),
      ...(extra.replyTo ? { reply_to: extra.replyTo } : {}),
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
}

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  if (!env.RESEND_API_KEY || !env.ENQUIRY_FROM) return json({ ok: false, error: 'not-configured' }, 503)

  // only from our own pages
  const origin = request.headers.get('Origin')
  if (origin && new URL(origin).host !== new URL(request.url).host) return json({ ok: false, error: 'origin' }, 403)
  if (Number(request.headers.get('Content-Length') ?? 0) > 20000) return json({ ok: false, error: 'too-large' }, 413)

  let raw: Record<string, unknown>
  try {
    raw = await request.json()
  } catch {
    return json({ ok: false, error: 'bad-request' }, 400)
  }
  // the hidden field only bots fill in: pretend it worked
  if (typeof raw._gotcha === 'string' && raw._gotcha) return json({ ok: true })
  const d = clean(raw)

  const site = (env.SITE_URL || new URL(request.url).origin).replace(/\/$/, '')
  const brand = { ...BRAND, site }
  const to = (env.ENQUIRY_TO || DEFAULT_TO).split(',').map((s) => s.trim()).filter(Boolean)
  const cc = (env.ENQUIRY_CC ?? DEFAULT_CC).split(',').map((s) => s.trim()).filter(Boolean)
  const when = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) + ' IST'

  if (d.type === 'testimonial') {
    if (!d.name || !d.quote) return json({ ok: false, error: 'missing' }, 400)
    const email = EMAIL.test(d.email ?? '') ? d.email : undefined
    const t: Testimonial = { type: 'testimonial', name: d.name, email, context: d.context, publish: d.publish, quote: d.quote }
    try {
      await send(env, testimonialForTeam(t, brand, when), to, { cc, replyTo: email })
    } catch (e) {
      console.error(e)
      return json({ ok: false, error: 'send' }, 502)
    }
    if (email) await send(env, testimonialForClient(t, brand), [email], { replyTo: to[0] }).catch((e) => console.error(e))
    return json({ ok: true })
  }

  if (!d.name || !EMAIL.test(d.email ?? '')) return json({ ok: false, error: 'missing' }, 400)
  const e: Enquiry = {
    name: d.name,
    email: d.email,
    phone: d.phone,
    organisation: d.organisation,
    eventType: d.eventType,
    date: d.date,
    location: d.location,
    audience: d.audience,
    services: d.services,
    budget: d.budget,
    description: d.description,
  }
  try {
    // the team's copy must go; the thank-you is a courtesy
    await send(env, enquiryForTeam(e, brand, when), to, { cc, replyTo: e.email })
  } catch (err) {
    console.error(err)
    return json({ ok: false, error: 'send' }, 502)
  }
  await send(env, enquiryForClient(e, brand), [e.email], { replyTo: to[0] }).catch((err) => console.error(err))
  return json({ ok: true })
}
