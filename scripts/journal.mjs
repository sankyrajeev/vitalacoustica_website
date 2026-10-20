#!/usr/bin/env node
// The Acoustica Journal's publishing tool. Articles are Markdown files in content/journal/, each
// with a header of details (title, category, status, publish time, cover photo…). See docs/journal.md.
//
//   npm run journal                  list every article: status, publish time, what still needs checking
//   npm run journal -- check         check every article (also run by `npm run build`)
//   npm run journal -- build         check, then write server/generated/journal.json for the site
//   npm run journal -- new "Title" [--category "Guides & Insights"] [--day tue|fri]
//                                    start a draft, dated for the next free Tuesday or Friday
//   npm run journal -- schedule <slug> [YYYY-MM-DD] [--time 09:00]
//                                    mark a verified article as scheduled (next free slot if no date)
//   npm run journal -- pulse         list the current Industry Pulse stories from the live site
//   npm run journal -- promote <n>   start a draft analysis of Industry Pulse story n, for review
//
// Publishing rules, enforced here (so the site can't build with an article that breaks them):
//   - only `scheduled` and `published` articles ever appear on the site, from their publishAt time
//   - an article with anything left on its `verify` list needs `verified: true` before either
//   - Industry News articles need at least one source, and `verified: true`
//   - a live article needs its cover photo in public/journal/

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIR = join(ROOT, 'content/journal')
const OUT = join(ROOT, 'server/generated/journal.json')
const SITE = process.env.SITE_URL || 'https://vitalacoustica.com'
const TZ = '+05:30' // India; publish times are written in local time

// keep in step with src/journal/types.ts
const CATEGORIES = ['Audio Engineering', 'Lighting & Production', 'Industry News', 'Production Notes', 'Guides & Insights']
const STATUSES = ['draft', 'review', 'scheduled', 'published']
const SERVICES = ['sound', 'light', 'visuals', 'production', 'installations']
const FRIDAY_KINDS = ['Industry News', 'Production Notes'] // Tuesday: guides and insight; Friday: news and production stories

/* ─────────────── the header: a small subset of YAML ─────────────── */

function scalar(v) {
  v = v.trim()
  if (v === 'true') return true
  if (v === 'false') return false
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v)
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1)
  if (v === '[]') return []
  return v
}

/** key: value · key: then "- item" lines · key: then "- k: v" blocks. Comments with #. */
export function parseHeader(text) {
  const out = {}
  const lines = text.split('\n')
  let key = null
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].replace(/\s+#.*$/, '').replace(/^#.*$/, '')
    if (!raw.trim()) continue
    const top = raw.match(/^([A-Za-z][\w]*):\s*(.*)$/)
    if (top) {
      key = top[1]
      out[key] = top[2] === '' ? [] : scalar(top[2])
      continue
    }
    const item = raw.match(/^\s+-\s+(.*)$/)
    if (item && key && Array.isArray(out[key])) {
      const kv = item[1].match(/^([A-Za-z]\w*):\s*(.*)$/)
      if (kv) {
        const obj = { [kv[1]]: scalar(kv[2]) }
        // following "  key: value" lines belong to this item
        while (i + 1 < lines.length && /^\s{3,}[A-Za-z]\w*:/.test(lines[i + 1]) && !/^\s+-/.test(lines[i + 1])) {
          const m = lines[++i].match(/^\s+([A-Za-z]\w*):\s*(.*)$/)
          obj[m[1]] = scalar(m[2])
        }
        out[key].push(obj)
      } else out[key].push(scalar(item[1]))
    }
  }
  return out
}

function splitFile(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!m) return null
  return { header: parseHeader(m[1]), body: m[2] }
}

/* ─────────────── Markdown → HTML ─────────────── */

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

