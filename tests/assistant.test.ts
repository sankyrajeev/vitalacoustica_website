// The site assistant: what it knows (the site's content, the blog, what the team taught it), how it
// finds the right passages, and the /api/chat endpoint with a stand-in language model. The database
// is an in-memory SQLite standing in for D1, with the real migrations. Run with `npm test`.

import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { beforeEach, test } from 'node:test'
import type { D1Database, D1PreparedStatement } from '../server/accounts/db.ts'
import { ensureSchema, resetSchemaCheck } from '../server/accounts/migrate.ts'
import { chat, chatOverview, dismiss, forget, pruneChatLog, setChatPosts, teach, tidy, type WorkersAI } from '../server/assistant/chat.ts'
import { buildKnowledge, index, search, type PostInfo } from '../server/assistant/knowledge.ts'

function d1(): D1Database {
  const db = new DatabaseSync(':memory:')
  const statement = (sql: string, args: unknown[] = []): D1PreparedStatement => ({
    bind: (...values) => statement(sql, values),
    first: async <T,>() => ((r) => (r ? { ...r } : null))(db.prepare(sql).get(...(args as never[])) as object | undefined) as T | null,
    all: async <T,>() => ({ results: (db.prepare(sql).all(...(args as never[])) as object[]).map((r) => ({ ...r })) as T[] }),
    run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...(args as never[])).changes) } }),
  })
  return {
    prepare: (sql) => statement(sql),
    batch: async (statements) => {
      const out = []
      for (const s of statements) out.push(await s.run())
      return out
    },
  }
}

const POSTS: PostInfo[] = [
  {
    slug: 'roundup-2026-11-17',
    title: 'Today in sound, light and visuals: 17 November 2026',
    excerpt: 'Yamaha buys Disguise; a new outdoor fresnel from ETC.',
    category: 'Daily Roundup',
    publishAt: '2026-11-17T06:50:00+05:30',
    html: '<h2>Yamaha agrees to buy Disguise</h2><p>Yamaha will pay £215m for the media server maker Disguise.</p>',
  },
]

const SITE = 'https://vitalacoustica.com'
let calls: { model: string; messages: { role: string; content: string }[] }[] = []
let reply = 'VANTA is in a free beta: ask to join on [its page](/software/vanta).'
let failing = new Set<string>()
const ai: WorkersAI = {
  run: async (model, input) => {
    calls.push({ model, messages: input.messages as { role: string; content: string }[] })
    if (failing.has(model)) throw new Error('daily allowance used up')
    return { response: reply }
  },
}
let db: D1Database

beforeEach(async () => {
  resetSchemaCheck()
  db = d1()
  await ensureSchema(db)
  calls = []
  failing = new Set()
  reply = 'VANTA is in a free beta: ask to join on [its page](/software/vanta).'
  setChatPosts(() => POSTS)
})

const ask = (text: string, extra: Record<string, unknown> = {}) =>
  chat(new Request(`${SITE}/api/chat`, { method: 'POST', body: JSON.stringify({ messages: [{ role: 'user', text }], page: '/shop', ...extra }) }), { AI: ai, DB: db })

test('it knows the site: VANTA, equipment, services and the blog', () => {
  const ix = index(buildKnowledge(POSTS))
  assert.ok(search(ix, 'is vanta out yet? can I try the beta', 3).some((p) => p.id === 'product-vanta'))
  assert.equal(search(ix, 'what is the sample lab')[0].id, 'product-vanta')
  assert.ok(search(ix, 'do you rent subwoofers').some((p) => p.id.startsWith('gear-')))
  assert.ok(search(ix, 'what happened with Disguise and Yamaha').some((p) => p.id === 'post-roundup-2026-11-17'))
  assert.ok(search(ix, 'how much does it cost to hire a sound system').some((p) => p.id === 'prices'))
  assert.equal(search(ix, 'the and of').length, 0, 'nothing to search on')
})

test('the answer is written from the matching passages, and logged', async () => {
  const res = await ask('Is VANTA out yet?')
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { reply: 'VANTA is in a free beta: ask to join on [its page](/software/vanta).', unsure: false })
  const system = calls[0].messages[0].content
  assert.match(system, /Software: VANTA/)
  assert.match(system, /page: \/software\/vanta/)
  assert.match(system, /Bengaluru/, 'the basics are always there')
  assert.equal(calls[0].messages.at(-1)!.content, 'Is VANTA out yet?')
  const { recent } = await chatOverview(db)
  assert.equal(recent.length, 1)
})

