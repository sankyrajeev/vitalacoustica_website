// Runs once a day (the cron trigger in wrangler.jsonc). Leased licences (Pixel Forge) must check in
// with us every `leaseDays`; when a computer hasn't for a while, its owner gets an email 14 days
// before its output would pause, and a last one 3 days before. A check-in resets the reminders.

import { leaseReminder } from '../emails.ts'
import { now, siteUrl, type AccountsEnv, type D1Database } from './db.ts'
import { brand, sendMail } from './mail.ts'
import { PRODUCTS } from './products.ts'

const FIRST = 14 // days before the lease ends
const LAST = 3

export async function sendLeaseReminders(env: AccountsEnv, db: D1Database, at = now()) {
  let sent = 0
  for (const p of Object.values(PRODUCTS)) {
    if (!p.leaseDays) continue
    const lease = p.leaseDays * 86400
    const due = (
      await db
        .prepare(
          `SELECT a.key, a.machine, a.machine_name, a.activated_at, a.lease_notice, l.email FROM activations a
           JOIN licences l ON l.key = a.key
           WHERE l.product = ? AND l.revoked = 0 AND a.lease_notice < 2 AND a.activated_at <= ? AND a.activated_at > ?
           LIMIT 200`,
        )
        .bind(p.id, at - lease + FIRST * 86400, at - lease)
        .all<{ key: string; machine: string; machine_name: string | null; activated_at: number; lease_notice: number; email: string }>()
    ).results
    for (const a of due) {
      const ends = a.activated_at + lease
      const daysLeft = Math.max(1, Math.ceil((ends - at) / 86400))
      const stage = daysLeft <= LAST ? 2 : 1
      if (stage <= a.lease_notice) continue
      const site = siteUrl(env, new Request(env.SITE_URL || 'https://vitalacoustica.com'))
      try {
        await sendMail(
          env,
          a.email,
          leaseReminder(
            brand(site),
            {
              product: p.name,
              computer: a.machine_name || `the computer ${a.machine.slice(0, 9)}`,
              until: new Date(ends * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
              daysLeft,
            },
            `${site}/account`,
          ),
        )
        await db.prepare('UPDATE activations SET lease_notice = ? WHERE key = ? AND machine = ?').bind(stage, a.key, a.machine).run()
        sent++
      } catch (e) {
        console.error('lease reminder', a.key, e)
      }
    }
  }
  return sent
}
