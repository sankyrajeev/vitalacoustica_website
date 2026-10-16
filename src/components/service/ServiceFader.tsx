import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useMediaQuery } from '../../hooks/useMedia'
import { capabilities } from '../../content/capabilities'
import { navigate } from '../../router'

// A mixing-desk channel fader for moving between the services. Drag the cap and let go on a
// service, or click a name. Arrow keys move one service at a time.

const INSET = 14 // px kept clear at each end of the track

export function ServiceFader({ current }: { current: string }) {
  const items = capabilities
  const n = items.length
  const at = Math.max(
    0,
    items.findIndex((c) => c.id === current),
  )
  const [pos, setPos] = useState(at)
  const [drag, setDrag] = useState(false)
  // on phones it rests tucked into the edge, and slides out when tapped
  const small = useMediaQuery('(max-width: 760px)')
  const [open, setOpen] = useState(false)
  const track = useRef<HTMLDivElement>(null)
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open || drag) return
    const timer = window.setTimeout(() => setOpen(false), 4000)
    const away = (e: Event) => !root.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('pointerdown', away)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('pointerdown', away)
    }
  }, [open, drag])

  const go = (i: number) => {
    const k = Math.max(0, Math.min(n - 1, i))
    setPos(k)
    if (k !== at) navigate(`/capabilities/${items[k].id}`)
  }
  const fromY = (y: number) => {
    const r = track.current!.getBoundingClientRect()
    return Math.max(0, Math.min(n - 1, ((y - r.top - INSET) / (r.height - 2 * INSET)) * (n - 1)))
  }
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (small && !open) {
      setOpen(true)
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag(true)
    setPos(fromY(e.clientY))
  }
  const move = (e: PointerEvent<HTMLDivElement>) => drag && setPos(fromY(e.clientY))
  const up = () => {
    if (!drag) return
    setDrag(false)
    go(Math.round(pos))
  }
  const key = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') go(at + 1)
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') go(at - 1)
    else return
    e.preventDefault()
  }
  const near = Math.round(pos)
  const pct = (i: number) => `calc(${INSET}px + (100% - ${2 * INSET}px) * ${i / (n - 1)})`

  return (
    <nav ref={root} className={`svc-fader ${drag ? 'is-drag' : ''} ${open || !small ? 'is-open' : ''}`} aria-label="Services">
      <p className="svc-fader__title" aria-hidden>
        Services
      </p>
      <div className="svc-fader__body">
        <ol className="svc-fader__stops">
          {items.map((c, i) => (
            <li key={c.id} style={{ top: pct(i) }}>
              <button className={`${i === near ? 'is-near' : ''} ${i === at ? 'is-on' : ''}`} onClick={() => go(i)} tabIndex={-1}>
                <span className="svc-fader__name">{c.name}</span>
                <span className="svc-fader__n">{c.index}</span>
              </button>
            </li>
          ))}
        </ol>
        <div
          ref={track}
          className="svc-fader__track"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        >
          <span className="svc-fader__slot" aria-hidden />
          <span className="svc-fader__fill" style={{ top: pct(pos) }} aria-hidden />
          <span
            className="svc-fader__cap"
            style={{ top: pct(pos) }}
            role="slider"
            tabIndex={0}
            aria-label="Service"
            aria-valuemin={1}
            aria-valuemax={n}
            aria-valuenow={at + 1}
            aria-valuetext={items[at].name}
            onKeyDown={key}
          >
            <i />
            <i />
            <i />
          </span>
        </div>
      </div>
      <p className="svc-fader__lcd" aria-hidden>
        <span>{items[near].index}</span>
        {items[near].name}
      </p>
    </nav>
  )
}
