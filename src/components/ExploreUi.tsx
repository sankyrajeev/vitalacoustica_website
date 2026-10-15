import { useEffect, useMemo, useState } from 'react'
import { fullName, gearById, rigGear, type RigId } from '../content/gear'
import { navigate } from '../router'
import { gearImg } from './gearImg'
import { rigSpots } from '../three/hotspots'
import { registerMarker } from '../three/markers'
import { LOOK_NAMES, REFERENCE_BPM, resetShow, show, type ColourMode } from '../three/show'

const COLOURS: { id: ColourMode; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'red', label: 'Red' },
  { id: 'amber', label: 'Amber' },
  { id: 'split', label: 'Split' },
  { id: 'alternate', label: 'Alt' },
]

type Props = {
  focus: RigId | null
  onFocus: (id: RigId | null, at?: [number, number, number]) => void
  onExit: () => void
  haze: number
  onHaze: (v: number) => void
  small: boolean
}

/** Overlay for explore mode: gear list, spec card and a compact lighting desk. */
export function ExploreUi({ focus, onFocus, onExit, haze, onHaze, small }: Props) {
  // a marker on every fixture in the rig, not one per product
  const spots = useMemo(() => rigSpots(small), [small])
  const [look, setLook] = useState<number | null>(show.look)
  const [colour, setColour] = useState<ColourMode>(show.colour)
  const [bpm, setBpm] = useState(show.bpm)
  const [master, setMaster] = useState(show.master)
  // on phones the desk starts folded so the stage stays visible
  const [deskOpen, setDeskOpen] = useState(() => !window.matchMedia('(max-width: 760px)').matches)
  const item = focus ? gearById[focus] : null

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (focus ? onFocus(null) : onExit())
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focus, onFocus, onExit])

  const reset = () => {
    resetShow()
    setLook(null)
    setColour('auto')
    setBpm(REFERENCE_BPM)
    setMaster(1)
    onHaze(show.haze)
  }

  return (
    <div className={`explore ${deskOpen ? 'explore--desk' : ''}`} role="region" aria-label="Explore the rig">
      <div className="explore__top">
        <p className="explore__title">
          <span className="label">Stage model</span>
          <span className="explore__hint">Drag to orbit · scroll or pinch to zoom · tap a marker</span>
        </p>
        <button className="hud__exit" onClick={onExit}>
          Back to site <kbd>Esc</kbd>
        </button>
      </div>

      <div className="stage-markers">
        {spots.map((s) => {
          const g = gearById[s.id]
          return (
            <button
              key={s.key}
              ref={(el) => registerMarker(s.key, el)}
              className={`marker stage-marker ${focus === s.id ? 'is-active' : ''}`}
              onClick={() => onFocus(s.id, s.at)}
              aria-label={`${fullName(g)}: show details`}
              tabIndex={-1}
            >
              <span className="marker__dot" />
              <span className="marker__label">{g.name}</span>
            </button>
          )
        })}
      </div>

      <nav className="explore__list" aria-label="Gear">
        {rigGear.map((g) => (
          <button key={g.id} className={focus === g.id ? 'is-active' : ''} onClick={() => onFocus(focus === g.id ? null : g.id)}>
            {g.name}
          </button>
        ))}
      </nav>

      {item && (
        <article className="spec-card" aria-live="polite">
          <header>
            <span className="spec-card__group">{item.group}</span>
            <button className="spec-card__close" onClick={() => onFocus(null)} aria-label="Close details">
              ×
            </button>
          </header>
          {item.photo.source !== 'none' && (
            <div className={`spec-card__photo spec-card__photo--${item.photo.fit ?? item.photo.source}`}>
              <img src={gearImg(item.photo.file, 'sm')} alt={item.photo.alt} width={item.photo.width} height={item.photo.height} />
            </div>
          )}
          <h3>
            {item.maker && <span className="spec-card__maker">{item.maker}</span>}
            {item.name}
          </h3>
          {item.role && <p className="spec-card__role">{item.role}</p>}
          <p className="spec-card__spec">{item.spec}</p>
          <p className="spec-card__about">{item.about}</p>
          <button
            className="text-link"
            onClick={() => {
              onExit()
              navigate(`/equipment/${item.id}`)
            }}
          >
            Full details <span aria-hidden>→</span>
          </button>
        </article>
      )}

      <section className={`desk ${deskOpen ? '' : 'desk--closed'}`} aria-label="Lighting desk">
        <button className="desk__toggle" onClick={() => setDeskOpen((o) => !o)} aria-expanded={deskOpen}>
          Lighting desk <span aria-hidden>{deskOpen ? '▾' : '▴'}</span>
        </button>
        {deskOpen && (
          <div className="desk__body">
            <div className="desk__group">
              <span className="desk__label">Movement</span>
              <div className="desk__buttons">
                <button className={look === null ? 'is-on' : ''} onClick={() => ((show.look = null), setLook(null))}>
                  Auto
                </button>
                {LOOK_NAMES.map((name, i) => (
                  <button key={name} className={look === i ? 'is-on' : ''} onClick={() => ((show.look = i), setLook(i))}>
                    {name}
                  </button>
                ))}
              </div>
            </div>
            <div className="desk__group">
              <span className="desk__label">Sharpy colour</span>
              <div className="desk__buttons">
                {COLOURS.map((c) => (
                  <button
                    key={c.id}
                    className={`${colour === c.id ? 'is-on' : ''} swatch swatch--${c.id}`}
                    onClick={() => ((show.colour = c.id), setColour(c.id))}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="desk__faders">
              <label className="desk__fader">
                <span>BPM</span>
                <input
                  id="desk-bpm"
                  type="range"
                  min={90}
                  max={150}
                  value={bpm}
                  onChange={(e) => {
                    show.bpm = +e.target.value
                    setBpm(show.bpm)
                  }}
                />
                <output htmlFor="desk-bpm">{bpm}</output>
              </label>
              <label className="desk__fader">
                <span>Master</span>
                <input
                  id="desk-master"
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(master * 100)}
                  onChange={(e) => {
                    show.master = +e.target.value / 100
                    setMaster(show.master)
                  }}
                />
                <output htmlFor="desk-master">{Math.round(master * 100)}%</output>
              </label>
              <label className="desk__fader">
                <span>Haze</span>
                <input
                  id="desk-haze"
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(haze * 100)}
                  onChange={(e) => {
                    show.haze = +e.target.value / 100
                    onHaze(show.haze)
                  }}
                />
                <output htmlFor="desk-haze">{Math.round(haze * 100)}%</output>
              </label>
              <button className="desk__reset" onClick={reset}>
                Reset
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
