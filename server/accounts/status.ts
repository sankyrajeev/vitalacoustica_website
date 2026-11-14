// The admin page's setup checklist: which parts are switched on (never the values themselves).
import type { AccountsEnv } from './db.ts'
import { hasReleasesToken } from './downloads.ts'

export const setupStatus = (env: AccountsEnv) => ({
  database: !!env.DB,
  email: !!env.RESEND_API_KEY && !!(env.ACCOUNT_FROM || env.ENQUIRY_FROM),
  admins: !!env.ADMIN_EMAILS,
  vantaKey: !!env.LICENCE_KEY_VANTA,
  pixelForgeKey: !!(env as Record<string, string | undefined>).LICENCE_KEY_PIXELFORGE,
  downloads: hasReleasesToken(env),
  paddle: !!env.PADDLE_WEBHOOK_SECRET && !!env.PADDLE_API_KEY,
  google: !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET,
})
