#!/usr/bin/env node
// Writes src/content/audio-peaks.json: each demo clip's length and the shape of its waveform, which
// the shop's players draw before anything plays. Run it after adding or replacing clips in
// public/shop/ (needs ffmpeg):   node scripts/audio-peaks.mjs
import { spawnSync } from 'node:child_process'
import { readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const PUBLIC = 'public'
const BARS = 64
const RATE = 8000

const files = []
const walk = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(mp3|m4a|wav|ogg)$/i.test(f)) files.push(p)
  }
}
walk(join(PUBLIC, 'shop'))

const out = {}
for (const f of files.sort()) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', f, '-ac', '1', '-ar', String(RATE), '-f', 's16le', '-'], { maxBuffer: 1 << 28 })
  if (r.status !== 0) throw new Error(`ffmpeg failed on ${f}: ${r.stderr}`)
  const pcm = new Int16Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length >> 1)
  const per = Math.max(1, Math.floor(pcm.length / BARS))
  const rms = Array.from({ length: BARS }, (_, b) => {
    let s = 0
    for (let i = b * per; i < (b + 1) * per && i < pcm.length; i++) s += pcm[i] * pcm[i]
    return Math.sqrt(s / per)
  })
  const max = Math.max(...rms, 1)
  out[relative(PUBLIC, f).split('\\').join('/')] = {
    length: Math.round((pcm.length / RATE) * 10) / 10,
    peaks: rms.map((v) => Math.round(Math.max(0.06, v / max) * 100) / 100),
  }
}
const lines = Object.entries(out).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
writeFileSync('src/content/audio-peaks.json', `{\n${lines.join(',\n')}\n}\n`)
console.log(`${Object.keys(out).length} clips → src/content/audio-peaks.json`)
