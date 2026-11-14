// Release lookups while the release repositories move from the personal account to the
// vitalacoustica organization: organization first, personal account second, one token each.
import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import type { AccountsEnv, D1Database } from '../server/accounts/db.ts'
import { download, latest, listDownloads } from '../server/accounts/downloads.ts'

const ORG = 'vitalacoustica/vanta_vitalacoustica'
const OLD = 'sankyrajeev/vanta_vitalacoustica'
const REPOS = [ORG, OLD]
const release = (tag: string, id = 11) => ({ tag_name: tag, name: `VANTA ${tag}`, published_at: '2026-11-20T10:00:00Z', assets: [{ id, name: 'VANTA.pkg', size: 1, url: 'x' }] })
const env: AccountsEnv = { GITHUB_RELEASES_TOKEN: 'personal-token', GITHUB_RELEASES_TOKEN_ORG: 'org-token' }

type Call = { url: string; auth: string | null }
let calls: Call[] = []
const realFetch = globalThis.fetch
function mockGitHub(answers: Record<string, () => Response>) {
  calls = []
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input)
    calls.push({ url, auth: new Headers(init?.headers).get('Authorization') })
    const answer = answers[url]
    if (!answer) throw new Error(`unexpected fetch ${url}`)
    return answer()
  }) as typeof fetch
}
afterEach(() => {
  globalThis.fetch = realFetch
})
const latestUrl = (repo: string) => `https://api.github.com/repos/${repo}/releases/latest`
const ok = (body: unknown) => () => Response.json(body)
const status = (code: number) => () => new Response(null, { status: code })
const owner = { prepare: () => ({ bind: () => ({ first: async () => ({ key: 'VNTA-1' }) }) }) } as unknown as D1Database

test('after the move: found in the organization, with the organization token', async () => {
  mockGitHub({ [latestUrl(ORG)]: ok(release('v1.0.0')) })
  const found = await latest(env, REPOS)
  assert.equal(found?.repo, ORG)
  assert.deepEqual(calls, [{ url: latestUrl(ORG), auth: 'Bearer org-token' }])
})

test('before the move: the organization answers 404, the personal repository is used, with its token', async () => {
  mockGitHub({ [latestUrl(ORG)]: status(404), [latestUrl(OLD)]: ok(release('v0.9.0')) })
  const found = await latest(env, REPOS)
  assert.equal(found?.repo, OLD)
  assert.equal(found?.release.tag_name, 'v0.9.0')
  assert.equal(calls[1].auth, 'Bearer personal-token')
})

test('moved away or not visible to the token (301, 401, 403) also falls through', async () => {
  for (const code of [301, 401, 403]) {
    mockGitHub({ [latestUrl(ORG)]: status(code), [latestUrl(OLD)]: ok(release('v0.9.0')) })
    assert.equal((await latest(env, REPOS))?.repo, OLD, `status ${code}`)
  }
})

test('without an organization token, the organization is skipped entirely', async () => {
  mockGitHub({ [latestUrl(OLD)]: ok(release('v0.9.0')) })
  const found = await latest({ GITHUB_RELEASES_TOKEN: 'personal-token' }, REPOS)
  assert.equal(found?.repo, OLD)
  assert.equal(calls.length, 1)
})

test('a GitHub outage or network error stops the lookup instead of answering from the old place', async () => {
  mockGitHub({ [latestUrl(ORG)]: status(502), [latestUrl(OLD)]: ok(release('v0.9.0')) })
  assert.equal(await latest(env, REPOS), null)
  assert.equal(calls.length, 1)
  mockGitHub({ [latestUrl(ORG)]: () => { throw new TypeError('network down') }, [latestUrl(OLD)]: ok(release('v0.9.0')) })
  assert.equal(await latest(env, REPOS), null)
})

test('no release anywhere: "not yet", as today', async () => {
  mockGitHub({ [latestUrl(ORG)]: status(404), [latestUrl(OLD)]: status(404) })
  assert.equal(await latest(env, REPOS), null)
  const res = await listDownloads(new Request('https://x/api/account/downloads?product=vanta'), env, owner, 'u1')
  assert.deepEqual(await res.json(), { files: [], note: 'not_yet' })
})

test('the file is fetched from the repository, with the token, that listed it', async () => {
  const asset = `https://api.github.com/repos/${OLD}/releases/assets/11`
  mockGitHub({
    [latestUrl(ORG)]: status(404),
    [latestUrl(OLD)]: ok(release('v0.9.0', 11)),
    [asset]: () => new Response(null, { status: 302, headers: { Location: 'https://objects.example/VANTA.pkg?sig=1' } }),
  })
  const res = await download(new Request('https://x/api/account/download?product=vanta&file=11'), env, owner, 'u1')
  assert.equal(res.status, 302)
  assert.equal(res.headers.get('Location'), 'https://objects.example/VANTA.pkg?sig=1')
  assert.deepEqual(calls.at(-1), { url: asset, auth: 'Bearer personal-token' })
})

test('only files of the latest release can be downloaded', async () => {
  mockGitHub({ [latestUrl(ORG)]: ok(release('v1.0.0', 11)) })
  const res = await download(new Request('https://x/api/account/download?product=vanta&file=99'), env, owner, 'u1')
  assert.equal(res.status, 404)
})
