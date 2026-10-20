// GET /sitemap.xml — every public page, including the Journal's live articles (scheduled ones join
// by themselves once their time comes). Pages held back in the app (Work, while it's unpublished)
// are left out; add them here when they return.

import { capabilities } from '../src/content/capabilities.ts'
import { gear } from '../src/content/gear.ts'
import { products } from '../src/content/shop.ts'
import { liveArticles } from './journal.ts'

const PAGES = ['/', '/story', '/equipment', '/capabilities', '/shop', '/testimonials', '/journal', '/contact', '/careers', '/privacy', '/legal']

export function sitemap(site: string): Response {
  const urls: { loc: string; lastmod?: string }[] = [
    ...PAGES.map((p) => ({ loc: p })),
    ...gear.map((g) => ({ loc: `/equipment/${g.id}` })),
    ...capabilities.map((c) => ({ loc: `/capabilities/${c.id}` })),
    // sample products (placeholders) stay out of search results
    ...products.filter((p) => !p.sample).map((p) => ({ loc: `/shop/${p.id}` })),
    ...liveArticles().map((a) => ({ loc: `/journal/${a.slug}`, lastmod: (a.updatedAt ?? a.publishAt).slice(0, 10) })),
  ]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${site}${u.loc === '/' ? '/' : u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } })
}
