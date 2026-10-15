import { useEffect, useState } from 'react'

// A small client-side router with clean URLs: vitalacoustica.com/equipment/v10p.
// The host serves index.html for every path (see public/.htaccess, public/_redirects
// and vercel.json). Builds made with VITE_HASH_ROUTER=1 use "#/path" URLs instead,
// for previews that can only serve a single file.

const HASH = import.meta.env.VITE_HASH_ROUTER === '1'
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '') // '' when served from the domain root
const NAV_EVENT = 'va:navigate'

const clean = (p: string) => p.replace(/\/+$/, '') || '/'

export const href = (path: string) => {
  const p = path.startsWith('/') ? path : `/${path}`
  return HASH ? `#${p}` : `${BASE}${p}`
}

/** Current route path, without query string. */
export function currentPath() {
  if (HASH) {
    const h = window.location.hash.split('?')[0]
    return h.startsWith('#/') ? clean(h.slice(1)) : '/'
  }
  const p = window.location.pathname
  return clean(BASE && p.startsWith(BASE) ? p.slice(BASE.length) : p)
}

/** A query parameter of the current route, e.g. "/contact?item=b22" → item = "b22". */
export function queryParam(name: string) {
  const q = HASH ? window.location.hash.split('?')[1] : window.location.search.slice(1)
  return q ? new URLSearchParams(q).get(name) : null
}

export function navigate(path: string) {
  const target = href(path)
  const now = HASH ? window.location.hash : window.location.pathname + window.location.search
  if (now === target) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  if (HASH) {
    window.location.hash = path
    return
  }
  window.history.pushState(null, '', target)
  window.dispatchEvent(new Event(NAV_EVENT))
}

export function useRoute() {
  const [path, setPath] = useState(() => {
    // links shared before clean URLs ("/#/work") still land on the right page
    if (!HASH && window.location.hash.startsWith('#/')) window.history.replaceState(null, '', href(window.location.hash.slice(1)))
    return currentPath()
  })
  useEffect(() => {
    const onChange = () => setPath(currentPath())
    const events = HASH ? ['hashchange'] : ['popstate', NAV_EVENT]
    events.forEach((e) => window.addEventListener(e, onChange))
    return () => events.forEach((e) => window.removeEventListener(e, onChange))
  }, [])
  return path
}

/** Match a path against a pattern like "/work/:slug". */
export function match(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split('/').filter(Boolean)
  const b = path.split('/').filter(Boolean)
  if (a.length !== b.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i])
    else if (a[i] !== b[i]) return null
  }
  return params
}

/** Scroll smoothly to an element on the current page. */
export function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
