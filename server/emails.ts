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

function shell(b: Brand, preheader: string, body: string, footnote: string, privacy = false) {
  // a reference unique to this email, so Gmail never folds its ending away as a repeat of an earlier one
  const ref = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
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
<tr><td style="padding:0 0 10px;">
<a href="${b.site}/equipment" style="text-decoration:none;"><img src="${b.site}/media/email-stage.jpg" width="600" alt="Our stage as a 3D model: beam lights on the truss, the lighting wings and the DJ booth" style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:10px;color:${C.muted};font:13px ${SANS};"></a>
</td></tr>
<tr><td style="padding:0 4px 22px;font:600 10px ${SANS};letter-spacing:2px;text-transform:uppercase;color:${C.muted};">
Our rig, modelled in 3D &nbsp;·&nbsp; <a href="${b.site}/equipment" style="color:${C.brass};text-decoration:none;">Explore it &rarr;</a>
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
${
  privacy
    ? `<tr><td style="padding:10px 4px 0;font:12px/1.6 ${SANS};color:${C.muted};">We use your details only to reply to you and plan your event, and never share them. <a href="${b.site}/privacy" style="color:${C.soft};text-decoration:underline;">Privacy notice</a></td></tr>`
    : ''
}
<tr><td style="padding:14px 4px 0;font:11px/1.6 ${SANS};color:${C.muted};">&copy; ${new Date().getFullYear()} Vital Acoustica<span style="display:none;font-size:0;line-height:0;max-height:0;max-width:0;opacity:0;overflow:hidden;">${ref}</span></td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

const label = (s: string) =>
  `<p style="margin:0 0 14px;font:600 11px ${SANS};letter-spacing:2.5px;text-transform:uppercase;color:${C.brass};">${esc(s)}</p>`
const headline = (s: string) => `<h1 style="margin:0 0 16px;font:400 34px/1.1 ${SERIF};color:${C.ink};">${s}</h1>`
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
    html: shell(
      b,
      `${who}${e.date ? ` · ${e.date}` : ''}`,
      body,
      `Sent from the enquiry form on vitalacoustica.com, ${esc(when)}. Replying to this email goes straight to ${esc(first(e.name))}.`,
    ),
    text: plain([
      'New enquiry',
      '',
      `Name: ${e.name}`,
      e.organisation && `Organisation: ${e.organisation}`,
      ...enquiryFacts(e)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`),
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
      'You’re receiving this because you sent an enquiry on vitalacoustica.com. To add anything, reply to this email and it goes straight to our team.',
      true,
    ),
    text: plain([
      `Thank you, ${first(e.name)}.`,
      '',
      'Your enquiry is with our team. We read every one personally, and we’ll be in touch soon.',
      '',
      ...enquiryFacts(e)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`),
      e.description?.trim() && `\nYour message:\n${e.description.trim()}`,
      '',
      'To add anything, reply to this email and it goes straight to our team.',
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
    html: shell(
      b,
      'Your words mean a lot to the whole crew.',
      body,
      'You’re receiving this because you sent us a testimonial on vitalacoustica.com.',
      true,
    ),
    text: plain([`Thank you, ${first(t.name)}.`, '', 'Your words mean a lot to the whole crew.', '', t.quote.trim(), '', b.site]),
  }
}

/* ─────────────── The Acoustica Edit ─────────────── */

