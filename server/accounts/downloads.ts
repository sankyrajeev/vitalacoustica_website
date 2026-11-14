// Installers live as assets on a private GitHub repository's latest release (products.ts:
// `releases`). Owners get them through here: the Worker asks GitHub for the file with its own
// token and passes on GitHub's short-lived download link, so the installers are never public.
//
// A product can list more than one repository, in order: while the repositories move to the
// vitalacoustica organization, the site looks there first and falls back to the old place. Each
// owner has its own token (a fine-grained token belongs to one account): GITHUB_RELEASES_TOKEN_ORG
// for the organization, GITHUB_RELEASES_TOKEN for everything else.

import { json, type AccountsEnv, type D1Database } from './db.ts'
import { PRODUCTS, isProduct } from './products.ts'

type Asset = { id: number; name: string; size: number; url: string }
export type Release = { tag_name: string; name: string | null; body?: string | null; published_at: string; assets: Asset[] }
export type Found = { release: Release; repo: string }

export const RELEASES_ORG = 'vitalacoustica'

export const releasesToken = (env: AccountsEnv, repo: string) =>
  repo.split('/')[0] === RELEASES_ORG ? env.GITHUB_RELEASES_TOKEN_ORG : env.GITHUB_RELEASES_TOKEN

export const hasReleasesToken = (env: AccountsEnv) => !!(env.GITHUB_RELEASES_TOKEN || env.GITHUB_RELEASES_TOKEN_ORG)

const gh = (token: string, url: string, accept = 'application/vnd.github+json') =>
  fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: accept, 'User-Agent': 'vitalacoustica-website', 'X-GitHub-Api-Version': '2022-11-28' },
    redirect: 'manual',
  })

// Answers that mean "not here, try the next place": not found, moved, or a token that can't see it.
const TRY_NEXT = new Set([301, 302, 307, 308, 401, 403, 404])

/** The latest release, from the first listed repository that has one. Stops (null) on a GitHub
 *  outage or network error rather than quietly answering from an older place. */
export async function latest(env: AccountsEnv, repos: readonly string[]): Promise<Found | null> {
  for (const repo of repos) {
    const token = releasesToken(env, repo)
    if (!token) continue
    let res: Response
    try {
      res = await gh(token, `https://api.github.com/repos/${repo}/releases/latest`)
    } catch {
      return null
    }
    if (res.ok) return { release: (await res.json()) as Release, repo }
    if (!TRY_NEXT.has(res.status)) return null
  }
  return null
}

async function owns(db: D1Database, userId: string, product: string) {
  return !!(await db.prepare('SELECT key FROM licences WHERE user_id = ? AND product = ? AND revoked = 0 LIMIT 1').bind(userId, product).first())
}

/** GET /api/account/downloads?product=vanta → the latest version's files. */
export async function listDownloads(request: Request, env: AccountsEnv, db: D1Database, userId: string) {
  const product = new URL(request.url).searchParams.get('product') || ''
  if (!isProduct(product) || !(await owns(db, userId, product))) return json({ error: 'not_found' }, 404)
  const repos = PRODUCTS[product].releases ?? []
  if (!repos.length || !hasReleasesToken(env)) return json({ files: [], note: 'not_yet' })
  const found = await latest(env, repos)
  if (!found) return json({ files: [], note: 'not_yet' })
  const { release } = found
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
  const repos = PRODUCTS[product].releases ?? []
  if (!repos.length || !hasReleasesToken(env)) return json({ error: 'not_found' }, 404)
  // only files of the latest release, so older builds and other repositories can't be fetched by id
  const found = await latest(env, repos)
  if (!found?.release.assets.some((a) => a.id === fileId)) return json({ error: 'not_found' }, 404)
  // the file comes from the same repository, with the same token, as the release that lists it
  const res = await gh(releasesToken(env, found.repo)!, `https://api.github.com/repos/${found.repo}/releases/assets/${fileId}`, 'application/octet-stream')
  const location = res.headers.get('Location')
  if (res.status !== 302 || !location) return json({ error: 'unavailable' }, 502)
  return new Response(null, { status: 302, headers: { Location: location, 'Cache-Control': 'no-store' } })
}
