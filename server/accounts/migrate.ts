// The Worker sets up its own database: the first request after a deploy applies any migration it
// hasn't applied yet (server/accounts/schema.ts, made from migrations/ by scripts/schema.mjs). It
// also recognises migrations already applied with `wrangler d1 migrations apply`.

import type { D1Database } from './db.ts'
import { MIGRATIONS } from './schema.ts'

let ready: Promise<void> | null = null

export function ensureSchema(db: D1Database) {
  ready ??= apply(db).catch((e) => {
    ready = null // try again on the next request
    throw e
  })
  return ready
}

async function apply(db: D1Database) {
  await db.prepare('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)').run()
  const done = new Set((await db.prepare('SELECT name FROM schema_migrations').all<{ name: string }>()).results.map((r) => r.name))
  // migrations wrangler applied (its own table), if any
  const wrangler = await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'd1_migrations'").first()
  if (wrangler) for (const r of (await db.prepare('SELECT name FROM d1_migrations').all<{ name: string }>()).results) done.add(r.name)
  for (const m of MIGRATIONS) {
    if (done.has(m.name)) continue
    // one statement at a time: comments dropped, split on the semicolons that end statements
    const statements = m.sql
      .replace(/--[^\n]*/g, '')
      .split(/;\s*(?:\n|$)/)
      .map((s) => s.trim())
      .filter(Boolean)
    await db.batch([...statements.map((s) => db.prepare(s)), db.prepare('INSERT OR IGNORE INTO schema_migrations (name, applied_at) VALUES (?, ?)').bind(m.name, Math.floor(Date.now() / 1000))])
  }
}

/** For tests: forget that the schema was checked. */
export const resetSchemaCheck = () => {
  ready = null
}
