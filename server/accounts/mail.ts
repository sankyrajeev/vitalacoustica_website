import type { Mail } from '../emails.ts'
import { BRAND } from '../enquiry.ts'
import type { AccountsEnv } from './db.ts'

export const brand = (site: string) => ({ ...BRAND, site })

/**
 * Sends an account email through Resend (the same account as the enquiry emails). In local
 * development with DEV_EMAIL_LOG=1 it prints the email's text, links included, instead.
 */
export async function sendMail(env: AccountsEnv, to: string, mail: Mail) {
  if (env.DEV_EMAIL_LOG === '1') {
    console.log(`[email to ${to}] ${mail.subject}\n${mail.text}`)
    return
  }
  const from = env.ACCOUNT_FROM || env.ENQUIRY_FROM
  if (!env.RESEND_API_KEY || !from) throw new Error('email is not configured (RESEND_API_KEY, ENQUIRY_FROM)')
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject: mail.subject, html: mail.html, text: mail.text }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
}
