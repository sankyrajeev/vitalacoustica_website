// The site's Worker on Cloudflare: it answers the enquiry form at /api/enquiry and serves the
// built site (dist/) for everything else. Settings are in wrangler.jsonc.

import { handleEnquiry, type EnquiryEnv } from '../server/enquiry.ts'

type Env = EnquiryEnv & { ASSETS: { fetch: (request: Request) => Promise<Response> } }

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)
    if (pathname === '/api/enquiry') {
      if (request.method === 'POST') return handleEnquiry(request, env)
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } })
    }
    if (pathname.startsWith('/api/')) return new Response('Not found', { status: 404 })
    return env.ASSETS.fetch(request)
  },
}
