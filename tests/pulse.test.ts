// Industry Pulse: reading feeds, filtering and de-duplicating. Run with `npm test`.
// The feeds in tests/fixtures are invented test data, clearly marked, and never used by the site.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { canonicalUrl, categorise, decode, merge, parseFeed } from '../server/pulse.ts'

const now = Date.parse('2026-10-20T12:00:00Z')
const days = (n: number) => new Date(now - n * 86400e3)
const fixture = (name: string) =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
    .replace(/__RECENT_1__/g, days(1).toUTCString())
    .replace(/__RECENT_2__/g, days(3).toUTCString())
    .replace(/__RECENT_3__/g, days(5).toISOString())

const rssSource = { name: 'Example Trade Weekly', url: 'https://trade.example/feed', home: 'https://trade.example' }
const atomSource = { name: 'Example Lighting News', url: 'https://lighting.example/feed', home: 'https://lighting.example' }

test('reads RSS: headline, clean link, date, short credited summary', async () => {
  const items = await parseFeed(fixture('feed.rss.xml'), rssSource, now)
  const sub = items.find((i) => i.title.includes('cardioid'))!
  assert.ok(sub)
  assert.equal(sub.url, 'https://trade.example/news/cardioid-sub', 'tracking parameters are removed')
  assert.equal(sub.source, 'Example Trade Weekly')
  assert.equal(sub.published, days(1).toISOString().replace(/\.\d{3}Z$/, '.000Z'))
  assert.ok(!sub.summary.includes('appeared first on'), 'publisher boilerplate is removed')
  assert.ok(!/<|>/.test(sub.summary), 'no HTML in the summary')
  assert.ok(sub.summary.split(' ').length <= 31, 'the summary is a short excerpt, not the article')
  assert.equal(sub.category, 'Audio & Loudspeakers')
})

test('decodes entities and drops "read more" markers', async () => {
  const items = await parseFeed(fixture('feed.rss.xml'), rssSource, now)
  const consoleUpdate = items.find((i) => i.title.startsWith('Lighting console'))!
  assert.ok(consoleUpdate.summary.includes('& RDM'))
  assert.ok(!consoleUpdate.summary.includes('[…]'))
  assert.equal(consoleUpdate.category, 'Lighting & Control')
})

test('leaves out irrelevant, stale and undated stories', async () => {
  const titles = (await parseFeed(fixture('feed.rss.xml'), rssSource, now)).map((i) => i.title)
  assert.ok(!titles.some((t) => t.includes('lemon cake')), 'irrelevant')
  assert.ok(!titles.some((t) => t.includes('long ago')), 'stale')
  assert.ok(!titles.some((t) => t.includes('undated')), 'undated')
})

test('reads Atom feeds', async () => {
  const items = await parseFeed(fixture('feed.atom.xml'), atomSource, now)
  const stadium = items.find((i) => i.title.includes('stadium'))!
  assert.equal(stadium.url, 'https://lighting.example/stories/stadium')
  assert.equal(stadium.category, 'Lighting & Control')
})

test('merges feeds newest first and keeps each story once', async () => {
  const a = await parseFeed(fixture('feed.rss.xml'), rssSource, now)
  const b = await parseFeed(fixture('feed.atom.xml'), atomSource, now)
  const all = merge([a, b])
  assert.equal(all.filter((i) => /cardioid subwoofer/i.test(i.title)).length, 1, 'the same story from two feeds appears once')
  const dates = all.map((i) => i.published)
  assert.deepEqual(dates, [...dates].sort().reverse())
})

test('helpers', () => {
  assert.equal(decode('&amp;&#8217;&#x2014;'), '&’—')
  assert.equal(canonicalUrl('https://a.example/x?utm_source=y&id=2#top'), 'https://a.example/x?id=2')
  assert.equal(categorise('A new Dante-enabled stagebox for digital consoles'), 'Consoles & Networking')
  assert.equal(categorise('Quarterly results announced'), null)
})
