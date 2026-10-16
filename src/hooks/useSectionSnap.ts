import { useEffect } from 'react'

// Settles the page on a section after the visitor stops scrolling.
// Sections that fit on screen come to rest centred; sections taller than the screen
// scroll freely between their top and bottom edges. The next section is chosen in the
// direction of travel, so even a small scroll moves on rather than springing back.

const SETTLE_MS = 140 // quiet time that counts as "stopped scrolling"
const NUDGE = 24 // px of movement that counts as an intent to move on
const MIN_HEIGHT = 240 // smaller blocks (breadcrumbs, notes) aren't worth stopping on

/** The blocks to settle on for inner pages: top-level sections, and the parts of an article or story. */
export const PAGE_SECTIONS = 'main > header, main > section, main > article > :is(header, section, div, nav), .story > section'

type Stop = { y: number } | { from: number; to: number }

function stops(selectors: string): Stop[] {
  const vh = window.innerHeight
  const max = document.documentElement.scrollHeight - vh
  const list: Stop[] = [{ y: 0 }, { y: max }]
  document.querySelectorAll<HTMLElement>(selectors).forEach((el) => {
    const r = el.getBoundingClientRect()
    if (r.height < MIN_HEIGHT) return
    const top = r.top + window.scrollY
    if (r.height <= vh + 1) list.push({ y: Math.min(max, Math.max(0, top - (vh - r.height) / 2)) })
    else list.push({ from: top, to: Math.min(max, top + r.height - vh) })
  })
  return list
}

/** Pass an empty string to switch it off. */
export function useSectionSnap(selectors: string) {
  useEffect(() => {
    if (!selectors) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let timer = 0
    let settled = window.scrollY
    let target: number | null = null
    let releaseAt = 0

    const settle = () => {
      const html = document.documentElement
      // leave the page alone under overlays, the open menu, or while typing in the form
      if (html.classList.contains('is-locked') || html.classList.contains('menu-open')) return
      if (document.activeElement?.closest('input, textarea, select')) return
      const y = window.scrollY
      const all = stops(selectors)
      // inside a tall section: free scrolling
      if (all.some((s) => 'from' in s && y > s.from + 1 && y < s.to - 1)) {
        settled = y
        return
      }
      const points = all.flatMap((s) => ('y' in s ? [s.y] : [s.from, s.to]))
      const moved = y - settled
      const ahead = Math.abs(moved) < NUDGE ? points : points.filter((p) => (moved > 0 ? p > settled + 1 : p < settled - 1))
      const pool = ahead.length ? ahead : points
      // in the direction of travel, the stop nearest to where the scroll ended
      const next = pool.reduce((best, p) => (Math.abs(p - y) < Math.abs(best - y) ? p : best), pool[0])
      settled = next
      if (Math.abs(next - y) < 2) return
      target = next
      releaseAt = performance.now() + 1400
      window.scrollTo({ top: next, behavior: reduced ? 'auto' : 'smooth' })
    }

    const onScroll = () => {
      // ignore the scroll events of our own glide until it arrives (or stalls)
      if (target !== null) {
        if (Math.abs(window.scrollY - target) < 2) {
          target = null
          return
        }
        if (performance.now() < releaseAt) return
        target = null
      }
      window.clearTimeout(timer)
      timer = window.setTimeout(settle, SETTLE_MS)
    }
    // a new wheel, touch or key press during a glide hands control straight back
    const onInput = () => {
      target = null
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    const inputs = ['wheel', 'touchstart', 'keydown'] as const
    inputs.forEach((e) => window.addEventListener(e, onInput, { passive: true }))
    return () => {
      window.removeEventListener('scroll', onScroll)
      inputs.forEach((e) => window.removeEventListener(e, onInput))
      window.clearTimeout(timer)
    }
  }, [selectors])
}
