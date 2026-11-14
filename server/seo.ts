// What search engines and link previews (WhatsApp, LinkedIn, Instagram, iMessage, Slack) see for each
// page, without running the app: its own title, description, canonical address, preview image and
// structured data, and a plain-text version of the page inside #root that the app replaces as soon
// as it starts. Unknown addresses answer 404. The Journal has its own (server/journal.ts), built on
// the same page() below.

import { capabilities } from '../src/content/capabilities.ts'
import { fullName, gear } from '../src/content/gear.ts'
import { products, type Product } from '../src/content/shop.ts'

export const SITE_NAME = 'Vital Acoustica'
type Assets = { fetch: (request: Request) => Promise<Response> }

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
/** JSON for a <script> tag: nothing in it can close the tag. */
const ld = (o: unknown) => JSON.stringify(o).replace(/</g, '\\u003c')
/** A description of a sensible length for search results. */
const clip = (s: string, max = 158) => {
  const t = s.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max - 1)
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.\s]+$/, '')}…`
}

export type PageMeta = {
  title: string
  description: string
  canonical: string
  image: string
  imageAlt?: string
  type: 'website' | 'article'
  noindex?: boolean
  extra?: string // more <meta> tags
  structured?: unknown[]
  /** the page as plain HTML, for crawlers that don't run the app (the app replaces it) */
  body?: string
}

function headTags(m: PageMeta) {
  const tags = [
    `<link rel="canonical" href="${esc(m.canonical)}">`,
    `<meta property="og:site_name" content="${SITE_NAME}">`,
    `<meta property="og:image:alt" content="${esc(m.imageAlt ?? m.title)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(m.title)}">`,
    `<meta name="twitter:description" content="${esc(m.description)}">`,
    `<meta name="twitter:image" content="${esc(m.image)}">`,
    m.noindex ? '<meta name="robots" content="noindex, nofollow">' : '',
    m.extra ?? '',
    // the plain version stays invisible while the app loads, and shows only if the app never starts
    m.body ? '<style>#root>.ssr{opacity:0;animation:ssr-show 0s 6s forwards;max-width:46em;margin:0 auto;padding:120px 24px;font:16px/1.6 system-ui,sans-serif;color:#d8d4ca}#root>.ssr a{color:#b8a47b}@keyframes ssr-show{to{opacity:1}}</style>' : '',
    ...(m.structured ?? []).map((s) => `<script type="application/ld+json">${ld(s)}</script>`),
  ]
  return tags.filter(Boolean).join('\n')
}

/** The app's HTML with this page's metadata (and plain version) written in. */
export async function page(request: Request, assets: Assets, m: PageMeta, status = 200) {
  // a fresh request, so the app's HTML always comes back whole (never a 304 to a conditional request)
  const shell = await assets.fetch(new Request(new URL('/', request.url)))
  let rewriter = new HTMLRewriter()
    .on('title', { element: (e) => void e.setInnerContent(m.title) })
    .on('meta[name="description"]', { element: (e) => void e.setAttribute('content', m.description) })
    .on('meta[property="og:title"]', { element: (e) => void e.setAttribute('content', m.title) })
    .on('meta[property="og:description"]', { element: (e) => void e.setAttribute('content', m.description) })
    .on('meta[property="og:type"]', { element: (e) => void e.setAttribute('content', m.type) })
    .on('meta[property="og:url"]', { element: (e) => void e.setAttribute('content', m.canonical) })
    .on('meta[property="og:image"]', { element: (e) => void e.setAttribute('content', m.image) })
    .on('head', { element: (e) => void e.append(headTags(m), { html: true }) })
  if (m.body) rewriter = rewriter.on('#root', { element: (e) => void e.setInnerContent(`<div class="ssr">${m.body}</div>`, { html: true }) })
  const res = rewriter.transform(shell)
  const headers = new Headers(res.headers)
  headers.set('Cache-Control', m.noindex ? 'private, no-store' : 'public, max-age=300')
  headers.set('Content-Type', 'text/html; charset=utf-8')
  return new Response(res.body, { status, headers })
}

export const organisation = (site: string) => ({
  '@type': 'Organization',
  name: SITE_NAME,
  url: site,
  logo: { '@type': 'ImageObject', url: `${site}/brand/logo-full-black.png` },
  sameAs: ['https://instagram.com/vitalacoustica'],
})

export const crumbs = (items: [string, string][]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })),
})

/* ─────────────── the plain version ─────────────── */

const NAV: [string, string][] = [
  ['/', 'Home'],
  ['/story', 'Our Story'],
  ['/equipment', 'Equipment'],
  ['/capabilities', 'Services'],
  ['/shop', 'Shop'],
  ['/testimonials', 'Testimonials'],
  ['/blog', 'Blog'],
  ['/contact', 'Get a quote'],
]

const nav = () => `<nav><p>${NAV.map(([href, label]) => `<a href="${href}">${esc(label)}</a>`).join(' · ')}</p></nav>`
const list = (items: [string, string, string?][]) =>
  `<ul>${items.map(([href, name, line]) => `<li><a href="${href}">${esc(name)}</a>${line ? `: ${esc(line)}` : ''}</li>`).join('')}</ul>`
const plain = (h1: string, lead: string, more = '') => `${nav()}<h1>${esc(h1)}</h1><p>${esc(lead)}</p>${more}`

/* ─────────────── every page ─────────────── */

const HOME_DESCRIPTION =
  'Sound and lighting hire with the crew to run it: d&b audiotechnik V10P and B22 systems, beam moving heads, LED matrices and pixel bars, delivered and operated.'

/** Preview images for the software (its logo above its real interface). */
const SOFTWARE_IMAGE: Record<string, string> = { vanta: '/email/vanta.jpg', 'pixel-forge': '/email/pixel-forge.jpg' }

function productMeta(site: string, p: Product): PageMeta {
  const canonical = `${site}/shop/${p.id}`
  const image =
    p.kind === 'software' && SOFTWARE_IMAGE[p.id]
      ? `${site}${SOFTWARE_IMAGE[p.id]}`
      : p.kind === 'merch' && p.photo
        ? `${site}/${p.photo}`
        : `${site}/media/og.jpg`
  const systems = p.kind === 'software' ? (p.specs.find(([k]) => k === 'Systems')?.[1] ?? '') : ''
  const features = p.kind === 'software' || p.kind === 'audio' ? (p.kind === 'software' ? p.features : p.contents) : []
  const thing =
    p.kind === 'software'
      ? {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: p.name,
          description: clip(p.description, 300),
          applicationCategory: 'MultimediaApplication',
          operatingSystem: systems.replace(/ · /g, ', ') || undefined,
          image,
          url: canonical,
          publisher: organisation(site),
          featureList: p.features,
        }
      : {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: p.name,
          description: clip(p.description, 300),
          image,
          url: canonical,
          brand: { '@type': 'Brand', name: SITE_NAME },
        }
  return {
    title: `${p.name}${p.kind === 'software' ? ` · ${p.type}` : ''} — ${SITE_NAME}`,
    description: clip(`${p.tagline} ${p.description}`),
    canonical,
    image,
    imageAlt: p.name,
    type: 'website',
    noindex: !!p.sample,
    structured: [
      thing,
      crumbs([
        ['Home', `${site}/`],
        ['Shop', `${site}/shop`],
        [p.name, canonical],
      ]),
    ],
    body: plain(p.name, p.description, features.length ? `<ul>${features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''),
  }
}

