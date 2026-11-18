import { useEffect, useRef, useState } from 'react'
import { api, type Me } from '../../account/api'
import { mediaUrl } from '../../media'
import { navigate, scrollToId } from '../../router'
import { Link } from '../Link'
import { Arrow } from '../ui'

// VANTA's video hero: a silent 10-second loop of the real editor playing, over a gold wavetable
// landscape (from the VANTA repository's marketing/banner/, the "clean" cut with room on the left
// for real text). At the top of /shop/vanta, and as a band on the homepage.
//
// The call to action follows the visitor: a signed-in tester with a working key is sent to their
// downloads; everyone else is offered beta access. With reduced motion, the still frame is shown.

const today = () => new Date().toISOString().slice(0, 10)
const isTester = (me: Me | null) => !!me?.licences.some((l) => l.product === 'vanta' && !l.revoked && (!l.expires || l.expires >= today()))

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function VantaHero({ variant }: { variant: 'page' | 'band' }) {
  const video = useRef<HTMLVideoElement>(null)
  const [me, setMe] = useState<Me | null>(null)
  const [still] = useState(reducedMotion)

  useEffect(() => {
    void api.me().then((r) => r.ok && setMe(r.data))
  }, [])

  // on the homepage the loop loads and plays only while it's on screen
  useEffect(() => {
    const v = video.current
    if (!v || variant !== 'band') return
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? void v.play().catch(() => {}) : v.pause()), { threshold: 0.2 })
    io.observe(v)
    return () => io.disconnect()
  }, [variant])

  const tester = isTester(me)
  const Title = variant === 'band' ? 'h2' : 'p' // the product page has its own h1 below

  // the request form is on the product page (?beta=1 opens it there)
  const requestBeta = () => {
    if (variant === 'band') return navigate('/shop/vanta?beta=1')
    window.dispatchEvent(new Event('vanta:request-beta'))
    scrollToId('beta-access')
  }

  return (
    <section className={`vanta-hero vanta-hero--${variant}`} aria-labelledby={`vanta-hero-${variant}`}>
      <div className="vanta-hero__media" aria-hidden>
        {still ? (
          <img src={mediaUrl('vanta/vanta-banner-clean-poster-1920.webp')} alt="" />
        ) : (
          <video
            ref={video}
            autoPlay={variant === 'page'}
            muted
            loop
            playsInline
            preload={variant === 'page' ? 'metadata' : 'none'}
            poster={mediaUrl('vanta/vanta-banner-clean-poster-1920.webp')}
          >
            <source src={mediaUrl('vanta/vanta-banner-clean-1080.mp4')} type="video/mp4" media="(max-width: 900px)" />
            <source src={mediaUrl('vanta/vanta-banner-clean-4k.webm')} type="video/webm" />
            <source src={mediaUrl('vanta/vanta-banner-clean-4k.mp4')} type="video/mp4" />
          </video>
        )}
      </div>
      <div className="vanta-hero__text">
        <p className="vanta-hero__eyebrow">Sound, reconstructed.</p>
        <Title id={`vanta-hero-${variant}`} className="vanta-hero__title">
          VANTA
        </Title>
        <p className="vanta-hero__line">A hybrid synthesizer that plays like an instrument, and rebuilds any sound you drop into it.</p>
        <div className="vanta-hero__actions">
          {tester ? (
            <>
              <Link to="/account" className="cta cta--primary">
                <span>Your downloads</span>
                <Arrow />
              </Link>
              <p className="vanta-hero__note">You’re in the VANTA beta.</p>
            </>
          ) : (
            <button type="button" className="cta cta--primary" onClick={requestBeta}>
              <span>Request beta access</span>
              <Arrow />
            </button>
          )}
          {variant === 'band' && (
            <Link to="/shop/vanta" className="text-link">
              Discover VANTA <Arrow />
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