test('when it doesn’t know, it says so, and the team sees the question and can teach it', async () => {
  reply = '[unsure] I’m not sure about parking at the venue; the team can tell you on WhatsApp.'
  const res = (await (await ask('Is there parking for the trucks?')).json()) as { reply: string; unsure: boolean }
  assert.equal(res.unsure, true)
  assert.ok(!res.reply.includes('[unsure]'))

  let o = await chatOverview(db)
  assert.equal(o.open.length, 1)
  assert.equal(o.week.unsure, 1)
  const logId = (o.open[0] as { id: number }).id

  await teach(db, { question: 'Do you need parking for your trucks?', answer: 'Yes: we need space for one tempo traveller near the loading door.', logId })
  o = await chatOverview(db)
  assert.equal(o.open.length, 0, 'taught questions leave the list')
  assert.equal(o.taught.length, 1)

  // from the next question on, the taught answer is what it reads first
  calls = []
  reply = 'Yes, we need space for one tempo traveller near the loading door.'
  await ask('what about parking for your trucks')
  assert.match(calls[0].messages[0].content, /The team’s answer to: Do you need parking/)

  // edit, then forget
  const id = (o.taught[0] as { id: number }).id
  await teach(db, { id, question: 'Parking for the trucks?', answer: 'Space for one tempo traveller.' })
  assert.equal(((await chatOverview(db)).taught[0] as { question: string }).question, 'Parking for the trucks?')
  await forget(db, { id })
  assert.equal((await chatOverview(db)).taught.length, 0)
})

test('a question can be dismissed without teaching', async () => {
  reply = '[unsure] No idea.'
  await ask('what is the meaning of life')
  const { open } = await chatOverview(db)
  await dismiss(db, { id: (open[0] as { id: number }).id })
  assert.equal((await chatOverview(db)).open.length, 0)
})

test('follow-ups keep their subject, and the conversation goes along', async () => {
  const res = await chat(
    new Request(`${SITE}/api/chat`, {
      method: 'POST',
      body: JSON.stringify({
        messages: [
          { role: 'assistant', text: 'Hi! I’m the Vital Acoustica assistant.' },
          { role: 'user', text: 'tell me about vanta' },
          { role: 'assistant', text: 'VANTA is a synthesizer.' },
          { role: 'user', text: 'when can I get it?' },
        ],
      }),
    }),
    { AI: ai, DB: db },
  )
  assert.equal(res.status, 200)
  assert.match(calls[0].messages[0].content, /Software: VANTA/)
  assert.deepEqual(
    calls[0].messages.slice(1).map((m) => m.role),
    ['user', 'assistant', 'user'],
  )
})

test('another model takes over if the first fails; with neither, the page’s own bot answers', async () => {
  failing.add('@cf/meta/llama-3.1-8b-instruct-fast')
  assert.equal((await ask('hello')).status, 200)
  assert.deepEqual(
    calls.map((c) => c.model),
    ['@cf/meta/llama-3.1-8b-instruct-fast', '@cf/meta/llama-3.1-8b-instruct'],
  )
  failing.add('@cf/meta/llama-3.1-8b-instruct')
  assert.equal((await ask('hello')).status, 503)
  assert.equal((await chat(new Request(`${SITE}/api/chat`, { method: 'POST', body: '{"messages":[{"role":"user","text":"hi"}]}' }), {})).status, 503)
})

test('bad requests and the hourly limit', async () => {
  const post = (body: unknown) => chat(new Request(`${SITE}/api/chat`, { method: 'POST', body: JSON.stringify(body) }), { AI: ai, DB: db })
  assert.equal((await post({})).status, 400)
  assert.equal((await post({ messages: [{ role: 'assistant', text: 'hi' }] })).status, 400)
  assert.equal((await post({ messages: [{ role: 'user', text: 'x'.repeat(501) }] })).status, 400)
  const res = await chat(new Request(`${SITE}/api/chat`, { method: 'POST', body: JSON.stringify({ messages: [{ role: 'user', text: 'hi' }] }) }), { AI: ai, DB: db }, async () => true)
  assert.equal(res.status, 429)
})

test('replies never carry a phone number or an outside email address', () => {
  const { text } = tidy('Call +91 89048 58422 or mail someone@gmail.com, or support@vitalacoustica.com. Founded 2026-11-15, GSTIN 29ABCFV2853P1ZF.')
  assert.ok(!text.includes('89048') && !text.includes('gmail'))
  assert.ok(text.includes('support@vitalacoustica.com') && text.includes('2026-11-15') && text.includes('29ABCFV2853P1ZF'))
})

test('chats older than 90 days are deleted', async () => {
  await ask('hello')
  await db.prepare('UPDATE chat_log SET asked_at = asked_at - 91 * 86400').run()
  await ask('hello again')
  assert.equal(await pruneChatLog(db), 1)
  assert.equal((await chatOverview(db)).recent.length, 1)
})
