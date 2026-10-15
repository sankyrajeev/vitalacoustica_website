// Trains the site assistant's intent model and writes src/assistant/weights.ts.
// Run with `npm run train:assistant` after editing src/assistant/training.ts.
//
// The model is a small softmax (multinomial logistic) regression over the hashed features in
// features.ts. Each training example is also fed in with made-up typos, so the model copes
// with the way people actually type. The weights are stored as 8-bit integers to keep the
// file small enough to load the moment the chat opens.

import { writeFileSync } from 'node:fs'
import { DIM, features, type Features } from '../src/assistant/features.ts'
import { INTENTS, TEST } from '../src/assistant/training.ts'

const EPOCHS = 400
const RATE = 0.08
const L2 = 2e-5
const TYPO_COPIES = 5

// seeded random numbers, so training gives the same model every time
let seed = 1234567
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)]

const KEYS = 'qwertyuiopasdfghjklzxcvbnm'
const FILLERS = ['please', 'hey', 'hi', 'can you tell me', 'i want to know', 'quick question', 'bro', 'ok so']

/** The same message as someone might mistype it. */
function typo(text: string) {
  let s = text
  const edits = 1 + Math.floor(rand() * 2)
  for (let e = 0; e < edits; e++) {
    const i = Math.floor(rand() * s.length)
    const r = rand()
    if (s.length < 4 || s[i] === ' ') continue
    if (r < 0.25) s = s.slice(0, i) + s.slice(i + 1) // missed a key
    else if (r < 0.5) s = s.slice(0, i) + s[i] + s.slice(i) // doubled a key
    else if (r < 0.7) s = s.slice(0, i) + pick(KEYS.split('')) + s.slice(i + 1) // wrong key
    else if (i + 1 < s.length) s = s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2) // swapped
  }
  const r = rand()
  if (r < 0.15) s = `${pick(FILLERS)} ${s}`
  else if (r < 0.25) s += '?'
  return s
}

const intents = Object.keys(INTENTS)
const C = intents.length
const data: { x: Features; y: number }[] = []
intents.forEach((name, y) => {
  for (const text of INTENTS[name]) {
    data.push({ x: features(text), y })
    for (let k = 0; k < TYPO_COPIES; k++) data.push({ x: features(typo(text)), y })
  }
})

// class weights, so intents with fewer examples still count as much
const perClass = intents.map((_, c) => data.filter((d) => d.y === c).length)
const weightOf = perClass.map((n) => data.length / (C * n))

const W = new Float64Array(C * DIM)
const b = new Float64Array(C)
// Adam optimiser state
const mW = new Float64Array(C * DIM), vW = new Float64Array(C * DIM)
const mb = new Float64Array(C), vb = new Float64Array(C)

function scores(x: Features, w: ArrayLike<number>, bias: ArrayLike<number>) {
  const z = new Float64Array(C)
  for (let c = 0; c < C; c++) {
    let s = bias[c]
    for (let k = 0; k < x.idx.length; k++) s += w[c * DIM + x.idx[k]] * x.val[k]
    z[c] = s
  }
  const max = Math.max(...z)
  let sum = 0
  for (let c = 0; c < C; c++) sum += z[c] = Math.exp(z[c] - max)
  for (let c = 0; c < C; c++) z[c] /= sum
  return z
}

for (let epoch = 1; epoch <= EPOCHS; epoch++) {
  const gW = new Float64Array(C * DIM)
  const gb = new Float64Array(C)
  let loss = 0
  for (const { x, y } of data) {
    const p = scores(x, W, b)
    const cw = weightOf[y]
    loss -= cw * Math.log(p[y] + 1e-12)
    for (let c = 0; c < C; c++) {
      const g = cw * (p[c] - (c === y ? 1 : 0))
      gb[c] += g
      for (let k = 0; k < x.idx.length; k++) gW[c * DIM + x.idx[k]] += g * x.val[k]
    }
  }
  const n = data.length
  const t = epoch
  const step = (w: Float64Array, g: Float64Array, m: Float64Array, v: Float64Array, decay: number) => {
    for (let i = 0; i < w.length; i++) {
      const gi = g[i] / n + decay * w[i]
      m[i] = 0.9 * m[i] + 0.1 * gi
      v[i] = 0.999 * v[i] + 0.001 * gi * gi
      w[i] -= (RATE * (m[i] / (1 - 0.9 ** t))) / (Math.sqrt(v[i] / (1 - 0.999 ** t)) + 1e-8)
    }
  }
  step(W, gW, mW, vW, L2)
  step(b, gb, mb, vb, 0)
  if (epoch % 100 === 0) console.log(`epoch ${epoch}  loss ${(loss / n).toFixed(4)}`)
}

// 8-bit weights: each intent's row is scaled so its largest weight is 127
const scale = intents.map((_, c) => {
  let max = 0
  for (let i = 0; i < DIM; i++) max = Math.max(max, Math.abs(W[c * DIM + i]))
  return max / 127 || 1
})
const q = new Int8Array(C * DIM)
for (let c = 0; c < C; c++) for (let i = 0; i < DIM; i++) q[c * DIM + i] = Math.round(W[c * DIM + i] / scale[c])
const deq = Float64Array.from(q, (v, i) => v * scale[Math.floor(i / DIM)])

const accuracy = (set: [string, string][], w: ArrayLike<number>) => {
  const wrong: string[] = []
  for (const [text, label] of set) {
    const p = scores(features(text), w, b)
    const best = p.indexOf(Math.max(...p))
    if (intents[best] !== label) wrong.push(`  "${text}" → ${intents[best]} (${(p[best] * 100).toFixed(0)}%), should be ${label}`)
  }
  return { pct: ((1 - wrong.length / set.length) * 100).toFixed(1), wrong }
}
const train = accuracy(intents.flatMap((name) => INTENTS[name].map((t) => [t, name] as [string, string])), deq)
const test = accuracy(TEST, deq)
console.log(`\n${C} intents, ${data.length} training examples (with typos), ${DIM} features`)
console.log(`training accuracy ${train.pct}%`)
console.log(`test accuracy     ${test.pct}% on ${TEST.length} phrasings it never saw`)
if (test.wrong.length) console.log(test.wrong.join('\n'))

const out = `// Generated by scripts/train-assistant.ts from training.ts. Do not edit by hand: run \`npm run train:assistant\`.
export default {
  intents: ${JSON.stringify(intents)},
  dim: ${DIM},
  scale: ${JSON.stringify(scale.map((s) => +s.toPrecision(6)))},
  bias: ${JSON.stringify(Array.from(b, (v) => +v.toFixed(5)))},
  weights: '${Buffer.from(q.buffer).toString('base64')}',
}
`
const file = new URL('../src/assistant/weights.ts', import.meta.url)
writeFileSync(file, out)
console.log(`\nwrote src/assistant/weights.ts (${(out.length / 1024).toFixed(1)} KB)`)
