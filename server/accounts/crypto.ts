// Small crypto helpers for accounts and licences, on the Web Crypto API the Worker provides.

const enc = new TextEncoder()

export const hex = (buf: ArrayBuffer | Uint8Array) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

export const fromHex = (s: string) => new Uint8Array((s.match(/../g) ?? []).map((h) => parseInt(h, 16)))

export const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

/** A random, URL-safe token with `bytes` of entropy (session ids, email links, OAuth state). */
export const randomToken = (bytes = 32) => b64url(crypto.getRandomValues(new Uint8Array(bytes)))

/** A random id for database rows. */
export const newId = () => hex(crypto.getRandomValues(new Uint8Array(12)))

export async function sha256Hex(s: string | Uint8Array<ArrayBuffer>) {
  return hex(await crypto.subtle.digest('SHA-256', typeof s === 'string' ? enc.encode(s) : s))
}

export async function hmacHex(secret: string | Uint8Array<ArrayBuffer>, message: string) {
  const key = await crypto.subtle.importKey('raw', typeof secret === 'string' ? enc.encode(secret) : secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(message)))
}

/** Compares two strings in time that doesn't depend on where they differ. */
export function sameString(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/*
 * Passwords. The browser runs the slow part: PBKDF2-SHA256, 600,000 rounds, salted with the site
 * and the email address (src/account/password.ts), and sends only the result. The server stores a
 * salted HMAC of that result. The password itself never reaches the server, a leaked database
 * still costs an attacker the full slow hash per guess, and the Worker stays within its CPU limit.
 */
export async function hashPassword(clientHash: string, salt = randomToken(16)) {
  return `v1$${salt}$${await hmacHex(salt, clientHash)}`
}

export async function checkPassword(clientHash: string, stored: string | null) {
  if (!stored) return false
  const [v, salt, digest] = stored.split('$')
  if (v !== 'v1' || !salt || !digest) return false
  return sameString(await hmacHex(salt, clientHash), digest)
}
