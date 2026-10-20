// The Acoustica Journal: the publishing rules and the article format. Run with `npm test`.

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, cpSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { isLive } from '../src/journal/types.ts'
// @ts-expect-error: a plain JavaScript module without type declarations
import { markdown, parseHeader } from '../scripts/journal.mjs'

const ROOT = new URL('..', import.meta.url).pathname

test('only scheduled or published articles go live, and only from their time', () => {
  const now = Date.parse('2026-11-03T04:00:00Z')
  assert.equal(isLive({ status: 'published', publishAt: '2026-11-03T09:00:00+05:30' }, now), true)
  assert.equal(isLive({ status: 'scheduled', publishAt: '2026-11-03T09:00:00+05:30' }, now), true)
  assert.equal(isLive({ status: 'scheduled', publishAt: '2026-11-03T10:00:00+05:30' }, now), false, 'not before its time')
  assert.equal(isLive({ status: 'published', publishAt: '2026-12-01T09:00:00+05:30' }, now), false, 'published with a future date waits')
  assert.equal(isLive({ status: 'review', publishAt: '2026-01-01T09:00:00+05:30' }, now), false)
  assert.equal(isLive({ status: 'draft', publishAt: '2026-01-01T09:00:00+05:30' }, now), false)
})

test('reads the article header', () => {
  const h = parseHeader(`title: "A: B"
status: review # a comment
featured: true
services:
  - sound
  - light
sources:
  - title: A story
    url: https://example.com/a
    publisher: Example
related: []`)
  assert.equal(h.title, 'A: B')
  assert.equal(h.status, 'review')
  assert.equal(h.featured, true)
  assert.deepEqual(h.services, ['sound', 'light'])
  assert.deepEqual(h.sources, [{ title: 'A story', url: 'https://example.com/a', publisher: 'Example' }])
  assert.deepEqual(h.related, [])
})

test('turns Markdown into safe HTML', () => {
  const html = markdown(`## A heading

Text with **bold**, *italic*, \`code\`, an [internal link](/contact) and an [external one](https://example.com).

- one
- two

| A | B |
|---|---|
| 1 | 2 |

<!-- a note for the reviewer -->
<script>alert(1)</script>`)
  assert.ok(html.includes('<h2 id="a-heading">A heading</h2>'))
  assert.ok(html.includes('<strong>bold</strong>') && html.includes('<em>italic</em>') && html.includes('<code>code</code>'))
  assert.ok(html.includes('<a href="/contact" data-internal>internal link</a>'))
  assert.ok(html.includes('target="_blank" rel="noopener noreferrer"'))
  assert.ok(html.includes('<ul><li>one</li><li>two</li></ul>'))
  assert.ok(html.includes('<table>'))
  assert.ok(!html.includes('note for the reviewer'), 'reviewer notes are never published')
  assert.ok(!html.includes('<script>'), 'raw HTML is escaped')
})

/** Runs the publishing script on a copy of the project with one extra article. */
function check(article: string, cover = false) {
  const dir = mkdtempSync(join(tmpdir(), 'journal-'))
  cpSync(join(ROOT, 'scripts'), join(dir, 'scripts'), { recursive: true })
  mkdirSync(join(dir, 'content/journal'), { recursive: true })
  mkdirSync(join(dir, 'public/media/journal'), { recursive: true })
  writeFileSync(join(dir, 'content/journal/test.md'), article)
  if (cover) for (const w of [480, 800, 1600]) writeFileSync(join(dir, `public/media/journal/test-cover-${w}.webp`), '')
  try {
    execFileSync('node', [join(dir, 'scripts/journal.mjs'), 'check'], { stdio: 'pipe' })
    return { ok: true, out: '' }
  } catch (e) {
    return { ok: false, out: String((e as { stderr: Buffer }).stderr) }
  }
}

const article = (extra: string) => `---
title: Test
slug: test
excerpt: A test.
category: Guides & Insights
publishAt: 2026-11-03T09:00:00+05:30
cover: test-cover
coverAlt: A test photo
${extra}
---

Body.
`

test('an article in review with open checks is fine', () => {
  assert.equal(check(article('status: review\nverify:\n  - Check the facts\nverified: false')).ok, true)
})

test('an article with open checks cannot be scheduled or published', () => {
  for (const status of ['scheduled', 'published']) {
    const r = check(article(`status: ${status}\nverify:\n  - Check the facts\nverified: false`), true)
    assert.equal(r.ok, false)
    assert.match(r.out, /verify list hasn't been signed off/)
  }
})

test('a signed-off article with its cover can be scheduled', () => {
  assert.equal(check(article('status: scheduled\nverify:\n  - Check the facts\nverified: true'), true).ok, true)
})

test('a live article needs its cover photo', () => {
  const r = check(article('status: published'))
  assert.equal(r.ok, false)
  assert.match(r.out, /cover photo is missing/)
})

test('industry news needs sources and sign-off', () => {
  const news = (extra: string) => article(`status: scheduled\n${extra}`).replace('Guides & Insights', 'Industry News')
  assert.equal(check(news('verified: true'), true).ok, false, 'no sources')
  assert.equal(check(news('sources:\n  - title: A\n    url: https://example.com\n    publisher: Ex\nverified: false'), true).ok, false, 'not verified')
  assert.equal(check(news('sources:\n  - title: A\n    url: https://example.com\n    publisher: Ex\nverified: true'), true).ok, true)
})

test('the real articles all pass', () => {
  execFileSync('node', [join(ROOT, 'scripts/journal.mjs'), 'check'], { stdio: 'pipe' })
})
