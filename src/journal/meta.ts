import { useEffect } from 'react'

// Keeps the page's title, description, canonical link and sharing tags in step when moving between
// Journal pages inside the app. The Worker writes the same tags into the HTML of each /journal
// page for search engines and link previews (server/journal.ts); this covers in-app navigation,
// and puts everything back on the way out.

type Meta = { title: string; description: string; path: string; image?: string; type?: 'website' | 'article' }

function og(property: string) {
  const m = document.createElement('meta')
  m.setAttribute('property', property)
  return m
}

function tag(selector: string, create: () => HTMLElement) {
  return (document.head.querySelector(selector) as HTMLElement | null) ?? document.head.appendChild(create())
}

export function usePageMeta(meta: Meta | null) {
  const key = meta ? JSON.stringify(meta) : ''
  useEffect(() => {
    if (!meta) return
    const origin = window.location.origin
    const url = `${origin}${meta.path}`
    const set: [HTMLElement, string, string][] = [
      [tag('meta[name="description"]', () => Object.assign(document.createElement('meta'), { name: 'description' })), 'content', meta.description],
      [tag('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' })), 'href', url],
      [tag('meta[property="og:title"]', () => og('og:title')), 'content', meta.title],
      [tag('meta[property="og:description"]', () => og('og:description')), 'content', meta.description],
      [tag('meta[property="og:url"]', () => og('og:url')), 'content', url],
      [tag('meta[property="og:type"]', () => og('og:type')), 'content', meta.type ?? 'website'],
      ...(meta.image ? [[tag('meta[property="og:image"]', () => og('og:image')), 'content', `${origin}${meta.image}`] as [HTMLElement, string, string]] : []),
    ]
    const before = set.map(([el, attr]) => el.getAttribute(attr))
    const title = document.title
    set.forEach(([el, attr, value]) => el.setAttribute(attr, value))
    document.title = meta.title
    return () => {
      set.forEach(([el, attr], i) => (before[i] === null ? el.removeAttribute(attr) : el.setAttribute(attr, before[i]!)))
      document.title = title
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}
