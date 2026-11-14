// Every public page except the Journal's articles: the sitemap lists these (server/sitemap.ts), and
// tests/seo.test.ts checks each one has its own metadata (server/seo.ts). Pages held back in the
// app (Work, while it's unpublished) are left out; add them here when they return.

import { capabilities } from '../src/content/capabilities.ts'
import { gear } from '../src/content/gear.ts'
import { products } from '../src/content/shop.ts'

const PAGES = ['/', '/story', '/equipment', '/capabilities', '/shop', '/testimonials', '/blog', '/contact', '/careers', '/privacy', '/legal']

export const sitePaths = () => [
  ...PAGES,
  ...gear.map((g) => `/equipment/${g.id}`),
  ...capabilities.map((c) => `/capabilities/${c.id}`),
  // sample products (placeholders) stay out of search results
  ...products.filter((p) => !p.sample).map((p) => `/shop/${p.id}`),
]