/** Asks a new subscriber to confirm: nobody is added to the list until they click. */
export function newsletterConfirm(b: Brand, confirmUrl: string): Mail {
  const body = `${label('The Acoustica Edit')}
${headline('One click to confirm.')}
${text('Thank you for signing up to The Acoustica Edit: a considered perspective on sound, light and live production, with selected Journal articles, verified industry news and genuine production updates.')}
${text('Please confirm that this is your address. Until you do, you won’t receive anything from us.')}
${button(confirmUrl, 'Confirm my subscription')}
${text('If you didn’t sign up, ignore this email: you won’t be added, and we won’t write again. The link works for seven days.')}
<p style="margin:8px 0 0;font:13px/1.6 ${SANS};color:${C.muted};">Every edition has an unsubscribe link. <a href="${b.site}/privacy" style="color:${C.soft};text-decoration:underline;">How we use your email</a></p>`
  return {
    subject: 'Confirm your subscription to The Acoustica Edit',
    html: shell(
      b,
      'Confirm your subscription to The Acoustica Edit.',
      body,
      'You’re receiving this because this address was entered to subscribe to The Acoustica Edit on vitalacoustica.com.',
    ),
    text: plain([
      'The Acoustica Edit',
      '',
      'Thank you for signing up. Please confirm your address by opening this link (it works for seven days):',
      confirmUrl,
      '',
      'If you didn’t sign up, ignore this email: you won’t be added.',
      `How we use your email: ${b.site}/privacy`,
    ]),
  }
}

/* ─────────────── Accounts ─────────────── */

const ACCOUNT_NOTE = 'You’re receiving this because of your account on vitalacoustica.com.'

/** Confirms a new account's email address. */
export function accountVerify(b: Brand, link: string, name: string): Mail {
  const body = `${label('Your account')}
${headline(`Welcome${name ? `, ${esc(first(name))}` : ''}.`)}
${text('Please confirm your email address to finish setting up your Vital Acoustica account. Your orders, licence keys and downloads will be waiting inside.')}
${button(link, 'Confirm my email')}
${text('The link works for 24 hours. If you didn’t create an account, ignore this email.')}`
  return {
    subject: 'Confirm your email for Vital Acoustica',
    html: shell(b, 'Confirm your email to finish setting up your account.', body, ACCOUNT_NOTE),
    text: plain(['Confirm your email to finish setting up your Vital Acoustica account (the link works for 24 hours):', link, '', 'If you didn’t create an account, ignore this email.']),
  }
}

/** Sent when someone tries to sign up with an address that already has an account. */
export function accountExists(b: Brand, signIn: string, reset: string): Mail {
  const body = `${label('Your account')}
${headline('You already have an account.')}
${text('Someone, probably you, tried to create a Vital Acoustica account with this email address. You already have one: sign in, or reset your password if you’ve forgotten it.')}
${button(signIn, 'Sign in')}${button(reset, 'Reset password', false)}
${text('If this wasn’t you, you can ignore this email. Your account hasn’t changed.')}`
  return {
    subject: 'You already have a Vital Acoustica account',
    html: shell(b, 'You already have an account with this email address.', body, ACCOUNT_NOTE),
    text: plain(['You already have a Vital Acoustica account with this email address.', `Sign in: ${signIn}`, `Reset your password: ${reset}`]),
  }
}

/** A password reset link. */
export function accountReset(b: Brand, link: string): Mail {
  const body = `${label('Your account')}
${headline('Reset your password.')}
${text('Use the button below to choose a new password. For your security, this signs you out everywhere else.')}
${button(link, 'Choose a new password')}
${text('The link works for one hour. If you didn’t ask to reset your password, ignore this email: nothing changes.')}`
  return {
    subject: 'Reset your Vital Acoustica password',
    html: shell(b, 'Choose a new password for your account.', body, ACCOUNT_NOTE),
    text: plain(['Choose a new password (the link works for one hour):', link, '', 'If you didn’t ask for this, ignore this email.']),
  }
}

/** The licence keys from an order. */
const NUMBERS = ['no', 'one', 'two', 'three', 'four', 'five']
const computers = (n: number) => `${NUMBERS[n] ?? n} computer${n === 1 ? '' : 's'}`

/** How many computers each product's keys work on, in a sentence. */
function deviceRule(keys: { product: string; devices: number }[]) {
  const byProduct = [...new Map(keys.map((k) => [k.product, k.devices])).entries()]
  if (new Set(byProduct.map(([, n]) => n)).size === 1) return `Each key works on ${computers(byProduct[0][1])} at a time`
  return byProduct.map(([p, n]) => `${p} works on ${computers(n)} at a time`).join('; ')
}

