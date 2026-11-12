// The account pages' side of /api/account/ (server/accounts/).

/**
 * Passwords never leave the browser. We send a slow, salted hash instead: PBKDF2-SHA256 with
 * 600,000 rounds, salted with our name and the email address. The server then stores a salted
 * HMAC of that. Changing any of this would lock every account out, so it stays fixed.
 */
export async function passwordHash(email: string, password: string) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(`vitalacoustica-account:${email.trim().toLowerCase()}`), iterations: 600_000 },
    key,
    256,
  )
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export type Licence = {
  key: string
  product: string
  name: string
  edition: string
  maxDevices: number
  expires: string | null
  revoked: boolean
  orderId: string | null
  created: number
  download: boolean
  devices: { machine: string; name: string; activated: number }[]
}

export type Order = {
  id: string
  status: string
  currency: string | null
  total: number | null
  invoice: string | null
  created: number
  items: { product: string; name: string; quantity: number }[]
}

export type Me = {
  user: { id: string; email: string; name: string | null; hasPassword: boolean; google: boolean }
  licences: Licence[]
  orders: Order[]
}

export type Result<T = Record<string, unknown>> = { ok: boolean; status: number; data: T & { error?: string; status?: string } }

async function request<T>(path: string, body?: unknown): Promise<Result<T>> {
  try {
    const res = await fetch(path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    })
    const data = await res.json().catch(() => ({ error: 'unreachable' }))
    return { ok: res.ok, status: res.status, data }
  } catch {
    return { ok: false, status: 0, data: { error: 'unreachable' } as T & { error: string } }
  }
}

export const api = {
  me: () => request<Me>('/api/account/me'),
  signup: async (email: string, name: string, password: string) => request('/api/account/signup', { email, name, password: await passwordHash(email, password) }),
  login: async (email: string, password: string) => request('/api/account/login', { email, password: await passwordHash(email, password) }),
  logout: () => request('/api/account/logout', {}),
  forgot: (email: string) => request('/api/account/forgot', { email }),
  resetInfo: (token: string) => request<{ email: string }>(`/api/account/reset?token=${encodeURIComponent(token)}`),
  reset: async (token: string, email: string, password: string) => request('/api/account/reset', { token, password: await passwordHash(email, password) }),
  changePassword: async (email: string, current: string | null, next: string) =>
    request('/api/account/password', { current: current === null ? undefined : await passwordHash(email, current), next: await passwordHash(email, next) }),
  removeDevice: (key: string, machine: string) => request('/api/account/device/remove', { key, machine }),
  downloads: (product: string) => request<{ version?: string; files: { id: number; name: string; size: number }[]; note?: string }>(`/api/account/downloads?product=${encodeURIComponent(product)}`),
}

/** Plain words for the server's error codes. */
export function explain(error: string | undefined) {
  switch (error) {
    case 'invalid_email':
      return 'Please enter a valid email address.'
    case 'invalid_credentials':
      return 'That email and password don’t match an account.'
    case 'unverified':
      return 'Please confirm your email address first. We’ve sent you the link again.'
    case 'rate_limited':
      return 'Too many attempts. Please wait a little and try again.'
    case 'wrong_password':
      return 'Your current password isn’t right.'
    case 'link_expired':
      return 'This link has expired or has already been used. Please ask for a new one.'
    case 'not_configured':
    case 'unreachable':
      return 'Accounts aren’t available just now. Please try again later.'
    default:
      return 'Something went wrong. Please try again.'
  }
}

export const MIN_PASSWORD = 10