function inline(s) {
  const codes = []
  s = s.replace(/`([^`]+)`/g, (_, c) => `\uE000${codes.push(c) - 1}\uE000`)
  s = esc(s)
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, url) => {
    const internal = url.startsWith('/')
    return internal
      ? `<a href="${url}" data-internal>${text}</a>`
      : `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`
  })
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
  s = s.replace(/ -- /g, ' – ')
  return s.replace(/\uE000(\d+)\uE000/g, (_, i) => `<code>${esc(codes[i])}</code>`)
}

export function markdown(md) {
  // <!-- notes --> are for the writer and reviewer, never published
  const lines = md.replace(/\r/g, '').replace(/<!--[\s\S]*?-->/g, '').split('\n')
  const html = []
  let i = 0
  const para = []
  const flush = () => {
    if (para.length) html.push(`<p>${inline(para.join(' '))}</p>`)
    para.length = 0
  }
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      flush()
      i++
      continue
    }
    let m
    if ((m = line.match(/^(#{2,4})\s+(.*)$/))) {
      flush()
      const level = m[1].length
      html.push(`<h${level} id="${slugify(m[2])}">${inline(m[2])}</h${level}>`)
      i++
    } else if (/^---+\s*$/.test(line)) {
      flush()
      html.push('<hr>')
      i++
    } else if (/^>\s?/.test(line)) {
      flush()
      const quote = []
      while (i < lines.length && /^>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^>\s?/, ''))
      html.push(`<blockquote>${markdown(quote.join('\n'))}</blockquote>`)
    } else if (/^[-*]\s+/.test(line)) {
      flush()
      const items = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        let item = lines[i++].replace(/^[-*]\s+/, '')
        while (i < lines.length && /^\s{2,}\S/.test(lines[i])) item += ' ' + lines[i++].trim()
        items.push(`<li>${inline(item)}</li>`)
      }
      html.push(`<ul>${items.join('')}</ul>`)
    } else if (/^\d+\.\s+/.test(line)) {
      flush()
      const items = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        let item = lines[i++].replace(/^\d+\.\s+/, '')
        while (i < lines.length && /^\s{2,}\S/.test(lines[i])) item += ' ' + lines[i++].trim()
        items.push(`<li>${inline(item)}</li>`)
      }
      html.push(`<ol>${items.join('')}</ol>`)
    } else if (/^\|/.test(line) && i + 1 < lines.length && /^\|?\s*:?-{3,}/.test(lines[i + 1])) {
      flush()
      const cells = (l) =>
        l
          .trim()
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((c) => c.trim())
      const head = cells(lines[i])
      i += 2
      const rows = []
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(cells(lines[i++]))
      html.push(
        `<div class="article-table"><table><thead><tr>${head.map((h) => `<th scope="col">${inline(h)}</th>`).join('')}</tr></thead><tbody>${rows
          .map((r) => `<tr>${r.map((c, k) => (k === 0 ? `<th scope="row">${inline(c)}</th>` : `<td>${inline(c)}</td>`)).join('')}</tr>`)
          .join('')}</tbody></table></div>`,
      )
    } else {
      para.push(line.trim())
      i++
    }
  }
  flush()
  return html.join('\n')
}

/* ─────────────── loading and checking ─────────────── */

const words = (md) => md.replace(/[#>*`|[\]()-]/g, ' ').split(/\s+/).filter(Boolean).length
const toList = (v) => (Array.isArray(v) ? v : v ? [v] : [])

function load() {
  if (!existsSync(DIR)) return []
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .sort()
    .map((file) => {
      const src = readFileSync(join(DIR, file), 'utf8')
      const parts = splitFile(src)
      return { file, src, ...(parts ?? { header: null, body: '' }) }
    })
}

function coverExists(cover) {
  return [480, 800, 1600].every((w) => existsSync(join(ROOT, `public/media/journal/${cover}-${w}.webp`)))
}

