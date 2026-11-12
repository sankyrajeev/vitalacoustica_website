// "Update available" for the apps. Public, no licence needed; the apps ignore any error.
//
//   GET /api/pixelforge/v1/latest?platform=mac-apple-silicon|mac-intel|windows|linux&version=1.0.0
//   → { version, url, notes?, released?, critical }
//
// The newest version is the latest GitHub Release of the product's repository (products.ts `releases`):
// tag vX.Y.Z → version, the release notes' bullet lines → notes, published_at → released. A release
// whose notes contain "[critical]" makes the app open its update window instead of just showing a
// button. The link goes to the buyer's account, where the installers are, so they sign in to download.

import { json, siteUrl, type AccountsEnv } from './db.ts'
import { latest, type Release } from './downloads.ts'
import { PRODUCTS, type ProductId } from './products.ts'

const CACHE_SECONDS = 600

export function releaseInfo(release: Release, site: string, product: ProductId) {
  const lines = (release.body || '').split(/\r?\n/)
  const notes = lines
    .map((l) => l.match(/^\s*[-*•]\s+(.+)$/)?.[1])
    .filter((l): l is string => !!l)
    .map((l) => l.replace(/\[critical\]/gi, '').replace(/\*\*|__|`/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim())
    .filter(Boolean)
    .slice(0, 12)
  return {
    version: release.tag_name.replace(/^v/i, ''),
    url: `${site}/account`,
    shop: `${site}/shop/${product}`,
    notes,
    released: release.published_at?.slice(0, 10) || undefined,
    critical: /\[critical\]/i.test(release.body || ''),
  }
}

export async function latestVersion(request: Request, env: AccountsEnv, product: ProductId) {
  const repo = PRODUCTS[product].releases
  if (!repo || !env.GITHUB_RELEASES_TOKEN) return json({ error: 'not_available' }, 503)
  // one GitHub lookup per few minutes, whatever the platform or version asking
  const cacheKey = new Request(`${new URL(request.url).origin}/api/${product.replace('-', '')}/v1/latest#cached`)
  const cache = typeof caches === 'undefined' ? null : caches.default
  const hit = await cache?.match(cacheKey)
  if (hit) return hit
  const release = await latest(env, repo)
  if (!release) return json({ error: 'not_available' }, 503)
  const res = json(releaseInfo(release, siteUrl(env, request), product), 200, { 'Cache-Control': `public, max-age=${CACHE_SECONDS}` })
  await cache?.put(cacheKey, res.clone())
  return res
}
