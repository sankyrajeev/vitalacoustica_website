// What search engines see: every page in the sitemap has its own metadata, and the rest behave.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { metaFor } from '../server/seo.ts'
import { sitePaths } from '../server/paths.ts'

const SITE = 'https://vitalacoustica.com'

test('every page in the sitemap has its own title, description and canonical address', () => {
  const paths = sitePaths().filter((p) => !p.startsWith('/blog'))
  assert.ok(paths.length > 30)
  const titles = new Set<string>()
  for (const p of paths) {
    const m = metaFor(p, SITE)
    assert.ok(m, `no metadata for ${p}`)
    assert.ok(!m.noindex, `${p} is in the sitemap but marked noindex`)
    assert.equal(m.canonical, `${SITE}${p}`)
    assert.ok(m.description.length >= 50 && m.description.length <= 160, `${p}: description is ${m.description.length} characters`)
    assert.ok(!titles.has(m.title), `${p}: title "${m.title}" is used twice`)
    titles.add(m.title)
  }
})

test('software pages describe the software, private pages stay out, unknown pages are 404', () => {
  const vanta = metaFor('/software/vanta', SITE)!
  assert.equal(vanta.canonical, `${SITE}/software/vanta`)
  assert.equal(vanta.image, `${SITE}/email/vanta.jpg`)
  assert.ok(vanta.structured?.some((s) => (s as { '@type': string })['@type'] === 'SoftwareApplication'))
  assert.match(vanta.body ?? '', /<h1>VANTA<\/h1>/)
  assert.equal(metaFor('/account/admin', SITE)?.noindex, true)
  // software lives under /software only (the Worker redirects the old /shop addresses)
  assert.equal(metaFor('/shop/vanta', SITE), null)
  assert.ok(metaFor('/software', SITE))
  assert.equal(metaFor('/no-such-page', SITE), null)
  assert.equal(metaFor('/equipment/no-such-thing', SITE), null)
})

test('old shop addresses of software point to their new pages', async () => {
  const { movedSoftwarePath } = await import('../src/content/shop.ts')
  assert.equal(movedSoftwarePath('/shop/vanta'), '/software/vanta')
  assert.equal(movedSoftwarePath('/shop/pixel-forge/'), '/software/pixel-forge')
  // merch and packs stay in the shop
  const merch = (await import('../src/content/shop.ts')).products.find((p) => p.kind === 'merch')!
  assert.equal(movedSoftwarePath(`/shop/${merch.id}`), null)
  assert.equal(movedSoftwarePath('/shop'), null)
})
