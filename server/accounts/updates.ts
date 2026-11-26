// "Update available" for the apps. Public, no licence needed; the apps ignore any error.
//
//   GET /api/pixelforge/v1/latest?platform=mac-apple-silicon|mac-intel|windows|linux&version=1.0.0
//   → { version, url, notes?, released?, critical }
//
// The newest version is the latest GitHub Release of the product's repository (products.ts `releases`,
// tried in order):
// tag vX.Y.Z → version, the release notes' bullet lines → notes, published_at → released. A release
// whose notes contain "[critical]" makes the app open its update window instead of just showing a
// button. The link goes to the buyer's account, where the installers are, so they sign in to download.

import { json, siteUrl, type AccountsEnv } from './db.ts'
import { hasReleasesToken, latest, type Release } from './downloads.ts'
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
    shop: `${site}/software/${product}`, // the field keeps its name: the plugins read it
    notes,
    released: release.published_at?.slice(0, 10) || undefined,
    critical: /\[critical\]/i.test(release.body || ''),
  }
}

export async function latestVersion(request: Request, env: AccountsEnv, product: ProductId) {
  const repos = PRODUCTS[product].releases ?? []
  if (!repos.length || !hasReleasesToken(env)) return json({ error: 'not_available' }, 503)
  // one GitHub lookup per few minutes, whatever the platform or version asking
  const cacheKey = new Request(`${new URL(request.url).origin}/api/${product.replace('-', '')}/v1/latest#cached`)
  const cache = typeof caches === 'undefined' ? null : caches.default
  const hit = await cache?.match(cacheKey)
  if (hit) return hit
  const found = await latest(env, repos)
  if (!found) return json({ error: 'not_available' }, 503)
  const res = json(releaseInfo(found.release, siteUrl(env, request), product), 200, { 'Cache-Control': `public, max-age=${CACHE_SECONDS}` })
  await cache?.put(cacheKey, res.clone())
  return res
}

/**
 * VANTA's update notice (the plug-in's docs/update-endpoint.md):
 *
 *   GET /api/licence/v1/latest?product=VANTA&channel=beta|release&current=v0.4.0-beta.2&os=mac|win
 *   → 200 { version: "v0.4.0-beta.3", url: "https://…/account", notes: "- …" }
 *
 * `beta` is the newest published release, pre-releases included; `release` the newest that isn't a
 * pre-release. The plug-in compares the tag with its own and stays quiet on anything but a 200.
 */
export async function pluginLatest(request: Request, env: AccountsEnv) {
  const params = new URL(request.url).searchParams
  const product = (params.get('product') || '').toLowerCase()
  const channel = params.get('channel') === 'beta' ? 'beta' : 'release'
  if (product !== 'vanta') return json({ error: 'not_found' }, 404)
  const repos = PRODUCTS[product].releases ?? []
  if (!repos.length || !hasReleasesToken(env)) return json({ error: 'not_available' }, 404)
  const cacheKey = new Request(`${new URL(request.url).origin}/api/licence/v1/latest/${product}/${channel}#cached`)
  const cache = typeof caches === 'undefined' ? null : caches.default
  const hit = await cache?.match(cacheKey)
  if (hit) return hit
  const found = await latest(env, repos, { prerelease: channel === 'beta' })
  if (!found) return json({ error: 'not_available' }, 404)
  const { notes } = releaseInfo(found.release, siteUrl(env, request), product)
  const plain = notes.length
    ? notes.map((n) => `- ${n}`).join('\n')
    : (found.release.body || '').replace(/[#*_`>]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim()
  const res = json(
    { version: found.release.tag_name, url: `${siteUrl(env, request)}/account`, notes: plain.slice(0, 600) },
    200,
    { 'Cache-Control': `public, max-age=${CACHE_SECONDS}` },
  )
  await cache?.put(cacheKey, res.clone())
  return res
}
