#!/usr/bin/env node
// Turns an app's licence signing key into the Worker secret the website signs licences with.
//
//   node scripts/licence-key.mjs convert path/to/private_key.json   (the file VANTA's admin.py genkeys writes)
//   node scripts/licence-key.mjs new path/to/folder                 (a new key pair, for a new product)
//
// convert prints the secret: the same key in CRT form ({ n, d, p, q, dp, dq, qi } as hex), which signs
// about four times faster. Paste it into Cloudflare as a secret (e.g. LICENCE_KEY_VANTA) with
//   npx wrangler secret put LICENCE_KEY_VANTA
// and never commit it, paste it into a chat, or put it in an app: anyone holding it can make licences.
//
// new writes private_key.json (secret: back it up offline) and public_key.txt, the "e,n" string the
// app is built with (-DVANTA_LICENCE_PUBLIC_KEY_FILE=public_key.txt), in the same format as admin.py.

import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const E = 65537n

function modPow(b, e, m) {
  let r = 1n
  b %= m
  while (e > 0n) {
    if (e & 1n) r = (r * b) % m
    b = (b * b) % m
    e >>= 1n
  }
  return r
}
const gcd = (a, b) => (b ? gcd(b, a % b) : a)
function modInv(a, m) {
  let [r0, r1, s0, s1] = [a % m, m, 1n, 0n]
  while (r1) {
    const q = r0 / r1
    ;[r0, r1] = [r1, r0 - q * r1]
    ;[s0, s1] = [s1, s0 - q * s1]
  }
  return ((s0 % m) + m) % m
}
const big = (h) => BigInt(String(h).startsWith('0x') ? h : `0x${h}`)
const randBig = (bytes) => BigInt(`0x${randomBytes(bytes).toString('hex')}`)

/** Recovers p and q from n, e and d (the standard randomized method; quick for any valid key). */
function factor(n, e, d) {
  const k = d * e - 1n
  let t = k
  let s = 0n
  while (!(t & 1n)) {
    t >>= 1n
    s++
  }
  for (let tries = 0; tries < 200; tries++) {
    const g = (randBig(Math.ceil(n.toString(16).length / 2)) % (n - 3n)) + 2n
    let x = modPow(g, t, n)
    if (x === 1n || x === n - 1n) continue
    for (let i = 0n; i < s; i++) {
      const y = (x * x) % n
      if (y === 1n) {
        const p = gcd(x - 1n, n)
        if (p > 1n && p < n) return [p, n / p]
      }
      if (y === n - 1n) break
      x = y
    }
  }
  throw new Error('could not factor: is this a valid key?')
}

function crt(n, d) {
  const [a, b] = factor(n, E, d)
  const [p, q] = a > b ? [a, b] : [b, a]
  const hex = (v) => v.toString(16)
  return { n: hex(n), d: hex(d), p: hex(p), q: hex(q), dp: hex(d % (p - 1n)), dq: hex(d % (q - 1n)), qi: hex(modInv(q, p)) }
}

function isProbablePrime(n) {
  if (n < 4n) return n === 2n || n === 3n
  for (const sp of [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n]) if (n % sp === 0n) return n === sp
  let d = n - 1n
  let r = 0n
  while (!(d & 1n)) {
    d >>= 1n
    r++
  }
  outer: for (let i = 0; i < 40; i++) {
    const a = (randBig(64) % (n - 4n)) + 2n
    let x = modPow(a, d, n)
    if (x === 1n || x === n - 1n) continue
    for (let j = 1n; j < r; j++) {
      x = (x * x) % n
      if (x === n - 1n) continue outer
    }
    return false
  }
  return true
}
function randomPrime(bits) {
  for (;;) {
    let c = randBig(bits / 8) | (1n << BigInt(bits - 1)) | (1n << BigInt(bits - 2)) | 1n
    if (isProbablePrime(c)) return c
  }
}

const [cmd, arg] = process.argv.slice(2)
if (cmd === 'convert' && arg) {
  const k = JSON.parse(readFileSync(arg, 'utf8'))
  const key = crt(big(k.n), big(k.d))
  // check it before printing: sign and verify a number
  const m = 123456789n
  if (modPow(modPow(m, big(key.d), big(key.n)), E, big(key.n)) !== m) throw new Error('key check failed')
  process.stdout.write(`${JSON.stringify(key)}\n`)
} else if (cmd === 'new' && arg) {
  const priv = join(arg, 'private_key.json')
  if (existsSync(priv)) throw new Error(`${priv} exists; refusing to overwrite (every licence ever issued depends on it)`)
  mkdirSync(arg, { recursive: true })
  let p, q, d
  for (;;) {
    p = randomPrime(1024)
    q = randomPrime(1024)
    const phi = (p - 1n) * (q - 1n)
    if (p !== q && gcd(E, phi) === 1n) {
      d = modInv(E, phi)
      break
    }
  }
  const n = p * q
  writeFileSync(priv, JSON.stringify({ d: d.toString(16), n: n.toString(16) }), { mode: 0o600 })
  writeFileSync(join(arg, 'public_key.txt'), `${E.toString(16)},${n.toString(16)}\n`)
  console.log(`wrote ${priv} (SECRET: back it up offline, never commit it) and ${join(arg, 'public_key.txt')}`)
  console.log(`then: node scripts/licence-key.mjs convert ${priv} | npx wrangler secret put LICENCE_KEY_<PRODUCT>`)
} else {
  console.log('usage: node scripts/licence-key.mjs convert private_key.json | new folder')
  process.exit(1)
}
