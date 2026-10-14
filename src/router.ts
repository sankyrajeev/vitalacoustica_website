import { useEffect, useState } from 'react'

// A small hash router: routes live after "#/", so the site works on any static host
// (Vercel, GitHub Pages, a plain folder) with no server rewrites.
// Moving to path-based URLs later only means changing `href()` and `currentPath()`.

export const href = (path: string) => `#${path.startsWith('/') ? path : `/${path}`}`

export function currentPath() {
  const h = window.location.hash
  return h.startsWith('#/') ? h.slice(1).replace(/\/+$/, '') || '/' : '/'
}

export function navigate(path: string) {
  if (currentPath() === path) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  window.location.hash = path
}

export function useRoute() {
  const [path, setPath] = useState(currentPath)
  useEffect(() => {
    const onChange = () => setPath(currentPath())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
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
