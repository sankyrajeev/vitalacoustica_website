import { capabilities } from '../content/capabilities'
import { site, waLink } from '../content/site'
import { Link } from './Link'
import { Logo } from './ui'

const YEAR = new Date().getFullYear()

export function Footer() {
  const { instagram, x, whatsapp, location } = site.contact
  return (
    <footer className="footer">
      <div className="footer__inner wrap">
        <div className="footer__brand">
          <Link to="/" aria-label="Vital Acoustica, home">
            <Logo tagline className="logo--lg" />
          </Link>
          <p className="footer__disciplines">
            {capabilities.map((c, i) => (
              <span key={c.id}>
                {i > 0 && <i aria-hidden> / </i>}
                <Link to={`/capabilities/${c.id}`}>{c.name}</Link>
              </span>
            ))}
          </p>
        </div>

        <nav className="footer__cols" aria-label="Footer">
          <div>
            <p className="label">Explore</p>
            <ul>
              <li>
                <Link to="/story">Our Story</Link>
              </li>
              <li>
                <Link to="/equipment">Equipment</Link>
              </li>
              <li>
                <Link to="/capabilities">Services</Link>
              </li>
              <li>
                <Link to="/work">Selected work</Link>
              </li>
              <li>
                <Link to="/shop">Shop</Link>
              </li>
              <li>
                <Link to="/testimonials">Testimonials</Link>
              </li>
              <li>
                <Link to="/careers">Careers</Link>
              </li>
              <li>
                <Link to="/journal">Journal</Link>
              </li>
              <li>
                <Link to="/deck">Capability deck</Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="label">Contact</p>
            <ul>
              {instagram && (
                <li>
                  <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noreferrer">
                    Instagram
                  </a>
                </li>
              )}
              {x && (
                <li>
                  <a href={`https://x.com/${x}`} target="_blank" rel="noreferrer">
                    X
                  </a>
                </li>
              )}
              {location && <li className="muted">{location}</li>}
            </ul>
            {whatsapp && (
              <a className="footer__wa" href={waLink('Hi Vital Acoustica, ')} target="_blank" rel="noreferrer">
                <WhatsAppIcon />
                WhatsApp us
              </a>
            )}
          </div>
        </nav>
      </div>

      <div className="footer__base wrap">
        <p>
          © {YEAR} {site.name}
        </p>
        <p className="footer__legal">
          <Link to="/privacy">Privacy</Link>
          <Link to="/legal">Legal</Link>
        </p>
      </div>
    </footer>
  )
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"
      />
    </svg>
  )
}
