// GET /sitemap.xml — every public page (server/paths.ts), and the Journal's live articles (scheduled
// ones join by themselves once their time comes).

import { liveArticles } from './journal.ts'
import { sitePaths } from './paths.ts'

export function sitemap(site: string): Response {
  const urls: { loc: string; lastmod?: string }[] = [
    ...sitePaths().map((loc) => ({ loc })),
    ...liveArticles().map((a) => ({ loc: `/journal/${a.slug}`, lastmod: (a.updatedAt ?? a.publishAt).slice(0, 10) })),
  ]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${site}${u.loc === '/' ? '/' : u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } })
}