/** Every article, checked. Returns { articles, errors, warnings }. */
export function collect() {
  const errors = []
  const warnings = []
  const seen = new Set()
  const articles = []
  for (const { file, header: h, body } of load()) {
    const where = `content/journal/${file}`
    if (!h) {
      errors.push(`${where}: missing the --- header block`)
      continue
    }
    const fail = (msg) => errors.push(`${where}: ${msg}`)
    const slug = h.slug || file.replace(/\.md$/, '')
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) fail(`slug "${slug}" must be lowercase words joined by hyphens`)
    if (seen.has(slug)) fail(`slug "${slug}" is used twice`)
    seen.add(slug)
    for (const k of ['title', 'excerpt', 'category', 'status', 'publishAt']) if (!h[k]) fail(`missing ${k}`)
    if (h.category && !CATEGORIES.includes(h.category)) fail(`category must be one of: ${CATEGORIES.join(', ')}`)
    if (h.status && !STATUSES.includes(h.status)) fail(`status must be one of: ${STATUSES.join(', ')}`)
    const when = Date.parse(h.publishAt)
    if (h.publishAt && Number.isNaN(when)) fail(`publishAt "${h.publishAt}" is not a date, e.g. 2026-11-03T09:00:00+05:30`)
    const services = toList(h.services)
    for (const s of services) if (!SERVICES.includes(s)) fail(`service "${s}" must be one of: ${SERVICES.join(', ')}`)
    const verify = toList(h.verify).map(String)
    const sources = toList(h.sources)
    const goingOut = h.status === 'scheduled' || h.status === 'published'
    if (goingOut) {
      if (verify.length && h.verified !== true)
        fail(`is ${h.status} but its verify list hasn't been signed off: check each item, then set verified: true`)
      if (h.category === 'Industry News' && (!sources.length || h.verified !== true))
        fail('Industry News needs its sources listed and verified: true before it can be scheduled or published')
      if (!h.cover || !coverExists(h.cover)) fail(`is ${h.status} but its cover photo is missing (public/media/journal/${h.cover ?? '<cover>'}-{480,800,1600}.webp)`)
      if (!h.coverAlt) fail(`is ${h.status} but has no coverAlt (a description of the photo)`)
    } else if (h.cover && !coverExists(h.cover)) warnings.push(`${where}: cover photo "${h.cover}" isn't in public/media/journal yet`)
    if (h.excerpt && String(h.excerpt).length > 220) warnings.push(`${where}: the excerpt is long for cards and search results (over 220 characters)`)
    articles.push({
      slug,
      title: String(h.title ?? ''),
      excerpt: String(h.excerpt ?? ''),
      category: h.category,
      status: h.status,
      publishAt: Number.isNaN(when) ? '' : new Date(when).toISOString(),
      ...(h.updatedAt ? { updatedAt: new Date(Date.parse(h.updatedAt)).toISOString() } : {}),
      author: String(h.author || 'The Acoustica Journal'),
      ...(h.cover ? { cover: String(h.cover) } : {}),
      ...(h.coverAlt ? { coverAlt: String(h.coverAlt) } : {}),
      ...(h.coverCredit ? { coverCredit: String(h.coverCredit) } : {}),
      ...(h.coverCreditUrl ? { coverCreditUrl: String(h.coverCreditUrl) } : {}),
      featured: h.featured === true,
      services,
      related: toList(h.related).map(String),
      readingTime: Math.max(1, Math.round(words(body) / 220)),
      ...(sources.length ? { sources } : {}),
      ...(verify.length ? { verify } : {}),
      verified: h.verified === true,
      html: markdown(body),
    })
  }
  for (const a of articles)
    for (const r of a.related) if (!seen.has(r)) warnings.push(`content/journal/${a.slug}.md: related "${r}" isn't an article`)
  articles.sort((a, b) => (b.publishAt || '').localeCompare(a.publishAt || ''))
  return { articles, errors, warnings }
}

/* ─────────────── commands ─────────────── */

const pad = (s, n) => String(s).padEnd(n).slice(0, n)
const day = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'

function report({ errors, warnings }) {
  for (const w of warnings) console.warn(`  warning  ${w}`)
  for (const e of errors) console.error(`  error    ${e}`)
}

