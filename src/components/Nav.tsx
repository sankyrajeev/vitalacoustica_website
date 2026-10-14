import { useEffect, useState } from 'react'
import { site } from '../content/site'

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`nav ${scrolled ? 'nav--solid' : ''} ${open ? 'nav--open' : ''}`}>
      <a href="#top" className="nav__logo" aria-label={`${site.name} home`}>
        <img src="/brand/logo-full-white.png" alt={site.name} width={1712} height={403} />
      </a>
      <button
        className="nav__toggle"
        aria-expanded={open}
        aria-controls="nav-links"
        onClick={() => setOpen((o) => !o)}
      >
        <span />
        <span />
        <span className="sr-only">Menu</span>
      </button>
      <nav id="nav-links" className="nav__links" onClick={() => setOpen(false)}>
        {site.nav.map((l) => (
          <a key={l.href} href={l.href}>
            {l.label}
          </a>
        ))}
        <a href="#contact" className="btn btn--primary btn--sm">
          Book a show
        </a>
      </nav>
    </header>
  )
}
