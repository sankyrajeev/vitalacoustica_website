#!/usr/bin/env node
// Copies the database migrations (migrations/*.sql) into server/accounts/schema.ts, so the Worker can
// set up and upgrade its own database on first use: no command line needed. Run after adding a
// migration (npm test checks the two match):   node scripts/schema.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'

const files = readdirSync('migrations').filter((f) => f.endsWith('.sql')).sort()
const body = files.map((f) => `  { name: ${JSON.stringify(f)}, sql: ${JSON.stringify(readFileSync(`migrations/${f}`, 'utf8'))} },`).join('\n')
writeFileSync(
  'server/accounts/schema.ts',
  `// Generated from migrations/*.sql by scripts/schema.mjs. Don't edit by hand.\nexport const MIGRATIONS: { name: string; sql: string }[] = [\n${body}\n]\n`,
)
console.log(`${files.length} migrations → server/accounts/schema.ts`)
