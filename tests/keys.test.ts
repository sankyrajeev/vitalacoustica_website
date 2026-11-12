// The admin page's key maker: its keys sign licences that check out with its public key.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { makeRsaKeyPair } from '../src/account/keys.ts'
import { parseSigningKey, signLicence } from '../server/accounts/licence.ts'

test('a key pair made in the browser signs licences its public key verifies', async () => {
  const keys = await makeRsaKeyPair()
  const [e, n] = keys.publicKey.split(',').map((h) => BigInt(`0x${h}`))
  assert.equal(e, 65537n)
  assert.equal(n.toString(2).length, 2048)
  const backup = JSON.parse(keys.backup) as { d: string; n: string }
  assert.equal(BigInt(`0x${backup.n}`), n)
  const k = parseSigningKey(keys.secret)!
  const text = await signLicence(k, { product: 'VANTA', key: 'VNTA-AAAAA-BBBBB-CCCCC-DDDDD', email: 'a@example.com', machine: 'm', machineName: 'Mac', edition: 'Beta', issued: '2026-11-12', expires: '2027-01-11' })
  const file = JSON.parse(text) as { payload: string; signature: string }
  let r = 1n
  let b = BigInt(`0x${file.signature}`) % n
  let x = e
  while (x > 0n) {
    if (x & 1n) r = (r * b) % n
    b = (b * b) % n
    x >>= 1n
  }
  assert.equal(r, BigInt(`0x${createHash('sha256').update(file.payload).digest('hex')}`))
})
