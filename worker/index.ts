// The site's Worker on Cloudflare: it answers the forms and the Journal's data under /api/, serves
// the Journal's pages with their own metadata, writes the sitemap, and serves the built site
// (dist/) for everything else. Settings are in wrangler.jsonc.

import { handleEnquiry, type EnquiryEnv } from '../server/enquiry.ts'
import { handleJournalApi, journalPage, type JournalEnv } from '../server/journal.ts'
import { confirm, subscribe, unsubscribe, type NewsletterEnv } from '../server/newsletter.ts'
import { handlePulse, type PulseEnv } from '../server/pulse.ts'
import { sitemap } from '../server/sitemap.ts'

type Env = EnquiryEnv & JournalEnv & NewsletterEnv & PulseEnv & { ASSETS: { fetch: (request: Request) => Promise<Response> } }

const notAllowed = (allow: string) => new Response('Method not allowed', { status: 405, headers: { Allow: allow } })

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const { pathname } = url
    const method = request.method
    const read = method === 'GET' || method === 'HEAD'

    if (pathname === '/api/enquiry') return method === 'POST' ? handleEnquiry(request, env) : notAllowed('POST')
    if (pathname === '/api/journal' || pathname.startsWith('/api/journal/')) return read ? handleJournalApi(request, env) : notAllowed('GET')
    if (pathname === '/api/pulse') return read ? handlePulse(request, env, ctx) : notAllowed('GET')
    if (pathname === '/api/newsletter') return method === 'POST' ? subscribe(request, env, ctx) : notAllowed('POST')
    if (pathname === '/api/newsletter/confirm') return read ? confirm(request, env) : notAllowed('GET')
    if (pathname === '/api/newsletter/unsubscribe') return read || method === 'POST' ? unsubscribe(request, env) : notAllowed('GET, POST')
    if (pathname.startsWith('/api/')) return new Response('Not found', { status: 404 })

    if (pathname === '/sitemap.xml') return sitemap((env.SITE_URL || url.origin).replace(/\/$/, ''))
    if ((pathname === '/journal' || pathname.startsWith('/journal/')) && read) return journalPage(request, env, env.ASSETS)
    return env.ASSETS.fetch(request)
  },
}
