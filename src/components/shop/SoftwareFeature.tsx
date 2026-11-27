import { priceNow, productPath, statusOf, type Software } from '../../content/shop'
import { useEffect, useRef, useState } from 'react'
import { mediaUrl } from '../../media'
import { Link } from '../Link'
import { Cta } from '../ui'
import { SoftwareCover } from './Art'

const STATUS = { available: 'Available', beta: 'Free beta', soon: 'Coming soon' } as const

/**
 * Software that's out, shown large: its logo, where it stands, what it is in a sentence and the
 * way in, beside its real interface. On the homepage and at the top of the shop's Software shelf.
 */
export function SoftwareFeature({ p }: { p: Software }) {
  const status = statusOf(p)
  const early = status === 'available' && !!p.earlyAccess
  const shot = p.screenshots?.[0]
  return (
    <article className="soft-feature">
      <div className="soft-feature__text">
        {p.logo && <img className="soft-feature__logo" src={`${import.meta.env.BASE_URL}${p.logo.src}`} alt="" />}
        <span className={`shop-status shop-status--${status}`}>{early ? 'Early access' : STATUS[status]}</span>
        <h3 className="soft-feature__name">{p.name}</h3>
        <p className="soft-feature__type">{p.type}</p>
        <p className="soft-feature__line">{p.description.split(/(?<=\.)\s/)[0]}</p>
        <div className="soft-feature__actions">
          {status === 'beta' ? <Cta to={`${productPath(p)}?beta=1`}>Join the free beta</Cta> : <Cta to={productPath(p)}>{early ? `Get early access · ${priceNow(p)}` : `Get ${p.name}`}</Cta>}
          <Cta to={productPath(p)} variant="quiet">
            More about {p.name}
          </Cta>
        </div>
      </div>
      <Link to={productPath(p)} className="soft-feature__shot" aria-hidden tabIndex={-1}>
        {p.loop ? <Loop src={p.loop.src} poster={p.loop.poster} /> : shot ? <img src={`${import.meta.env.BASE_URL}${shot.src}`} alt="" loading="lazy" /> : <SoftwareCover p={p} />}
      </Link>
    </article>
  )
}

/** The product's loop: loads and plays only while it's on screen; a still for reduced motion. */
function Loop({ src, poster }: { src: string; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [still] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const v = ref.current
    if (!v || still) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) void v.play().catch(() => {})
        else v.pause()
      },
      { threshold: 0.25 },
    )
    io.observe(v)
    return () => io.disconnect()
  }, [still])
  if (still) return <img src={mediaUrl(poster)} alt="" loading="lazy" />
  return <video ref={ref} src={mediaUrl(src)} poster={mediaUrl(poster)} muted loop playsInline preload="none" />
}
