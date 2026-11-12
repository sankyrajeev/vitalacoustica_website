// Installers live as assets on a private GitHub repository's latest release (products.ts:
// `releases`). Owners get them through here: the Worker asks GitHub for the file with its own
// token and passes on GitHub's short-lived download link, so the installers are never public.

import { json, type AccountsEnv, type D1Database } from './db.ts'
import { PRODUCTS, isProduct } from './products.ts'

type Asset = { id: number; name: string; size: number; url: string }
export type Release = { tag_name: string; name: string | null; body?: string | null; published_at: string; assets: Asset[] }

const gh = (env: AccountsEnv, url: string, accept = 'application/vnd.github+json') =>
  fetch(url, {
    headers: { Authorization: `Bearer ${env.GITHUB_RELEASES_TOKEN}`, Accept: accept, 'User-Agent': 'vitalacoustica-website', 'X-GitHub-Api-Version': '2022-11-28' },
    redirect: 'manual',
  })

async function owns(db: D1Database, userId: string, product: string) {
  return !!(await db.prepare('SELECT key FROM licences WHERE user_id = ? AND product = ? AND revoked = 0 LIMIT 1').bind(userId, product).first())
}

export async function latest(env: AccountsEnv, repo: string) {
  const res = await gh(env, `https://api.github.com/repos/${repo}/releases/latest`)
  return res.ok ? ((await res.json()) as Release) : null
}

/** GET /api/account/downloads?product=vanta → the latest version's files. */
export async function listDownloads(request: Request, env: AccountsEnv, db: D1Database, userId: string) {
  const product = new URL(request.url).searchParams.get('product') || ''
  if (!isProduct(product) || !(await owns(db, userId, product))) return json({ error: 'not_found' }, 404)
  const repo = PRODUCTS[product].releases
  if (!repo || !env.GITHUB_RELEASES_TOKEN) return json({ files: [], note: 'not_yet' })
  const release = await latest(env, repo)
  if (!release) return json({ files: [], note: 'not_yet' })
  return json({
    version: release.name || release.tag_name,
    published: release.published_at,
    files: release.assets.map((a) => ({ id: a.id, name: a.name, size: a.size })),
  })
}

/** GET /api/account/download?product=vanta&file=<id> → a redirect to the file itself. */
export async function download(request: Request, env: AccountsEnv, db: D1Database, userId: string) {
  const params = new URL(request.url).searchParams
  const product = params.get('product') || ''
  const fileId = Number(params.get('file'))
  if (!isProduct(product) || !fileId || !(await owns(db, userId, product))) return json({ error: 'not_found' }, 404)
  const repo = PRODUCTS[product].releases
  if (!repo || !env.GITHUB_RELEASES_TOKEN) return json({ error: 'not_found' }, 404)
  // only files of the latest release, so older builds and other repositories can't be fetched by id
  const release = await latest(env, repo)
  if (!release?.assets.some((a) => a.id === fileId)) return json({ error: 'not_found' }, 404)
  const res = await gh(env, `https://api.github.com/repos/${repo}/releases/assets/${fileId}`, 'application/octet-stream')
  const location = res.headers.get('Location')
  if (res.status !== 302 || !location) return json({ error: 'unavailable' }, 502)
  return new Response(null, { status: 302, headers: { Location: location, 'Cache-Control': 'no-store' } })
}
