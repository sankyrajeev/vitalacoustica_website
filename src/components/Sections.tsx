import { useRef, type PointerEvent } from 'react'
import { site, type Service } from '../content/site'

export function CityTicker() {
  // duplicated so the marquee loops seamlessly
  const items = [...site.cities, ...site.cities]
  return (
    <div className="ticker" aria-label={`Shows across ${site.cities.join(', ')}`}>
      <div className="ticker__track">
        {items.map((c, i) => (
          <span key={i} aria-hidden={i >= site.cities.length}>
            {c}
            <i>◆</i>
          </span>
        ))}
      </div>
    </div>
  )
}

export function Reach() {
  return (
    <section id="reach" className="section container">
      <div className="section__head" data-reveal>
        <p className="eyebrow">Based in {site.homeBase}</p>
        <h2>
          Across Karnataka
          <br />
          and beyond.
        </h2>
      </div>
      <div className="stats">
        {site.stats.map((s, i) => (
          <div key={s.label} className="stat" data-reveal style={{ transitionDelay: `${i * 90}ms` }}>
            <strong>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

/** A card that tilts towards the pointer in 3D, with a light that follows it. */
function TiltCard({ service, delay }: { service: Service; delay: number }) {
  const ref = useRef<HTMLElement>(null)
  const onMove = (e: PointerEvent) => {
    const el = ref.current
    if (!el || e.pointerType !== 'mouse') return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    el.style.setProperty('--rx', `${(0.5 - y) * 10}deg`)
    el.style.setProperty('--ry', `${(x - 0.5) * 12}deg`)
    el.style.setProperty('--mx', `${x * 100}%`)
    el.style.setProperty('--my', `${y * 100}%`)
  }
  const onLeave = () => {
    ref.current?.style.setProperty('--rx', '0deg')
    ref.current?.style.setProperty('--ry', '0deg')
  }
  return (
    <div className="card-wrap" data-reveal style={{ transitionDelay: `${delay}ms` }}>
      <article ref={ref} className="card" onPointerMove={onMove} onPointerLeave={onLeave}>
        <div className="card__top">
          <span className="card__index">{service.index}</span>
          {'badge' in service && <span className="badge">{service.badge}</span>}
        </div>
        <h3>{service.title}</h3>
        <p>{service.body}</p>
        <ul className="card__tags">
          {service.tags.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </article>
    </div>
  )
}

export function Services() {
  return (
    <section id="services" className="section container">
      <div className="section__head" data-reveal>
        <p className="eyebrow">What we do</p>
        <h2>
          More than a rental.
          <br />
          <span className="muted">A crew that builds the night.</span>
        </h2>
      </div>
      <div className="cards">
        {site.services.map((s, i) => (
          <TiltCard key={s.id} service={s} delay={i * 80} />
        ))}
      </div>
    </section>
  )
}

export function Contact() {
  const { phone, whatsapp, email, instagram } = site.contact
  const channels = [
    whatsapp && { label: 'WhatsApp', value: 'Message us', href: `https://wa.me/${whatsapp}` },
    phone && { label: 'Call', value: phone, href: `tel:${phone.replace(/\s/g, '')}` },
    email && { label: 'Email', value: email, href: `mailto:${email}` },
    instagram && { label: 'Instagram', value: `@${instagram}`, href: `https://instagram.com/${instagram}` },
  ].filter(Boolean) as { label: string; value: string; href: string }[]

  return (
    <section id="contact" className="section container contact" data-reveal>
      <p className="eyebrow">Let's talk</p>
      <h2>
        Got a date, a venue
        <br />
        and a lineup?
      </h2>
      <p className="contact__lede">
        Tell us about your show — we'll come back with a sound and lighting plan built around your room and your
        artists.
      </p>
      {channels.length > 0 ? (
        <div className="contact__channels">
          {channels.map((c) => (
            <a key={c.label} href={c.href} className="channel" target="_blank" rel="noreferrer">
              <span>{c.label}</span>
              <strong>{c.value}</strong>
            </a>
          ))}
        </div>
      ) : (
        <p className="contact__soon">Booking form &amp; contact details — coming in the next update.</p>
      )}
    </section>
  )
}

const YEAR = new Date().getFullYear()

export function Footer() {
  return (
    <footer className="footer container">
      <img src="/brand/va-mark-white.png" alt="" width={1501} height={822} className="footer__mark" />
      <p>
        © {YEAR} {site.name} · {site.descriptor}
      </p>
      <p className="muted">{site.domain}</p>
    </footer>
  )
}
