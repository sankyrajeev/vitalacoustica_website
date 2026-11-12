// The accounts database (Cloudflare D1) and the bits every account route shares.

export type D1Result<T> = { results: T[] }
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = Record<string, unknown>>(): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>
  run(): Promise<{ meta: { changes: number } }>
}
export interface D1Database {
  prepare(query: string): D1PreparedStatement
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>
}

export type AccountsEnv = {
  DB?: D1Database
  SITE_URL?: string
  RESEND_API_KEY?: string
  ENQUIRY_FROM?: string
  ACCOUNT_FROM?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  PADDLE_WEBHOOK_SECRET?: string
  PADDLE_API_KEY?: string
  PADDLE_ENV?: string // 'sandbox' while testing; production otherwise
  PADDLE_PRODUCTS?: string // JSON: { "pro_…": "vanta", … }
  GITHUB_RELEASES_TOKEN?: string
  LICENCE_KEY_VANTA?: string
  LICENCE_KEY_ORBIT?: string
  LICENCE_KEY_LUMIERE?: string
  /** local development only: print email links to the log instead of sending them */
  DEV_EMAIL_LOG?: string
}

export const now = () => Math.floor(Date.now() / 1000)

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } })

export const siteUrl = (env: AccountsEnv, request: Request) => (env.SITE_URL || new URL(request.url).origin).replace(/\/$/, '')

/** Accounts need the database; until it's set up every account route answers this. */
export const notConfigured = () => json({ error: 'not_configured' }, 503)

/**
 * Counts an attempt in a fixed window; true when the limit is passed. Used for sign-in,
 * sign-up, password resets and licence activations.
 */
export async function limited(db: D1Database, bucket: string, max: number, windowSeconds: number) {
  const t = now()
  const row = await db
    .prepare(
      `INSERT INTO rate_limits (bucket, count, reset_at) VALUES (?1, 1, ?2)
       ON CONFLICT (bucket) DO UPDATE SET
         count = CASE WHEN reset_at <= ?3 THEN 1 ELSE count + 1 END,
         reset_at = CASE WHEN reset_at <= ?3 THEN ?2 ELSE reset_at END
       RETURNING count`,
    )
    .bind(bucket, t + windowSeconds, t)
    .first<{ count: number }>()
  return (row?.count ?? 0) > max
}

export const clientIp = (request: Request) => request.headers.get('CF-Connecting-IP') || 'local'

export async function readJson<T = Record<string, unknown>>(request: Request, maxBytes = 8192): Promise<T | null> {
  const text = await request.text()
  if (text.length > maxBytes) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

/**
 * Requests that change something must come from our own pages: same origin, sent as JSON.
 * Together with SameSite=Lax cookies this blocks cross-site request forgery.
 */
export function sameOrigin(request: Request, env: AccountsEnv) {
  const origin = request.headers.get('Origin')
  const site = new URL(siteUrl(env, request)).origin
  const own = new URL(request.url).origin
  return (!origin || origin === site || origin === own) && (request.headers.get('Content-Type') || '').includes('application/json')
}
