// How the assistant's model reads a message. The same code runs in the training script and in
// the browser, so the model always sees text the way it was trained on it.
// A message becomes a sparse vector of hashed features: whole words, word pairs, and the
// three-letter pieces of each word (so "speekers" still looks a lot like "speakers").

export const DIM = 2048

// shorthand people type in chats
const SHORT: Record<string, string> = {
  u: 'you',
  ur: 'your',
  r: 'are',
  pls: 'please',
  plz: 'please',
  plss: 'please',
  ppl: 'people',
  wat: 'what',
  wht: 'what',
  whats: 'what is',
  hw: 'how',
  abt: 'about',
  thnx: 'thanks',
  tnx: 'thanks',
  bcoz: 'because',
  info: 'information',
}

/** Lower-cased words, with shorthand expanded and numbers folded into one token. */
export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9& ]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .flatMap((w) => (SHORT[w] ?? w).split(' '))
    .map((w) => (/^\d+(st|nd|rd|th|k)?$/.test(w) ? '#n' : w))
}

// FNV-1a: a fast, stable string hash
function hash(s: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0) % DIM
}

export type Features = { idx: number[]; val: number[] }

/** The feature vector for a message, L2-normalised so long and short messages weigh the same. */
export function features(text: string): Features {
  const words = tokens(text)
  const counts = new Map<number, number>()
  const add = (key: string, w: number) => {
    const h = hash(key)
    counts.set(h, (counts.get(h) ?? 0) + w)
  }
  words.forEach((w, i) => {
    add(`w:${w}`, 1)
    if (i > 0) add(`b:${words[i - 1]} ${w}`, 1)
    if (w === '#n') return
    const padded = `<${w}>`
    for (let j = 0; j + 3 <= padded.length; j++) add(`c:${padded.slice(j, j + 3)}`, 0.5)
  })
  let norm = 0
  counts.forEach((v) => (norm += v * v))
  norm = Math.sqrt(norm) || 1
  const idx: number[] = []
  const val: number[] = []
  counts.forEach((v, k) => {
    idx.push(k)
    val.push(v / norm)
  })
  return { idx, val }
}
