// Licence keys and signed licence files, in the format VANTA already verifies
// (vanta_vitalacoustica: tools/licensing/vlicence.py and source/plugin/Licensing.cpp):
//
//   {"format": "vanta-licence-1", "payload": "<base64 of the licence JSON>", "signature": "<hex>"}
//   signature = SHA-256(payload) ^ d mod n   (raw RSA; the app checks it with its built-in public key)
//
// The private key is kept as a Worker secret in CRT form ({ n, d, p, q, dp, dq, qi } as hex), which
// signs about four times faster than d alone: within the Workers free plan's CPU allowance.
// scripts/licence-key.mjs makes that secret from the private_key.json VANTA's admin.py creates.

import { sha256Hex } from './crypto.ts'

export type SigningKey = { n: bigint; p: bigint; q: bigint; dp: bigint; dq: bigint; qi: bigint }

export function parseSigningKey(json: string | undefined): SigningKey | null {
  if (!json) return null
  try {
    const k = JSON.parse(json) as Record<string, string>
    const big = (h: string) => BigInt(h.startsWith('0x') ? h : `0x${h}`)
    return { n: big(k.n), p: big(k.p), q: big(k.q), dp: big(k.dp), dq: big(k.dq), qi: big(k.qi) }
  } catch {
    return null
  }
}

function modPow(base: bigint, exp: bigint, mod: bigint) {
  let result = 1n
  base %= mod
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod
    base = (base * base) % mod
    exp >>= 1n
  }
  return result
}

/** h ^ d mod n, by the Chinese remainder theorem. */
export function rsaSign(h: bigint, k: SigningKey) {
  const m1 = modPow(h, k.dp, k.p)
  const m2 = modPow(h, k.dq, k.q)
  let t = (k.qi * (m1 - m2)) % k.p
  if (t < 0n) t += k.p
  return m2 + t * k.q
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O or 1/I

/** PREFIX-XXXXX-XXXXX-XXXXX-XXXXX: 20 characters from 32, about 100 bits of randomness. */
export function newLicenceKey(prefix: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  const chars = [...bytes].map((b) => ALPHABET[b & 31])
  return [prefix, ...[0, 1, 2, 3].map((g) => chars.slice(g * 5, g * 5 + 5).join(''))].join('-')
}

export const normaliseKey = (key: string) =>
  key
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/^-+|-+$/g, '')

export type LicenceFields = {
  product: string
  key: string
  email: string
  machine: string
  machineName: string
  edition: string
  issued: string // YYYY-MM-DD
  expires: string | null
}

const base64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)))

/** A signed licence file for one computer, as text. */
export async function signLicence(k: SigningKey, fields: LicenceFields) {
  // keys sorted, like the Python tools, so the same licence always gives the same file
  const sorted = Object.fromEntries(Object.entries(fields).sort(([a], [b]) => a.localeCompare(b)))
  const payload = base64(JSON.stringify(sorted))
  const h = BigInt(`0x${await sha256Hex(payload)}`)
  const signature = rsaSign(h, k).toString(16)
  return JSON.stringify({ format: 'vanta-licence-1', payload, signature }, null, 1)
}

/* ─────────────── Pixel Forge (PF1, Ed25519) ─────────────── */
// pixel_forge: pixelforge/licensing.py. A token is PF1.<base64url payload>.<base64url signature>, the
// signature being Ed25519 over "PF1" + payload. The secret is the Licence Manager's private_key.pem
// (PKCS#8), so keys it makes by hand and keys the website issues check against the same public key.

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

export async function parseEd25519Key(pem: string | undefined) {
  if (!pem) return null
  try {
    const der = Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), (c) => c.charCodeAt(0))
    return await crypto.subtle.importKey('pkcs8', der, { name: 'Ed25519' }, false, ['sign'])
  } catch {
    return null
  }
}

export type Pf1Fields = {
  id: string // the licence key
  n: string // licensed to
  e: string // email
  t: 'full' | 'trial'
  i: string // issued, YYYY-MM-DD
  x: string | null // licence end, or null
  m: string // the computer it's locked to
  r: string | null // check in again by (the lease), YYYY-MM-DD
}

export async function signPf1(key: CryptoKey, fields: Pf1Fields) {
  const payload = new TextEncoder().encode(JSON.stringify(fields))
  const message = new Uint8Array([...new TextEncoder().encode('PF1'), ...payload])
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'Ed25519' }, key, message))
  return `PF1.${b64url(payload)}.${b64url(signature)}`
}
