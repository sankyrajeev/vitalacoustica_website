import { DIM, features } from './features'

// Runs the assistant's trained model in the browser. The weights (about 40 KB compressed)
// are a separate file, fetched the first time the chat is opened.

type Model = { intents: string[]; scale: number[]; bias: number[]; weights: Int8Array }

let loading: Promise<Model> | null = null

/** Starts fetching the model; safe to call as often as you like. */
export function loadModel() {
  loading ??= import('./weights').then(({ default: m }) => {
    const bytes = Uint8Array.from(atob(m.weights), (c) => c.charCodeAt(0))
    if (m.dim !== DIM) throw new Error('assistant weights are out of date: run npm run train:assistant')
    return { intents: m.intents, scale: m.scale, bias: m.bias, weights: new Int8Array(bytes.buffer) }
  })
  return loading
}

export type Prediction = { intent: string; p: number }

/** The intents the message most likely means, most likely first, with their probabilities. */
export async function predict(text: string): Promise<Prediction[]> {
  const m = await loadModel()
  const x = features(text)
  const z = m.intents.map((_, c) => {
    let s = 0
    for (let k = 0; k < x.idx.length; k++) s += m.weights[c * DIM + x.idx[k]] * x.val[k]
    return m.bias[c] + s * m.scale[c]
  })
  const max = Math.max(...z)
  const e = z.map((v) => Math.exp(v - max))
  const sum = e.reduce((a, v) => a + v, 0)
  return m.intents.map((intent, c) => ({ intent, p: e[c] / sum })).sort((a, b) => b.p - a.p)
}
