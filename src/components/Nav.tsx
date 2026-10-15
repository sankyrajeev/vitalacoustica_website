import { useEffect, useState } from 'react'
import { site } from '../content/site'
import { useTheme } from '../hooks/useTheme'
import { Link } from './Link'
import { Logo } from './ui'

/** Top navigation: logo, the main sections, and the quote CTA. */
export function Nav({ path }: { path: string }) {
  const [scrolled, setScrolled] = useState(false)
  // on the homepage's opening frame the big logo is the brand; the nav logo appears after it
  const [atIntro, setAtIntro] = useState(true)
  const [open, setOpen] = useState(false)
  const { theme, toggle } = useTheme()

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40)
      setAtIntro(window.scrollY < window.innerHeight * 0.55)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('menu-open', open)
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const isActive = (to: string) => path === to || (to !== '/' && path.startsWith(`${to}/`))
  const close = () => setOpen(false)

  return (
    <header className={`nav ${scrolled ? 'nav--scrolled' : ''} ${open ? 'nav--open' : ''} ${path === '/' && atIntro && !open ? 'nav--intro' : ''}`}>
      <Link to="/" className="nav__brand" onClick={close}>
        <Logo />
      </Link>

      <nav id="site-menu" className="nav__menu" aria-label="Main">
        <ul>
          {site.nav.map((item, i) => (
            <li key={item.to}>
              <Link to={item.to} aria-current={isActive(item.to) ? 'page' : undefined} onClick={close}>
                <span className="nav__num" aria-hidden>
                  0{i + 1}
                </span>
                {item.label}
              </Link>
            </li>
          ))}
          <li className="nav__cta">
            <Link to="/contact" aria-current={isActive('/contact') ? 'page' : undefined} onClick={close}>
              Get a quote
            </Link>
          </li>
        </ul>
        <p className="nav__line" aria-hidden>
          {site.lines.felt}
        </p>
      </nav>

      <div className="nav__tools">
        <button
          className="icon-btn"
          onClick={toggle}
          aria-label={theme === 'dark' ? 'Switch to the light edition' : 'Switch to the dark edition'}
          title={theme === 'dark' ? 'Light edition' : 'Dark edition'}
        >
          <span className={`theme-dot theme-dot--${theme}`} aria-hidden />
        </button>
        <button className="icon-btn nav__burger" aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen((o) => !o)}>
          <span aria-hidden />
          <span aria-hidden />
          <span className="sr-only">{open ? 'Close menu' : 'Menu'}</span>
        </button>
      </div>
    </header>
  )
}