export function licenceDelivery(b: Brand, keys: { product: string; key: string; devices: number }[], accountLink: string): Mail {
  const rows = keys
    .map(
      (k) =>
        `<tr><td style="padding:12px 0;border-bottom:1px solid ${C.line};font:600 11px ${SANS};letter-spacing:1.5px;text-transform:uppercase;color:${C.muted};width:34%;">${esc(k.product)}</td><td style="padding:12px 0;border-bottom:1px solid ${C.line};font:600 16px/1.4 'SFMono-Regular',Menlo,Consolas,monospace;letter-spacing:1px;color:${C.ink};">${esc(k.key)}</td></tr>`,
    )
    .join('')
  const body = `${label('Thank you')}
${headline('Your licence keys.')}
${text(`Thank you for your order. Install the software, open it, and paste your key when it asks to activate. ${deviceRule(keys)}, and you can move it from your account.`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;border-top:1px solid ${C.line};">${rows}</table>
${text('Your keys, downloads and order history are always in your account. Sign in with this email address; if you don’t have an account yet, create one with this address and everything will be there.')}
${button(accountLink, 'Open my account')}`
  return {
    subject: 'Your Vital Acoustica licence keys',
    html: shell(b, 'Your licence keys and downloads are ready.', body, 'You’re receiving this because you bought software from vitalacoustica.com. Keep this email: it has your licence keys.'),
    text: plain(['Thank you for your order. Your licence keys:', ...keys.map((k) => `${k.product}: ${k.key}`), '', `Your account: ${accountLink}`]),
  }
}

/**
 * A licensed computer hasn't checked in for a while: it needs the internet before its licence
 * lease runs out, or its output pauses until it does (Pixel Forge).
 */
export function leaseReminder(b: Brand, r: { product: string; computer: string; until: string; daysLeft: number }, accountLink: string): Mail {
  const when = r.daysLeft <= 1 ? 'by tomorrow' : `within ${r.daysLeft} days`
  const body = `${label('Your licence')}
${headline(`Connect ${esc(r.computer)} to the internet.`)}
${text(`${esc(r.product)} on ${esc(r.computer)} hasn’t been online for a while. It confirms its licence with us whenever it’s connected, and it needs to do that ${when} (by ${esc(r.until)}). If it doesn’t, ${esc(r.product)} keeps running but stops sending to your lights until it’s back online.`)}
${text('Just open it on that computer with an internet connection; nothing else to do. If you no longer use that computer, remove it in your account so you can activate another one.')}
${button(accountLink, 'Open my account')}`
  return {
    subject: `${r.product} on ${r.computer} needs to go online ${when}`,
    html: shell(b, `Open ${r.product} on ${r.computer} with an internet connection by ${r.until}.`, body, 'You’re receiving this because you own a licence for software from vitalacoustica.com.'),
    text: plain([
      `${r.product} on ${r.computer} hasn't been online for a while. Open it on that computer with an internet connection ${when} (by ${r.until}).`,
      `If it doesn't, ${r.product} keeps running but stops sending to your lights until it's back online.`,
      '',
      `Your account: ${accountLink}`,
    ]),
  }
}

