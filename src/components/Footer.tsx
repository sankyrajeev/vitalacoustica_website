import { capabilities } from '../content/capabilities'
import { site } from '../content/site'
import { Link } from './Link'
import { Logo } from './ui'

const YEAR = new Date().getFullYear()

export function Footer() {
  const { email, phone, instagram, location } = site.contact
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
              <li>
                <Link to="/contact">Get a quote</Link>
              </li>
              {email && (
                <li>
                  <a href={`mailto:${email}`}>{email}</a>
                </li>
              )}
              {phone && (
                <li>
                  <a href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a>
                </li>
              )}
              {instagram && (
                <li>
                  <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noreferrer">
                    Instagram
                  </a>
                </li>
              )}
              {location && <li className="muted">{location}</li>}
            </ul>
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
