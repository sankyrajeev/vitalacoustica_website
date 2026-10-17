// The emails sent when someone uses the enquiry or testimonial form: one to our team, and a
// thank-you to the person who wrote. Plain HTML tables with inline styles, because that is what
// email apps render reliably; every value from the form is escaped before it goes in.

export type Enquiry = {
  type?: 'enquiry'
  name: string
  email: string
  phone?: string
  organisation?: string
  eventType?: string
  date?: string
  location?: string
  audience?: string
  services?: string
  budget?: string
  description?: string
}

export type Testimonial = {
  type: 'testimonial'
  name: string
  email?: string
  context?: string
  publish?: string
  quote: string
}

export type Mail = { subject: string; html: string; text: string }

type Brand = { site: string; whatsapp: string; instagram: string; x: string }

const C = {
  page: '#0b0b0a',
  card: '#151513',
  line: '#2a2925',
  ink: '#f0ede5',
  soft: '#bdb8ad',
  muted: '#8a857b',
  brass: '#b8a47b',
}
const SERIF = `Georgia, 'Times New Roman', serif`
const SANS = `-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`

export const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const para = (s = '') => esc(s.trim()).replace(/\n/g, '<br>')
const first = (name: string) => name.trim().split(/\s+/)[0] || 'there'
const wa = (digits: string, text: string) => `https://wa.me/${digits}?text=${encodeURIComponent(text)}`

/* ─────────────── building blocks ─────────────── */

/**
 * The design is dark in every mode. Some apps (Gmail and Outlook in dark mode) recolour emails by
 * inverting their background colours, which turns a dark email light; a background image, even a
 * flat one, is left alone. So each dark surface carries its colour three ways: the bgcolor
 * attribute, background-color, and a one-colour gradient image.
 */
const LOCK = (hex: string) => `background-image:linear-gradient(${hex},${hex});`


function shell(b: Brand, preheader: string, body: string, footnote: string) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Vital Acoustica</title>
<style>
:root { color-scheme: light dark; supported-color-schemes: light dark; }
body, .page { background-color: ${C.page} !important; }
</style>
</head>
<body class="body" bgcolor="${C.page}" style="margin:0;padding:0;background-color:${C.page};${LOCK(C.page)}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;</div>
<table role="presentation" class="page" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background-color:${C.page};${LOCK(C.page)}">
<tr><td align="center" bgcolor="${C.page}" style="padding:32px 16px;background-color:${C.page};${LOCK(C.page)}">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr><td style="padding:8px 4px 28px;">
<a href="${b.site}" style="text-decoration:none;"><img src="${b.site}/brand/logo-full-white.png" width="180" alt="VITAL ACOUSTICA" style="display:block;width:180px;max-width:60%;height:auto;border:0;color:${C.ink};font:600 18px ${SANS};letter-spacing:3px;"></a>
</td></tr>
<tr><td bgcolor="${C.card}" style="background-color:${C.card};${LOCK(C.card)}border:1px solid ${C.line};border-radius:10px;padding:36px 32px;">
${body}
</td></tr>
<tr><td style="padding:28px 4px 8px;font:600 11px ${SANS};letter-spacing:2.5px;text-transform:uppercase;color:${C.brass};">
Sound. Light. Space. Connected.
</td></tr>
<tr><td style="padding:0 4px 8px;font:13px/1.6 ${SANS};color:${C.muted};">
<a href="${b.site}" style="color:${C.soft};text-decoration:none;">vitalacoustica.com</a>
${b.instagram ? ` &nbsp;·&nbsp; <a href="https://instagram.com/${b.instagram}" style="color:${C.soft};text-decoration:none;">Instagram</a>` : ''}
${b.x ? ` &nbsp;·&nbsp; <a href="https://x.com/${b.x}" style="color:${C.soft};text-decoration:none;">X</a>` : ''}
</td></tr>
<tr><td style="padding:0 4px;font:12px/1.6 ${SANS};color:${C.muted};">${footnote}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

const label = (s: string) =>
  `<p style="margin:0 0 14px;font:600 11px ${SANS};letter-spacing:2.5px;text-transform:uppercase;color:${C.brass};">${esc(s)}</p>`
