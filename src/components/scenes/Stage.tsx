import { useEffect, useRef, type ReactNode } from 'react'
import { useMediaQuery } from '../../hooks/useMedia'
import { syncPalette, type Draw } from './draw'

// The engine behind the site's small interactive scenes (Our Story, the service pages):
// a canvas that draws a scene while it's on screen, with the pointer, time and scroll progress
// handed to it every frame. Colours follow the light and dark editions; reduced motion holds a still frame.

/** A canvas that runs a scene while it's on screen. `make` is called once and returns the per-frame drawing. */
export function Stage({ make, className = '', hint }: { make: () => Draw; className?: string; hint?: ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const still = useMediaQuery('(prefers-reduced-motion: reduce)')

  useEffect(() => {
    const el = canvas.current
    const wrap = box.current
    const c = el?.getContext('2d')
    if (!el || !wrap || !c) return
    const draw = make()
    const pointer = { x: 0.5, y: 0.5, active: false, down: false, dx: 0 }
    let visible = false
    let raf = 0
    let last = 0
    const start = performance.now()
    const section = wrap.closest('section') ?? wrap

    const frame = (now: number) => {
      raf = visible && !still ? requestAnimationFrame(frame) : 0
      const dpr = Math.min(window.devicePixelRatio, 1.75)
      const w = Math.round(el.clientWidth * dpr)
      const h = Math.round(el.clientHeight * dpr)
      if (!w || !h) return
      if (el.width !== w || el.height !== h) Object.assign(el, { width: w, height: h })
      const r = section.getBoundingClientRect()
      const vh = window.innerHeight
      const progress = Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height)))
      c.clearRect(0, 0, w, h)
      syncPalette()
      draw({ c, w, h, dpr, t: still ? 2.5 : (now - start) / 1000, dt: Math.min(0.05, (now - last) / 1000), pointer, progress })
      pointer.dx = 0
      last = now
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && !raf) raf = requestAnimationFrame(frame)
    })
    io.observe(wrap)

    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width
      if (pointer.down) pointer.dx += x - pointer.x
      pointer.x = x
      pointer.y = (e.clientY - r.top) / r.height
      pointer.active = true
      if (still && !raf) raf = requestAnimationFrame(frame)
    }
    const down = (e: PointerEvent) => {
      pointer.down = true
      move(e)
    }
    const up = () => (pointer.down = false)
    const leave = () => {
      pointer.active = false
      pointer.down = false
    }
    wrap.addEventListener('pointermove', move)
    wrap.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    wrap.addEventListener('pointerleave', leave)
    // the scroll position drives some scenes, so redraw on scroll for still mode
    const onScroll = () => still && !raf && (raf = requestAnimationFrame(frame))
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
      wrap.removeEventListener('pointermove', move)
      wrap.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      wrap.removeEventListener('pointerleave', leave)
      window.removeEventListener('scroll', onScroll)
    }
  }, [make, still])

  return (
    <div ref={box} className={`story-scene ${className}`}>
      <canvas ref={canvas} aria-hidden />
      {hint && <p className="story-scene__hint">{hint}</p>}
    </div>
  )
}