function list() {
  const res = collect()
  const now = Date.now()
  console.log(`\n${pad('STATUS', 10)} ${pad('PUBLISH (IST)', 24)} ${pad('CATEGORY', 22)} ${pad('CHECKS', 8)} SLUG`)
  for (const a of [...res.articles].sort((x, y) => (x.publishAt || '').localeCompare(y.publishAt || ''))) {
    const live = (a.status === 'published' || a.status === 'scheduled') && Date.parse(a.publishAt) <= now
    const st = live ? 'LIVE' : a.status
    const checks = a.verify ? (a.verified ? 'signed' : `${a.verify.length} open`) : '—'
    console.log(`${pad(st, 10)} ${pad(day(a.publishAt), 24)} ${pad(a.category, 22)} ${pad(checks, 8)} ${a.slug}`)
  }
  console.log('')
  report(res)
  return res.errors.length ? 1 : 0
}

function check() {
  const res = collect()
  report(res)
  console.log(`journal: ${res.articles.length} articles, ${res.errors.length} errors, ${res.warnings.length} warnings`)
  return res.errors.length ? 1 : 0
}

function build() {
  const res = collect()
  report(res)
  if (res.errors.length) {
    console.error('journal: not built; fix the errors above')
    return 1
  }
  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), articles: res.articles }))
  console.log(`journal: wrote ${res.articles.length} articles to server/generated/journal.json`)
  return 0
}

/** The next Tuesday (or Friday) on or after `from` that no live, scheduled or reviewed article holds. */
function nextSlot(weekday, taken, from = new Date()) {
  const d = new Date(from)
  d.setUTCHours(12, 0, 0, 0)
  for (let k = 1; k < 400; k++) {
    d.setUTCDate(d.getUTCDate() + 1)
    const ymd = d.toISOString().slice(0, 10)
    if (d.getUTCDay() === weekday && !taken.has(ymd)) return ymd
  }
}

const takenDays = (articles) => new Set(articles.filter((a) => a.status !== 'draft' && a.publishAt).map((a) => istDate(a.publishAt)))
const istDate = (iso) => new Date(Date.parse(iso) + 5.5 * 3600e3).toISOString().slice(0, 10)

function arg(name) {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : undefined
}

function draftFile({ title, slug, category, date, excerpt = '', body, extra = '' }) {
  return `---
title: ${title}
slug: ${slug}
excerpt: ${excerpt || 'One or two sentences for cards, search results and sharing.'}
category: ${category}
status: draft            # draft → review → scheduled (or published)
publishAt: ${date}T09:00:00${TZ}
author: The Acoustica Journal
cover:                   # a photo in public/journal, e.g. console-detail (see docs/journal.md)
coverAlt:
coverCredit:
services:
  - production
related: []
verify:
  - Check every fact, figure and name in this article
verified: false
${extra}---

${body}
`
}

function create() {
  const title = process.argv[3]
  if (!title || title.startsWith('--')) {
    console.error('usage: npm run journal -- new "Title" [--category "Guides & Insights"] [--day tue|fri]')
    return 1
  }
  const category = arg('category') ?? 'Guides & Insights'
  if (!CATEGORIES.includes(category)) {
    console.error(`category must be one of: ${CATEGORIES.join(', ')}`)
    return 1
  }
  const friday = (arg('day') ?? (FRIDAY_KINDS.includes(category) ? 'fri' : 'tue')).startsWith('f')
  const slug = slugify(title)
  const file = join(DIR, `${slug}.md`)
  if (existsSync(file)) {
    console.error(`content/journal/${slug}.md already exists`)
    return 1
  }
  const date = nextSlot(friday ? 5 : 2, takenDays(collect().articles))
  writeFileSync(file, draftFile({ title, slug, category, date, body: 'Write the article here, in Markdown. Use ## for section headings.' }))
  console.log(`created content/journal/${slug}.md (draft, pencilled in for ${date})`)
  return 0
}

