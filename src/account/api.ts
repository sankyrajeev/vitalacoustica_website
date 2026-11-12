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
  user: { id: string; admin?: boolean; email: string; name: string | null; hasPassword: boolean; google: boolean }
  licences: Licence[]
  orders: Order[]
}

export type Tester = {
  key: string
  product: string
  email: string
  note: string | null
  expires: string | null
  revoked: boolean
  created: number
  devices: number
  termsAccepted: string | null
  termsVersion: string | null
  lastSeen: number | null
  version: string | null
  sessions: number
  feedback: number
  crashes: number
}

export type Report = {
  id: number
  received_at: number
  product: string | null
  key: string | null
  machine: string
  type: string
  email: string
  crash: number
  message: string
  system: string
  log_size: number | null
  logs?: string
}

export type BetaRequest = {
  id: number
  product: string
  email: string
  name: string | null
  about: string | null
  system: string | null
  daw: string | null
  status: 'pending' | 'approved' | 'declined'
  licence_key: string | null
  created_at: number
  decided_at: number | null
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
  options: () => request<{ google: boolean }>('/api/account/options'),
  signup: async (email: string, name: string, password: string) => request('/api/account/signup', { email, name, password: await passwordHash(email, password) }),
  login: async (email: string, password: string) => request('/api/account/login', { email, password: await passwordHash(email, password) }),
  logout: () => request('/api/account/logout', {}),
  forgot: (email: string) => request('/api/account/forgot', { email }),
  resetInfo: (token: string) => request<{ email: string }>(`/api/account/reset?token=${encodeURIComponent(token)}`),
  reset: async (token: string, email: string, password: string) => request('/api/account/reset', { token, password: await passwordHash(email, password) }),
  changePassword: async (email: string, current: string | null, next: string) =>
    request('/api/account/password', { current: current === null ? undefined : await passwordHash(email, current), next: await passwordHash(email, next) }),
  removeDevice: (key: string, machine: string) => request('/api/account/device/remove', { key, machine }),
  admin: {
    testers: () => request<{ testers: Tester[] }>('/api/admin/beta'),
    feedback: (crashOnly: boolean) => request<{ feedback: Report[] }>(`/api/admin/feedback${crashOnly ? '?crash=1' : ''}`),
    report: (id: number) => request<{ item: Report }>(`/api/admin/feedback/item?id=${id}`),
    issue: (b: { email: string; name: string; expires: string; note: string; send: boolean }) => request<{ key: string; sent: boolean }>('/api/admin/beta/issue', b),
    revoke: (key: string) => request('/api/admin/beta/revoke', { key }),
    requests: (status: BetaRequest['status']) => request<{ requests: BetaRequest[] }>(`/api/admin/beta/requests?status=${status}`),
    approve: (id: number, expires: string) => request<{ key: string; sent: boolean }>('/api/admin/beta/approve', { id, expires }),
    decline: (id: number) => request('/api/admin/beta/decline', { id }),
    status: () => request<Record<'database' | 'email' | 'admins' | 'vantaKey' | 'pixelForgeKey' | 'downloads' | 'paddle' | 'google', boolean>>('/api/admin/status'),
    launchAlerts: () => request<{ alerts: { product: string; name: string; waiting: number; told: number }[] }>('/api/admin/launch'),
    sendLaunch: (product: string) => request<{ sent: number; left: number }>('/api/admin/launch/send', { product }),
  },
  notifyMe: (b: { product: string; email: string; detail: string; _gotcha: string }) => request('/api/notify', b),
  requestBeta: (b: { product: string; name: string; email: string; about: string; system: string; daw: string; _gotcha: string }) => request('/api/beta/request', b),
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
    case 'invalid_expiry':
      return 'Choose an end date in the future.'
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