/** A beta tester's invitation, with their key (the wording is VANTA's docs/email/beta-invite.txt). */
export function betaInvite(b: Brand, r: { product: string; name: string; key: string; expires: string; download: string; guide?: string }): Mail {
  const steps = [
    'Download the installer for your system and run it.',
    `Read and accept the terms when the installer (and ${r.product} on first launch) asks.`,
    `Open ${r.product} in your DAW (VST3 / AU) or as the standalone app.`,
    'On first launch, paste your key in the activation window and click Activate.',
  ]
  const tries = [
    'Play the factory presets (Browser tab) across genres.',
    'Drop 3–5 of your own sounds into the Sample Lab and tell us how close the result is.',
    'Build one sound from Init using drag-and-drop modulation.',
    `Use ${r.product} in a real session for an hour: CPU, stability, anything odd.`,
  ]
  const list = (items: string[]) =>
    `<ol style="margin:0 0 20px;padding-left:20px;font:15px/1.65 ${SANS};color:${C.ink};">${items.map((i) => `<li style="margin:0 0 6px;">${esc(i)}</li>`).join('')}</ol>`
  const body = `${label('Beta invitation')}
${headline(`Thank you for testing ${esc(r.product)}${r.name ? `, ${esc(first(r.name))}` : ''}.`)}
${text(`${esc(r.product)} is Vital Acoustica’s new hybrid synthesizer with the Sample Lab: drop in a sound and it builds a playable patch that approximates it. Here’s your beta key. It activates ${esc(r.product)} on one computer; please keep it private and don’t share the installer.`)}
<p style="margin:8px 0 24px;padding:16px 18px;border:1px solid ${C.line};font:600 18px/1.4 'SFMono-Regular',Menlo,Consolas,monospace;letter-spacing:1px;color:${C.ink};">${esc(r.key)}</p>
${text(`Download the installers (macOS and Windows) from your account: sign in, or create an account, with this email address. The beta runs until ${esc(r.expires)}, then asks you to install the next version.`)}
${button(r.download, 'Download the beta')}
${label('Install')}
${list(steps)}
${r.guide ? text(`The full install guide and manual: <a href="${esc(r.guide)}" style="color:${C.ink};">${esc(r.guide)}</a>`) : ''}
${label('What we’d love you to try')}
${list(tries)}
${label('Sending feedback')}
${text(`The quickest way is the Send feedback button at the top of ${esc(r.product)}’s window. It attaches diagnostic logs for us, never your audio or personal files. If ${esc(r.product)} ever closes unexpectedly, it offers to send a crash report next time it opens. You can also just reply to this email.`)}
${text('Everything here is confidential until release: please don’t post screenshots, recordings or the installer publicly yet. Your feedback shapes the 1.0 release.')}`
  return {
    subject: `Your ${r.product} beta key`,
    html: shell(b, `Your ${r.product} beta key and download.`, body, `You’re receiving this because you signed up to test ${r.product}. This is a one-off beta invitation.`),
    text: plain([
      `Thank you for helping test ${r.product}.`,
      '',
      `Your beta key: ${r.key}`,
      `It activates ${r.product} on one computer. Please keep it private and don't share the installer.`,
      '',
      `Download (macOS and Windows): ${r.download}`,
      `Sign in, or create an account, with this email address. The beta runs until ${r.expires}.`,
      '',
      ...steps.map((s, i) => `${i + 1}. ${s}`),
      ...(r.guide ? ['', `Install guide and manual: ${r.guide}`] : []),
      '',
      `Send feedback with the Send feedback button in ${r.product}, or reply to this email.`,
      'Everything here is confidential until release.',
    ]),
  }
}

/** To someone who asked to join a beta: we have it, and we'll be in touch. */
export function betaRequestReceived(b: Brand, r: { product: string; name: string }): Mail {
  const body = `${label('Beta request')}
${headline(`Thanks${r.name ? `, ${esc(first(r.name))}` : ''}. We’ve got your request.`)}
${text(`We’re choosing the first ${esc(r.product)} testers by hand, so it may take a few days. If you’re in, you’ll get an email with your beta key and the download. Testing is free.`)}
${text('Nothing to do until then. If you have a question, just reply to this email.')}`
  return {
    subject: `Your ${r.product} beta request`,
    html: shell(b, `We’ve got your request to test ${r.product}.`, body, `You’re receiving this because you asked to test ${r.product} on vitalacoustica.com.`),
    text: plain([
      `Thanks${r.name ? `, ${first(r.name)}` : ''}. We've got your request to test ${r.product}.`,
      "We're choosing the first testers by hand, so it may take a few days. If you're in, you'll get an email with your beta key and the download. Testing is free.",
    ]),
  }
}