function schedule() {
  const slug = process.argv[3]
  const file = join(DIR, `${slug}.md`)
  if (!slug || !existsSync(file)) {
    console.error('usage: npm run journal -- schedule <slug> [YYYY-MM-DD] [--time 09:00]')
    return 1
  }
  const { articles } = collect()
  const a = articles.find((x) => x.slug === slug)
  if (a.verify && !a.verified) {
    console.error(`${slug}: sign off its verify list first (check each item, then set verified: true):`)
    for (const v of a.verify) console.error(`  - ${v}`)
    return 1
  }
  const given = process.argv[4] && !process.argv[4].startsWith('--') ? process.argv[4] : undefined
  const others = new Set([...takenDays(articles.filter((x) => x.slug !== slug))])
  const date = given ?? nextSlot(FRIDAY_KINDS.includes(a.category) ? 5 : 2, others)
  const time = arg('time') ?? '09:00'
  const src = readFileSync(file, 'utf8')
    .replace(/^status:.*$/m, 'status: scheduled')
    .replace(/^publishAt:.*$/m, `publishAt: ${date}T${time}:00${TZ}`)
  writeFileSync(file, src)
  const res = collect()
  if (res.errors.length) {
    report(res)
    writeFileSync(file, readFileSync(file, 'utf8').replace(/^status:.*$/m, `status: ${a.status}`))
    console.error(`${slug}: not scheduled`)
    return 1
  }
  console.log(`${slug}: scheduled for ${date} ${time} IST. Commit and push to put it in the queue.`)
  return 0
}

async function fetchPulse() {
  const res = await fetch(`${SITE}/api/pulse`, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`${SITE}/api/pulse answered ${res.status}`)
  return res.json()
}

async function pulse() {
  const feed = await fetchPulse()
  if (!feed.items.length) {
    console.log('Industry Pulse has no stories right now.')
    return 0
  }
  feed.items.forEach((it, n) => console.log(`${String(n + 1).padStart(2)}. [${it.source}, ${it.published.slice(0, 10)}] ${it.title}\n    ${it.url}`))
  return 0
}

async function promote() {
  const n = Number(process.argv[3])
  const feed = await fetchPulse()
  const it = feed.items[n - 1]
  if (!it) {
    console.error('usage: npm run journal -- promote <n>   (n from `npm run journal -- pulse`)')
    return 1
  }
  const slug = slugify(it.title).slice(0, 70).replace(/-$/, '')
  const file = join(DIR, `${slug}.md`)
  if (existsSync(file)) {
    console.error(`content/journal/${slug}.md already exists`)
    return 1
  }
  const date = nextSlot(5, takenDays(collect().articles))
  const extra = `sources:
  - title: ${JSON.stringify(it.title)}
    url: ${it.url}
    publisher: ${it.source}
    date: ${it.published.slice(0, 10)}
`
  const body = `<!-- Promoted from Industry Pulse. Read the original first. Write the analysis in our own words: what happened, why it matters to people planning live events, and what to watch. Quote sparingly, credit the source, and confirm every fact with the manufacturer or the original report. -->

## What happened

## Why it matters

## What to watch
`
  writeFileSync(
    file,
    draftFile({ title: it.title, slug, category: 'Industry News', date, body, extra })
      .replace('  - Check every fact, figure and name in this article', `  - Read the original at ${it.url} and confirm every fact\n  - Rewrite the headline and the analysis in our own words`)
      .replace('  - production', '  - sound'),
  )
  console.log(`created content/journal/${slug}.md (draft, from ${it.source}). It needs writing, checking and verified: true before it can go out.`)
  return 0
}

const commands = { list, check, build, new: create, schedule, pulse, promote }

// run as a command (not when imported, e.g. by the tests)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cmd = process.argv[2] ?? 'list'
  if (!commands[cmd]) {
    console.error(`unknown command "${cmd}". Commands: ${Object.keys(commands).join(', ')}`)
    process.exit(1)
  }
  Promise.resolve(commands[cmd]())
    .then((code) => process.exit(code ?? 0))
    .catch((e) => {
      console.error(e.message)
      process.exit(1)
    })
}
