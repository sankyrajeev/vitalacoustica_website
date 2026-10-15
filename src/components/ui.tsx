import { useState, type CSSProperties, type ReactNode } from 'react'
import { fullName, gearById, type RigId } from '../content/gear'
import type { Hotspot, Media } from '../content/projects'
import { openExplore } from '../events'
import { img } from '../media'
import { Link } from './Link'

/**
 * The Vital Acoustica logo (VA mark + VITAL ACOUSTICA), drawn in the current text colour so it
 * follows the light and dark editions. `tagline` adds "PRO AUDIO • LIGHTING • RENTALS".
 */
export function Logo({ tagline, className = '' }: { tagline?: boolean; className?: string }) {
  return (
    <span
      className={`logo ${tagline ? 'logo--full' : ''} ${className}`}
      role="img"
      aria-label={tagline ? 'Vital Acoustica: pro audio, lighting, rentals' : 'Vital Acoustica'}
    />
  )
}

/** Small uppercase section label, optionally numbered. */
export function Label({ index, children }: { index?: string; children: ReactNode }) {
  return (
    <p className="label">
      {index && <span className="label__index">{index}</span>}
      {children}
    </p>
  )
}

type CtaProps = { to: string; children: ReactNode; variant?: 'primary' | 'quiet'; onClick?: () => void }

/** Primary / quiet call to action, as an internal link. */
export function Cta({ to, children, variant = 'primary', onClick }: CtaProps) {
  return (
    <Link to={to} className={`cta cta--${variant}`} onClick={onClick}>
      <span>{children}</span>
      <Arrow />
    </Link>
  )
}

export function Arrow() {
  return (
    <svg className="arrow" width="16" height="10" viewBox="0 0 16 10" fill="none" aria-hidden>
      <path d="M0 5h14.5M10.5 1l4 4-4 4" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  )
}

/** Text link with a fine underline and arrow. */
export function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="text-link">
      {children} <Arrow />
    </Link>
  )
}

// DUMMY: until the photo shoot, empty photo slots show one of the show photos, tagged as a sample.
const SAMPLES = ['club-down', 'park-blue', 'club-neon', 'park-dusk', 'club-full']

/** A photo slot still to be shot: shows a sample photograph, tagged as such. `children` says what belongs here. */
export function Placeholder({ children, ratio = '16 / 10', sample }: { children: ReactNode; ratio?: string; sample?: string }) {
  const note = typeof children === 'string' ? children : ''
  const src = sample ?? SAMPLES[[...note].reduce((n, c) => n + c.charCodeAt(0), 0) % SAMPLES.length]
  return (
    <div className="placeholder" style={{ aspectRatio: ratio }} title={note || undefined}>
      <img src={img(src, 800)} alt="" loading="lazy" decoding="async" />
      <span className="placeholder__tag">Sample photo</span>
    </div>
  )
}

type FrameProps = {
  media: Media
  sizes?: string
  priority?: boolean
  showGear?: boolean
  caption?: ReactNode
  className?: string
  style?: CSSProperties
}

/** Photograph with fixed aspect ratio (no layout shift), responsive sources and optional gear markers. */
export function MediaFrame({ media, sizes = '100vw', priority, showGear, caption, className = '', style }: FrameProps) {
  const [gearOn, setGearOn] = useState(false)
  if (!media.src) return <Placeholder>Project photography or film</Placeholder>
  const markers = showGear && media.hotspots?.length
  return (
    <figure className={`frame ${className}`} style={style}>
      <div className="frame__media" style={{ aspectRatio: `${media.width} / ${media.height}` }}>
        <img
          src={img(media.src, 1600)}
          srcSet={`${img(media.src, 800)} 800w, ${img(media.src, 1600)} 1600w`}
          sizes={sizes}
          alt={media.alt}
          width={media.width}
          height={media.height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
        {markers && <PhotoHotspots hotspots={media.hotspots!} visible={gearOn} />}
      </div>
      {(caption || markers) && (
        <figcaption className="frame__caption">
          <span>{caption}</span>
          {markers && (
            <button className="toggle" aria-pressed={gearOn} onClick={() => setGearOn((v) => !v)}>
              {gearOn ? 'Hide equipment' : 'Show equipment'}
            </button>
          )}
        </figcaption>
      )}
    </figure>
  )
}

/** Markers on a photograph pointing at each piece of equipment, with a short note. */
export function PhotoHotspots({ hotspots, visible }: { hotspots: Hotspot[]; visible: boolean }) {
  const [picked, setPicked] = useState<RigId | null>(null)
  const open = visible ? picked : null
  const spot = hotspots.find((h) => h.gear === open)
  const g = spot ? gearById[spot.gear] : null
  return (
    <div className={`spots ${visible ? 'is-visible' : ''}`}>
      {hotspots.map((h) => {
        const isOpen = open === h.gear
        return (
          <button
            key={h.gear}
            className={`marker spot ${isOpen ? 'is-active' : ''}`}
            style={{ left: `${h.x}%`, top: `${h.y}%` }}
            aria-expanded={isOpen}
            aria-label={fullName(gearById[h.gear])}
            tabIndex={visible ? 0 : -1}
            onClick={() => setPicked(isOpen ? null : h.gear)}
          >
            <span className="marker__dot" />
            <span className="marker__label">{gearById[h.gear].name}</span>
          </button>
        )
      })}
      {spot && g && (
        // beside the marker on wide screens; docked to the bottom of the photo on phones
        <div
          className={`spot-note ${spot.x > 50 ? 'spot-note--left' : ''} ${spot.y > 62 ? 'spot-note--up' : ''}`}
          style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
        >
          <span className="spot-note__role">{g.role || g.group}</span>
          <strong>{fullName(g)}</strong>
          <p>{g.about}</p>
          <span className="spot-note__links">
            <Link to={`/equipment/${g.id}`} className="text-link">
              Details <Arrow />
            </Link>
            <button className="text-link" onClick={() => openExplore(spot.gear)}>
              3D rig <Arrow />
            </button>
          </span>
        </div>
      )}
    </div>
  )
}