const headline = (s: string) =>
  `<h1 style="margin:0 0 16px;font:400 34px/1.1 ${SERIF};color:${C.ink};">${s}</h1>`
const text = (s: string) => `<p style="margin:0 0 16px;font:15px/1.65 ${SANS};color:${C.soft};">${s}</p>`

/** A two-column table of the details that were filled in. */
function facts(rows: [string, string | undefined][]) {
  const filled = rows.filter(([, v]) => v && v.trim())
  if (!filled.length) return ''
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;border-top:1px solid ${C.line};">
${filled
  .map(
    ([k, v]) => `<tr>
<td style="padding:11px 12px 11px 0;border-bottom:1px solid ${C.line};font:600 11px ${SANS};letter-spacing:1.5px;text-transform:uppercase;color:${C.muted};width:34%;vertical-align:top;">${esc(k)}</td>
<td style="padding:11px 0;border-bottom:1px solid ${C.line};font:15px/1.5 ${SANS};color:${C.ink};vertical-align:top;">${para(v)}</td>
</tr>`,
  )
  .join('\n')}
</table>`
}

function quote(s: string) {
  return `<div style="margin:0 0 24px;padding:4px 0 4px 18px;border-left:2px solid ${C.brass};font:16px/1.65 ${SANS};color:${C.ink};">${para(s)}</div>`
}

function button(href: string, label: string, primary = true) {
  return `<a href="${esc(href)}" style="display:inline-block;margin:0 8px 10px 0;padding:13px 22px;border-radius:999px;${
    primary ? `background:${C.ink};color:#111;` : `border:1px solid ${C.line};color:${C.ink};`
  }font:600 12px ${SANS};letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;">${esc(label)}</a>`
}

const plain = (lines: (string | false | undefined)[]) => lines.filter((l) => l !== false && l !== undefined).join('\n')

/* ─────────────── enquiry ─────────────── */

const enquiryFacts = (e: Enquiry): [string, string | undefined][] => [
  ['Event', e.eventType],
  ['Date', e.date],
  ['Location', e.location],
  ['Audience', e.audience],
  ['Services', e.services],
  ['Budget', e.budget],
]

/** To our team: everything in the enquiry, with ways to reply. */
export function enquiryForTeam(e: Enquiry, b: Brand, when: string): Mail {
  const phoneDigits = (e.phone ?? '').replace(/[^\d]/g, '')
  const waDigits = phoneDigits.length === 10 ? `91${phoneDigits}` : phoneDigits
  const who = [e.name, e.organisation].filter(Boolean).join(' · ')
  const subject = `New enquiry: ${[e.eventType, e.name].filter(Boolean).join(' · ')}`
  const body = `${label('New enquiry')}
${headline(esc(e.name))}
${e.organisation ? text(esc(e.organisation)) : ''}
${facts(enquiryFacts(e))}
${e.description?.trim() ? `${label('Their message')}${quote(e.description)}` : ''}
${label('Contact')}
${facts([
  ['Email', e.email],
  ['Phone', e.phone],
])}
<div style="padding-top:4px;">
${button(`mailto:${e.email}?subject=${encodeURIComponent(`Re: your enquiry${e.eventType ? `, ${e.eventType}` : ''}`)}`, `Reply to ${first(e.name)}`)}
${waDigits.length >= 10 ? button(wa(waDigits, `Hi ${first(e.name)}, this is Vital Acoustica about your enquiry. `), 'WhatsApp them', false) : ''}
</div>`
  return {
    subject,
    html: shell(b, `${who}${e.date ? ` · ${e.date}` : ''}`, body, `Sent from the enquiry form on vitalacoustica.com, ${esc(when)}. Replying to this email goes straight to ${esc(first(e.name))}.`),
    text: plain([
      'New enquiry',
      '',
      `Name: ${e.name}`,
      e.organisation && `Organisation: ${e.organisation}`,
      ...enquiryFacts(e).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
      '',
      e.description?.trim() && `Message:\n${e.description.trim()}\n`,
      `Email: ${e.email}`,
      e.phone && `Phone: ${e.phone}`,
      '',
      `Sent ${when}. Reply to this email to answer them directly.`,
    ]),
  }
}