/** The metadata for a path, or null for a page that doesn't exist. */
export function metaFor(path: string, site: string): PageMeta | null {
  const base = (title: string, description: string, extra: Partial<PageMeta> = {}): PageMeta => ({
    title: `${title} — ${SITE_NAME}`,
    description,
    canonical: `${site}${path}`,
    image: `${site}/media/og.jpg`,
    type: 'website',
    ...extra,
  })

  if (path === '/')
    return {
      title: `${SITE_NAME} — Sound & lighting rental and production`,
      description: HOME_DESCRIPTION,
      canonical: `${site}/`,
      image: `${site}/media/og.jpg`,
      type: 'website',
      structured: [
        { '@context': 'https://schema.org', ...organisation(site), description: HOME_DESCRIPTION },
        { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: `${site}/` },
      ],
      body: plain(
        'We shape the way an experience feels.',
        'Sound, light and production, conceived as one. Professional sound and lighting hire with the crew to run it: d&b audiotechnik systems, beam and LED lighting, delivered, set up and operated for club nights, festivals, brand events and private celebrations.',
        list(capabilities.map((c) => [`/capabilities/${c.id}`, c.name, c.statement])),
      ),
    }

  if (path === '/story')
    return base('Our Story', 'How Vital Acoustica works: sound, light and production conceived as one, designed around the space and run by the crew who built it.', {
      body: plain('Our Story', 'Sound, light and production, conceived as one: designed around the space and the people in it, and run by the crew who built it.'),
    })

  if (path === '/equipment')
    return base(
      'Equipment for hire',
      'Sound, lighting and effects for hire with crew: d&b audiotechnik V10P and B22-SUB, Pioneer DJ CDJ-3000X, beam moving heads, LED matrices, hazers and more.',
      {
        structured: [
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Equipment for hire',
            itemListElement: gear.map((g, i) => ({ '@type': 'ListItem', position: i + 1, name: fullName(g), url: `${site}/equipment/${g.id}` })),
          },
        ],
        body: plain('Equipment for hire', 'Everything is delivered, set up and run by our crew.', list(gear.map((g) => [`/equipment/${g.id}`, fullName(g), g.about]))),
      },
    )

  const item = path.match(/^\/equipment\/([^/]+)$/)
  if (item) {
    const g = gear.find((x) => x.id === item[1])
    if (!g) return null
    const image = g.photo.source === 'none' ? `${site}/media/og.jpg` : `${site}/gear/${g.photo.file}`
    return base(`${fullName(g)} for hire`, clip(`${g.about} ${g.description}`), {
      image,
      imageAlt: g.photo.alt,
      structured: [
        {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: fullName(g),
          description: clip(g.description, 300),
          image,
          ...(g.maker ? { brand: { '@type': 'Brand', name: g.maker } } : {}),
          category: g.group,
        },
        crumbs([
          ['Home', `${site}/`],
          ['Equipment', `${site}/equipment`],
          [fullName(g), `${site}${path}`],
        ]),
      ],
      body: plain(`${fullName(g)} for hire`, g.description, g.specs.length ? `<ul>${g.specs.map(([k, v]) => `<li>${esc(k)}: ${esc(v)}</li>`).join('')}</ul>` : ''),
    })
  }

  if (path === '/capabilities')
    return base('Services', 'Sound, lighting, visuals, production and installations, designed and run as one by Vital Acoustica.', {
      body: plain('Services', 'Sound, light, visuals and systems, designed and run as one cohesive experience.', list(capabilities.map((c) => [`/capabilities/${c.id}`, c.name, c.statement]))),
    })

  const cap = path.match(/^\/capabilities\/([^/]+)$/)
  if (cap) {
    const c = capabilities.find((x) => x.id === cap[1])
    if (!c) return null
    const image = c.image ? `${site}/shows/${c.image.src}-1600.webp` : `${site}/media/og.jpg`
    return base(`${c.name} — Services`, clip(`${c.statement} ${c.summary}`), {
      image,
      imageAlt: c.image?.alt,
      structured: [
        { '@context': 'https://schema.org', '@type': 'Service', serviceType: c.name, name: `${c.name} by ${SITE_NAME}`, description: clip(c.summary, 300), provider: organisation(site), url: `${site}${path}` },
        crumbs([
          ['Home', `${site}/`],
          ['Services', `${site}/capabilities`],
          [c.name, `${site}${path}`],
        ]),
      ],
      body: plain(c.name, `${c.statement} ${c.summary}`, `<ul>${c.covers.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`),
    })
  }

  if (path === '/shop')
    return base('Shop', 'Software from Vital Acoustica (VANTA, Pixel Forge, Lumière Link, ORBIT), merch, sample packs and VJ loops.', {
      body: plain('Shop', 'Software we make for music and lighting, and things to wear to the next show.', list(products.filter((p) => !p.sample).map((p) => [`/shop/${p.id}`, p.name, p.tagline]))),
    })

  const prod = path.match(/^\/shop\/([^/]+)$/)
  if (prod) {
    const p = products.find((x) => x.id === prod[1])
    return p ? productMeta(site, p) : null
  }

  const simple: Record<string, [string, string, boolean?]> = {
    '/testimonials': ['Testimonials', 'What clubs, promoters and artists say about working with Vital Acoustica.'],
    '/contact': ['Get a quote', 'Tell us about your event and we’ll put together the sound, lighting and crew for it.'],
    '/careers': ['Careers', 'Work with Vital Acoustica: crew, engineers and lighting designers.'],
    '/deck': ['Capability deck', 'Vital Acoustica at a glance: sound, lighting, visuals, production and installations.'],
    '/privacy': ['Privacy notice', 'How Vital Acoustica collects, uses and protects personal data.'],
    '/legal': ['Legal information', 'Company details, terms of use, shop terms and the software refund policy.'],
    // not for search results
    '/account': ['Your account', 'Your licence keys, downloads and orders.', true],
    '/account/forgot': ['Forgotten password', 'Reset the password for your Vital Acoustica account.', true],
    '/account/reset': ['Choose a new password', 'Choose a new password for your Vital Acoustica account.', true],
    '/account/admin': ['Admin', 'Vital Acoustica admin.', true],
    '/work': ['Selected work', 'Selected work by Vital Acoustica.', true],
  }
  if (simple[path]) {
    const [title, description, noindex] = simple[path]
    return base(title, description, { noindex, body: noindex ? undefined : plain(title, description) })
  }
  if (/^\/work\/[^/]+$/.test(path)) return base('Selected work', 'Selected work by Vital Acoustica.', { noindex: true })
  return null
}

/** Any page of the app (not the Journal, the API or a file): its HTML with its own metadata. */
export async function sitePage(request: Request, site: string, assets: Assets): Promise<Response> {
  const url = new URL(request.url)
  // one address per page: no trailing slash
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) return Response.redirect(`${url.origin}${url.pathname.replace(/\/+$/, '')}${url.search}`, 301)
  const m = metaFor(decodeURIComponent(url.pathname), site)
  if (m) return page(request, assets, m)
  return page(
    request,
    assets,
    { title: `Not found — ${SITE_NAME}`, description: 'This page could not be found.', canonical: `${site}/`, image: `${site}/media/og.jpg`, type: 'website', noindex: true },
    404,
  )
}
