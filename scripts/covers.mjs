#!/usr/bin/env node
// Draws the blog's cover illustrations: brass line art on the site's dark ground, one per motif,
// written to public/media/journal/<name>-{480,800,1600}.webp (the files articles name as `cover`).
// We don't have photos for every article, so the covers are drawn instead.
//
//   node scripts/covers.mjs             draw every motif below
//   node scripts/covers.mjs amp-rack    draw one
//
// Needs Playwright's Chromium (to render) and Python's Pillow (to write WebP). The images are
// committed, so the site's build never needs either.

import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public/media/journal')
const W = 1600
const H = 1000

const BG = '#121212'
const BRASS = '#c7b07f'
const DIM = 'rgba(199,176,127,0.28)'
const FAINT = 'rgba(199,176,127,0.12)'
const INK = '#efe9df'

const line = (d, w = 2.2, c = BRASS) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`
const circle = (x, y, r, c = BRASS, w = 2) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${c}" stroke-width="${w}"/>`
const dot = (x, y, r, c = BRASS) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`
const rect = (x, y, w, h, c = BRASS, sw = 2, rx = 4) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="none" stroke="${c}" stroke-width="${sw}"/>`
const range = (n) => [...Array(n).keys()]

/** Soft light falling from a point: for beams and coverage. */
const beam = (x, y, x1, x2, yEnd, id) => `
<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="${BRASS}" stop-opacity="0.32"/><stop offset="1" stop-color="${BRASS}" stop-opacity="0"/>
</linearGradient></defs>
<path d="M${x} ${y} L${x1} ${yEnd} L${x2} ${yEnd} Z" fill="url(#${id})"/>`