/** To the person who enquired: a thank-you, what they sent, and what happens next. */
export function enquiryForClient(e: Enquiry, b: Brand): Mail {
  const steps = [
    ['01', 'We read your brief', 'Every enquiry is read by the team, not a machine.'],
    ['02', 'We get in touch', 'With questions about the space and the night, and first ideas.'],
    ['03', 'A plan for your event', 'Sound, light and production shaped around what you need.'],
  ]
  const body = `${label('Enquiry received')}
${headline(`Thank you, ${esc(first(e.name))}.`)}
${text('Your enquiry is with our team. We read every one personally, and we’ll be in touch soon to talk through the space, the night and what it needs.')}
${facts(enquiryFacts(e))}
${e.description?.trim() ? `${label('Your message')}${quote(e.description)}` : ''}
${label('What happens next')}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
${steps
  .map(
    ([n, t, d]) => `<tr>
<td style="padding:8px 14px 8px 0;font:600 12px ${SANS};letter-spacing:1.5px;color:${C.brass};vertical-align:top;width:28px;">${n}</td>
<td style="padding:8px 0;font:15px/1.5 ${SANS};color:${C.soft};"><strong style="color:${C.ink};font-weight:600;">${t}</strong><br>${d}</td>
</tr>`,
  )
  .join('\n')}
</table>
${b.whatsapp ? button(wa(b.whatsapp, `Hi Vital Acoustica, I just sent an enquiry (${e.name}). `), 'Chat on WhatsApp') : ''}
${button(`${b.site}/equipment`, 'Explore our rig', false)}`
  return {
    subject: `We’ve got your enquiry, ${first(e.name)}`,
    html: shell(
      b,
      'Your enquiry is with our team. Here’s what you sent us.',
      body,
      'You’re receiving this because you sent an enquiry on vitalacoustica.com. To add anything, just reply to this email.',
    ),
    text: plain([
      `Thank you, ${first(e.name)}.`,
      '',
      'Your enquiry is with our team. We read every one personally, and we’ll be in touch soon.',
      '',
      ...enquiryFacts(e).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
      e.description?.trim() && `\nYour message:\n${e.description.trim()}`,
      '',
      'To add anything, just reply to this email.',
      '',
      'Vital Acoustica · Sound. Light. Space. Connected.',
      b.site,
    ]),
  }
}

/* ─────────────── testimonial ─────────────── */

export function testimonialForTeam(t: Testimonial, b: Brand, when: string): Mail {
  const body = `${label('New testimonial')}
${headline(esc(t.name))}
${t.context ? text(esc(t.context)) : ''}
${quote(t.quote)}
${facts([
  ['Publishing', t.publish],
  ['Email', t.email],
])}
${t.email ? button(`mailto:${t.email}?subject=${encodeURIComponent('Thank you for your words')}`, `Reply to ${first(t.name)}`) : ''}`
  return {
    subject: `New testimonial from ${t.name}`,
    html: shell(b, t.quote.slice(0, 120), body, `Sent from the testimonials page on vitalacoustica.com, ${esc(when)}.`),
    text: plain([
      'New testimonial',
      '',
      `${t.name}${t.context ? `, ${t.context}` : ''}`,
      '',
      t.quote.trim(),
      '',
      `Publishing: ${t.publish ?? 'not stated'}`,
      t.email && `Email: ${t.email}`,
      '',
      `Sent ${when}.`,
    ]),
  }
}

export function testimonialForClient(t: Testimonial, b: Brand): Mail {
  const body = `${label('Thank you')}
${headline(`Thank you, ${esc(first(t.name))}.`)}
${text('Your words mean a lot to the whole crew. Here’s what you sent us:')}
${quote(t.quote)}
${text(
  t.publish?.startsWith('Yes')
    ? 'You said we may publish it. We’ll let you know before it goes up on the site.'
    : 'You asked us to keep it private, so it stays with the team.',
)}
${button(b.site, 'Visit the site', false)}`
  return {
    subject: `Thank you, ${first(t.name)}`,
    html: shell(b, 'Your words mean a lot to the whole crew.', body, 'You’re receiving this because you sent us a testimonial on vitalacoustica.com.'),
    text: plain([`Thank you, ${first(t.name)}.`, '', 'Your words mean a lot to the whole crew.', '', t.quote.trim(), '', b.site]),
  }
}
