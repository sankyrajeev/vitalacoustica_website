import { useEffect, useState, type RefObject } from 'react'

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}

/** True while the element is at least partly on screen. */
export function useInView(ref: RefObject<Element | null>, rootMargin = '0px') {
  const [inView, setInView] = useState(true)
  useEffect(() => {
    if (!ref.current) return
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [ref, rootMargin])
  return inView
}

// Editorial blocks that ease in as they reach the viewport.
const REVEAL = [
  '[data-reveal]',
  '.section-head',
  '.project',
  '.cap__text',
  '.cap__aside',
  '.spec',
  '.tech-drawing',
  '.workflow li',
  '.process li',
  '.case__section',
  '.journal__entry',
  '.approach li',
  '.manifesto__body',
].join(',')

/** Adds `is-visible` to revealable blocks as they scroll into view. Re-runs when the page changes. */
export function useRevealOnScroll(key: string) {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(REVEAL)
    // anything already on screen stays visible; only content below the fold animates in
    els.forEach((el) => {
      el.classList.add('reveal')
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-visible')
    })
    document.documentElement.classList.add('reveal-ready')
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible')
            io.unobserve(e.target)
          }
        }),
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [key])
}