const MOTIFS = {
  // a curved line array hanging from its frame, wavefronts leaving it
  'line-array-hang': () => {
    let s = line('M560 150 L860 150', 3) + line('M610 150 L640 110 M810 150 L780 110', 2, DIM) + line('M640 110 L780 110', 2, DIM)
    let x = 600
    let y = 160
    for (const i of range(12)) {
      const tilt = i * 1.6
      s += `<g transform="translate(${x} ${y}) rotate(${tilt})">${rect(0, 0, 220, 50, BRASS, 2.2, 3)}${line('M18 25 L202 25', 1.2, DIM)}</g>`
      y += 52
      x += i * 2.1
    }
    for (const r of [180, 300, 420, 540]) s += line(`M${900 + r * 0.2} ${200} Q ${960 + r} ${480} ${900 + r * 0.2} ${800}`, 1.6, r > 300 ? FAINT : DIM)
    return s
  },

  // two stacks and the room they cover
  'venue-system': () => {
    let s = beam(420, 360, 260, 1100, 900, 'b1') + beam(1180, 360, 500, 1340, 900, 'b2')
    for (const [x] of [[360], [1120]]) {
      s += rect(x, 300, 120, 170, BRASS, 2.4) + circle(x + 60, 350, 26) + circle(x + 60, 425, 34) + rect(x - 10, 470, 140, 150, BRASS, 2.4) + circle(x + 60, 545, 52)
    }
    for (const i of range(9)) s += line(`M${260 + i * 135} 820 L${300 + i * 135} 820`, 2, DIM)
    s += line('M200 900 L1400 900', 1.4, DIM)
    return s
  },

  // signal flow: console → processing → amplifiers → loudspeakers
  'amp-rack': () => {
    let s = rect(200, 420, 220, 160) + range(6).map((i) => line(`M${232 + i * 32} 450 L${232 + i * 32} 550`, 2, DIM) + dot(232 + i * 32, 470 + ((i * 37) % 70), 7)).join('')
    s += rect(560, 450, 200, 100) + line('M590 500 Q 620 460 650 500 T 710 500 T 740 500', 2)
    for (const i of range(4)) s += rect(900, 330 + i * 90, 240, 70) + dot(930, 365 + i * 90, 6) + line(`M960 ${365 + i * 90} L1110 ${365 + i * 90}`, 1.4, DIM)
    for (const i of range(4)) s += rect(1260, 330 + i * 90, 80, 70) + circle(1300, 365 + i * 90, 22, BRASS, 1.8)
    s += line('M420 500 L560 500', 2, DIM) + line('M760 500 L840 500 L840 365 L900 365 M840 455 L900 455 M840 545 L900 545 M840 500 L840 635 L900 635', 2, DIM)
    for (const i of range(4)) s += line(`M1140 ${365 + i * 90} L1260 ${365 + i * 90}`, 2, DIM)
    return s
  },

  // a fader bank
  'digital-console': () => {
    let s = rect(240, 260, 1120, 520, BRASS, 2.4, 10) + rect(280, 300, 1040, 120, DIM, 1.6, 6)
    for (const i of range(16)) {
      const x = 320 + i * 62
      const level = 560 + ((i * 53) % 150)
      s += line(`M${x} 470 L${x} 740`, 1.6, DIM) + `<rect x="${x - 14}" y="${level - 10}" width="28" height="20" rx="3" fill="${BRASS}"/>`
      for (const k of range(4)) s += circle(x, 330 + k * 22, 6, k < 1 + ((i * 7) % 4) ? BRASS : DIM, 1.6)
    }
    return s
  },

  // a DMX universe: 512 addresses, a few of them lit, driving a row of beams
  'lighting-console': () => {
    let s = ''
    // a fixed pseudo-random pattern, so the cover is the same every time it's drawn
    let seed = 7
    const random = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
    for (const i of range(512)) {
      const col = i % 32
      const row = Math.floor(i / 32)
      const lit = random() < 0.1
      s += lit ? dot(260 + col * 34, 470 + row * 26, 5.5) : dot(260 + col * 34, 470 + row * 26, 2.4, FAINT)
    }
    for (const i of range(6)) {
      const x = 360 + i * 176
      s += beam(x, 150, x - 90, x + 90, 430, `d${i}`) + rect(x - 26, 120, 52, 34, BRASS, 2, 6)
    }
    s += line('M240 120 L1360 120', 2.4)
    return s
  },

  // a lectern under soft front light, the backdrop lit behind
  'corporate-stage': () => {
    let s = rect(300, 200, 1000, 440, DIM, 1.6, 2)
    s += `<defs><radialGradient id="wash" cx="0.5" cy="0.45" r="0.6"><stop offset="0" stop-color="${BRASS}" stop-opacity="0.22"/><stop offset="1" stop-color="${BRASS}" stop-opacity="0"/></radialGradient></defs><rect x="300" y="200" width="1000" height="440" fill="url(#wash)"/>`
    s += beam(560, 60, 540, 860, 820, 'f1') + beam(1040, 60, 740, 1060, 820, 'f2')
    s += line('M620 820 L660 600 L800 600 L840 820', 2.4) + line('M640 600 L820 600 L812 570 L648 570 Z', 2.4)
    s += line('M200 820 L1400 820', 2.4) + line('M200 860 L1400 860', 1.4, DIM)
    s += rect(540, 40, 40, 30) + rect(1020, 40, 40, 30)
    return s
  },

  // a plan view: truss, positions and dimensions
  'production-planning': () => {
    let s = ''
    for (const i of range(25)) s += line(`M${200 + i * 50} 160 L${200 + i * 50} 840`, 1, FAINT)
    for (const i of range(14)) s += line(`M200 ${160 + i * 52} L1400 ${160 + i * 52}`, 1, FAINT)
    s += rect(400, 260, 800, 360, BRASS, 2.6, 2) + line('M400 300 L1200 300 M400 580 L1200 580', 1.6, DIM)
    for (const i of range(9)) s += circle(440 + i * 90, 280, 10) + circle(440 + i * 90, 600, 10)
    s += rect(700, 680, 200, 90, BRASS, 2, 2) + line('M800 680 L800 620', 1.4, DIM)
    s += line('M400 220 L1200 220 M400 210 L400 230 M1200 210 L1200 230', 1.6, DIM) + line('M1260 260 L1260 620 M1250 260 L1270 260 M1250 620 L1270 620', 1.6, DIM)
    return s
  },

  // flight cases, stacked for the truck
  'production-cases': () => {
    let s = line('M200 820 L1400 820', 2.4)
    const cases = [
      [300, 560, 360, 260],
      [700, 620, 300, 200],
      [1040, 500, 260, 320],
      [340, 380, 280, 180],
      [740, 460, 220, 160],
    ]
    for (const [x, y, w, h] of cases) {
      s += rect(x, y, w, h, BRASS, 2.4, 8) + line(`M${x} ${y + 30} L${x + w} ${y + 30}`, 1.6, DIM)
      s += rect(x + w / 2 - 30, y + h / 2 - 10, 60, 20, BRASS, 1.8, 4)
      for (const [cx, cy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) s += rect(cx - 12, cy - 12, 24, 24, DIM, 1.6, 3)
    }
    return s
  },
}

function svg(name) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><radialGradient id="glow" cx="0.5" cy="0.45" r="0.75"><stop offset="0" stop-color="#1f1c17"/><stop offset="1" stop-color="${BG}"/></radialGradient></defs>
<rect width="${W}" height="${H}" fill="url(#glow)"/>
${MOTIFS[name]()}
<text x="80" y="${H - 70}" font-family="Manrope, Helvetica, Arial, sans-serif" font-size="22" font-weight="600" letter-spacing="6" fill="${INK}" opacity="0.55">VITAL ACOUSTICA</text>
</svg>`
}

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const only = process.argv[2]
const names = only ? [only] : Object.keys(MOTIFS)
if (only && !MOTIFS[only]) {
  console.error(`no motif "${only}"; there are: ${Object.keys(MOTIFS).join(', ')}`)
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })
const work = mkdtempSync(join(tmpdir(), 'covers-'))
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: W, height: H } })
for (const name of names) {
  await page.setContent(`<html><body style="margin:0;background:${BG}">${svg(name)}</body></html>`)
  const png = join(work, `${name}.png`)
  await page.screenshot({ path: png })
  // three sizes, as the site expects
  execFileSync('python3', [
    '-c',
    `import sys
from PIL import Image
src, out, name = sys.argv[1], sys.argv[2], sys.argv[3]
im = Image.open(src).convert('RGB')
for w in (480, 800, 1600):
    im.resize((w, round(w * im.height / im.width)), Image.LANCZOS).save(f"{out}/{name}-{w}.webp", 'WEBP', quality=86, method=6)`,
    png,
    OUT,
    name,
  ])
  console.log(`covers: ${name}`)
}
await browser.close()
rmSync(work, { recursive: true, force: true })