/** To the owner: someone asked to join a beta. */
export function betaRequestAdmin(
  b: Brand,
  r: { product: string; name: string; email: string; about: string; system: string; daw: string },
  adminLink: string,
  stored = true,
): Mail {
  const rows = [
    ['Name', r.name],
    ['Email', r.email],
    ['System', r.system],
    ['DAW', r.daw],
  ]
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid ${C.line};font:600 11px ${SANS};letter-spacing:1.5px;text-transform:uppercase;color:${C.muted};width:30%;">${esc(k)}</td><td style="padding:8px 0;border-bottom:1px solid ${C.line};font:15px/1.5 ${SANS};color:${C.ink};">${esc(v)}</td></tr>`,
    )
    .join('')
  const body = `${label('New beta request')}
${headline(`${esc(r.name || r.email)} wants to test ${esc(r.product)}.`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;border-top:1px solid ${C.line};">${rows}</table>
${r.about ? text(para(r.about)) : ''}
${
  stored
    ? button(adminLink, 'Approve or decline')
    : text('The website’s database isn’t set up yet, so this request is only in this email. Reply to answer them; once the database is set up, you can send them a beta key from the admin page.')
}`
  return {
    subject: `${r.product} beta request: ${r.name || r.email}`,
    html: shell(b, `${r.name || r.email} asked to test ${r.product}.`, body, 'Sent to Vital Acoustica’s admins.'),
    text: plain([`${r.name || r.email} <${r.email}> asked to test ${r.product}.`, r.system && `System: ${r.system}`, r.daw && `DAW: ${r.daw}`, r.about, '', stored ? `Approve or decline: ${adminLink}` : 'Reply to this email to answer them.']),
  }
}

/** "Tell me when it's out": confirms the sign-up. */
export function launchAlertSaved(b: Brand, r: { product: string; detail: string; link: string }): Mail {
  const body = `${label('Launching soon')}
${headline(`We’ll tell you when ${esc(r.product)} is out.`)}
${text(`You’re on the list for ${esc(r.product)}${r.detail ? ` (${esc(r.detail)})` : ''}. We’ll send you one email when it’s available, and nothing else.`)}
${button(r.link, `See ${r.product}`)}`
  return {
    subject: `You’re on the list for ${r.product}`,
    html: shell(b, `We’ll email you once when ${r.product} is out.`, body, 'You’re receiving this because you asked to hear when this product launches on vitalacoustica.com. Reply if you’d rather not.'),
    text: plain([`You're on the list for ${r.product}${r.detail ? ` (${r.detail})` : ''}. We'll send you one email when it's available, and nothing else.`, '', r.link]),
  }
}

/** The launch: the product someone waited for is on sale. */
export function launchAlertOut(b: Brand, r: { product: string; detail: string; link: string }): Mail {
  const body = `${label('It’s out')}
${headline(`${esc(r.product)} is here.`)}
${text(`You asked us to tell you when ${esc(r.product)}${r.detail ? ` (${esc(r.detail)})` : ''} was available. It is now.`)}
${button(r.link, `Get ${r.product}`)}
${text('This was the one email you signed up for; we won’t write again about it.')}`
  return {
    subject: `${r.product} is out`,
    html: shell(b, `${r.product} is available now.`, body, 'You’re receiving this because you asked to hear when this product launched on vitalacoustica.com.'),
    text: plain([`${r.product} is out. You asked us to tell you when it was available.`, '', r.link]),
  }
}

/** To the team, when the website can't keep a "tell me when it's out" sign-up itself (no database yet). */
export function launchAlertAdmin(b: Brand, r: { product: string; email: string; detail: string }): Mail {
  const body = `${label('Launch list')}
${headline(`${esc(r.email)} wants to hear when ${esc(r.product)} is out.`)}
${text(`${r.detail ? `Option: ${esc(r.detail)}. ` : ''}The website’s database isn’t set up yet, so this sign-up is only in this email. Keep it, and email them when ${esc(r.product)} launches.`)}`
  return {
    subject: `Launch list: ${r.product} · ${r.email}`,
    html: shell(b, `${r.email} signed up for ${r.product}.`, body, 'Sent to Vital Acoustica’s team.'),
    text: plain([`${r.email} wants to hear when ${r.product} is out.${r.detail ? ` (${r.detail})` : ''}`, "The website's database isn't set up yet, so this sign-up is only in this email."]),
  }
}
