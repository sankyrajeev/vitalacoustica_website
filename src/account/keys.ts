// Makes a licence signing key pair in the browser (the admin page's "Signing keys"), in the formats
// VANTA's tools use: nothing is sent anywhere. Same maths as scripts/licence-key.mjs.

const E = 65537n

const randBig = (bytes: number) => BigInt(`0x${[...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, '0')).join('')}`)

function modPow(b: bigint, e: bigint, m: bigint) {
  let r = 1n
  b %= m
  while (e > 0n) {
    if (e & 1n) r = (r * b) % m
    b = (b * b) % m
    e >>= 1n
  }
  return r
}
const gcd = (a: bigint, b: bigint): bigint => (b ? gcd(b, a % b) : a)
function modInv(a: bigint, m: bigint) {
  let [r0, r1, s0, s1] = [a % m, m, 1n, 0n]
  while (r1) {
    const q = r0 / r1
    ;[r0, r1] = [r1, r0 - q * r1]
    ;[s0, s1] = [s1, s0 - q * s1]
  }
  return ((s0 % m) + m) % m
}

const SMALL = [3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n, 43n, 47n, 53n, 59n, 61n, 67n, 71n, 73n]
function probablePrime(n: bigint) {
  for (const p of SMALL) if (n % p === 0n) return n === p
  let d = n - 1n
  let r = 0n
  while (!(d & 1n)) {
    d >>= 1n
    r++
  }
  next: for (let i = 0; i < 40; i++) {
    const a = (randBig(64) % (n - 4n)) + 2n
    let x = modPow(a, d, n)
    if (x === 1n || x === n - 1n) continue
    for (let j = 1n; j < r; j++) {
      x = (x * x) % n
      if (x === n - 1n) continue next
    }
    return false
  }
  return true
}
function randomPrime(bits: number) {
  for (;;) {
    const c = randBig(bits / 8) | (1n << BigInt(bits - 1)) | (1n << BigInt(bits - 2)) | 1n
    if (probablePrime(c)) return c
  }
}

export type KeyPair = {
  /** "e,n" in hex: what the app is built with (VANTA: the GitHub secret VANTA_LICENCE_PUBLIC_KEY) */
  publicKey: string
  /** the Worker secret (LICENCE_KEY_VANTA): the private key in CRT form */
  secret: string
  /** private_key.json, as VANTA's admin.py writes it: the offline backup */
  backup: string
}

/** A new 2048-bit RSA key pair. Takes a second or two. */
export async function makeRsaKeyPair(): Promise<KeyPair> {
  await new Promise((r) => setTimeout(r, 30)) // let the page show "Making…" first
  for (;;) {
    const p = randomPrime(1024)
    const q = randomPrime(1024)
    const phi = (p - 1n) * (q - 1n)
    if (p === q || gcd(E, phi) !== 1n) continue
    const [P, Q] = p > q ? [p, q] : [q, p]
    const n = P * Q
    const d = modInv(E, phi)
    const hex = (v: bigint) => v.toString(16)
    // check it: sign and verify a number
    const m = 123456789n
    if (modPow(modPow(m, d, n), E, n) !== m) continue
    return {
      publicKey: `${hex(E)},${hex(n)}`,
      secret: JSON.stringify({ n: hex(n), d: hex(d), p: hex(P), q: hex(Q), dp: hex(d % (P - 1n)), dq: hex(d % (Q - 1n)), qi: hex(modInv(Q, P)) }),
      backup: JSON.stringify({ d: hex(d), n: hex(n) }),
    }
  }
}
