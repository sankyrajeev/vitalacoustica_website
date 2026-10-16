import { EnquiryForm } from '../components/EnquiryForm'
import { PageHead } from '../components/PageHead'
import { Cta, Label, Placeholder, TextLink } from '../components/ui'
import { capabilities, process } from '../content/capabilities'
import { fullName, gear, gearById, RIG_GROUPS, type GearGroup, type GearId } from '../content/gear'
import { journal } from '../content/journal'
import { site } from '../content/site'
import { Link } from '../components/Link'
import { queryParam } from '../router'

/* ─────────────── Studio ─────────────── */

export function StudioPage() {
  return (
    <>
      <PageHead label="Studio" title="Selective by design.">
        We believe good production begins with asking better questions.
      </PageHead>
      <section className="section section--tight">
        <div className="wrap studio">
          <div className="studio__questions">
            <p className="quote">What should the audience feel?</p>
            <p className="quote">What does the space demand?</p>
            <p className="quote">Which elements deserve attention, and which should remain invisible?</p>
          </div>
          <div className="studio__copy">
            <p>
              Those answers guide our creative decisions, system choices and execution. We take on a limited number of productions
              so that each one gets the attention it deserves, and so that everything carrying our name meets the same standard.
            </p>
            <p>
              We work with artists, promoters and venues, and with brands and private clients who want an event to feel considered
              rather than assembled.
            </p>
          </div>
        </div>
      </section>

      <section className="section section--solid">
        <div className="wrap">
          <Label>How we work</Label>
          <ol className="process process--wide">
            {process.map((s, i) => (
              <li key={s.title}>
                <span>0{i + 1}</span>
                <div>
                  <strong>{s.title}</strong>
                  <p>{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section section--tight">
        <div className="wrap studio__team">
          <div>
            <Label>The team</Label>
            <p className="lede">{site.lines.intent}</p>
          </div>
          <Placeholder ratio="3 / 2">Team portrait and short biographies: who leads sound, light and production.</Placeholder>
        </div>
      </section>
    </>
  )
}

/* ─────────────── Journal / Experiments ─────────────── */

export function JournalPage() {
  return (
    <>
      <PageHead label="Journal" title="Studies, experiments and field notes.">
        Our own explorations, each labelled for what it is. Client work lives under Selected work.
      </PageHead>
      <section className="section section--tight">
        <ol className="wrap journal">
          {journal.map((j) => (
            <li key={j.slug} className={`journal__entry ${j.placeholder ? 'is-placeholder' : ''}`}>
              <p className="journal__meta">
                <span className="tag">{j.label}</span>
                <span>{j.date === 'TBC' ? 'Upcoming' : j.date}</span>
              </p>
              <h2 className="h2">{j.title}</h2>
              <p>{j.body}</p>
              {j.link && <TextLink to={j.link.to}>{j.link.label}</TextLink>}
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}

/* ─────────────── Capability deck ─────────────── */

export function DeckPage() {
  return (
    <>
      <PageHead label="Capability deck" title="Vital Acoustica at a glance.">
        A one-page summary for production managers, agencies and procurement teams.
      </PageHead>
      <section className="section section--tight">
        <div className="wrap">
          <div className="sheet">
            <div className="sheet__row">
              <h2 className="sheet__h">Who we are</h2>
              <p>
                An independent creative production house bringing sound, light and space together. Technically serious, creatively
                ambitious and selective about the work we take on.
              </p>
            </div>
            <div className="sheet__row">
              <h2 className="sheet__h">Disciplines</h2>
              <ul className="sheet__list">
                {capabilities.map((c) => (
                  <li key={c.id}>
                    <strong>{c.name}</strong> {c.covers.join(', ')}.
                  </li>
                ))}
              </ul>
            </div>
            <div className="sheet__row">
              <h2 className="sheet__h">Equipment</h2>
              <ul className="sheet__list">
                {RIG_GROUPS.map((group) => (
                  <li key={group}>
                    <strong>{group}</strong>{' '}
                    {gear
                      .filter((g) => g.group === group)
                      .map(fullName)
                      .join(', ')}
                    .
                  </li>
                ))}
              </ul>
            </div>
            <div className="sheet__row">
              <h2 className="sheet__h">Process</h2>
              <ol className="sheet__list">
                {process.map((s) => (
                  <li key={s.title}>{s.title}</li>
                ))}
              </ol>
            </div>
            <div className="sheet__row">
              <h2 className="sheet__h">Contact</h2>
              <p>
                <Link to="/contact">Start a project</Link>
                {site.contact.email && <> · {site.contact.email}</>}
              </p>
            </div>
          </div>
          <p className="fineprint deck__note">A downloadable PDF version of this deck can be added here once designed.</p>
        </div>
      </section>
    </>
  )
}

/* ─────────────── Contact ─────────────── */

const SERVICE_FOR_GROUP: Record<GearGroup, string> = {
  Sound: 'Sound system',
  'Audio Infrastructure': 'Sound system',
  'Stage Lighting': 'Lighting',
  'Visual Experiences': 'LED & visuals',
  Structure: 'Full production',
}

export function ContactPage() {
  const { whatsapp } = site.contact
  // arriving from an equipment page: "/contact?item=b22"
  const item = gearById[queryParam('item') as GearId]
  const waText = item
    ? `Hi Vital Acoustica, I'd like a quote for the ${fullName(item)}.`
    : "Hi Vital Acoustica, I'd like a quote for an event."

  return (
    <>
      <PageHead label="Get a quote" title="Tell us about your event.">
        The date, the venue and roughly how many people. We’ll come back with the right system, a quote, and who will be on site
        to run it.
      </PageHead>
      <section className="section section--tight">
        <div className="wrap contact">
          <EnquiryForm
            id="contact"
            initialServices={item ? [SERVICE_FOR_GROUP[item.group]] : []}
            initialDescription={item ? `Interested in: ${fullName(item)}\n\n` : ''}
          />
          <aside className="contact__aside">
            {whatsapp && (
              <>
                <Label>Quicker on WhatsApp?</Label>
                <a
                  className="whatsapp"
                  href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(waText)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden>
                    <path
                      fill="currentColor"
                      d="M16 3C8.8 3 3 8.7 3 15.8c0 2.3.6 4.5 1.8 6.5L3 29l6.9-1.8c1.9 1 4 1.6 6.1 1.6 7.2 0 13-5.7 13-12.8S23.2 3 16 3Zm0 23.5c-1.9 0-3.8-.5-5.4-1.5l-.4-.2-4.1 1.1 1.1-4-.3-.4a10.6 10.6 0 0 1-1.6-5.7C5.3 10 10.1 5.3 16 5.3s10.7 4.7 10.7 10.5S21.9 26.5 16 26.5Zm5.9-7.9c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6.3-.5c.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.7s1.2 3.1 1.4 3.4c.2.2 2.3 3.5 5.6 4.9.8.3 1.4.5 1.9.7.8.2 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.1-.3-.2-.6-.3Z"
                    />
                  </svg>
                  <span>Chat on WhatsApp</span>
                </a>
                <p className="muted whatsapp__note">Opens WhatsApp with a message ready to send.</p>
              </>
            )}
            <Label>What helps</Label>
            <p className="muted">
              A date, a venue, an idea of the audience and what the night should feel like. If you have drawings or a tech rider,
              mention it and we’ll ask for it when we reply.
            </p>
          </aside>
        </div>
      </section>
    </>
  )
}

/* ─────────────── 404 ─────────────── */

export function NotFoundPage() {
  return (
    <section className="section not-found">
      <div className="wrap">
        <Label>Not found</Label>
        <h1 className="display display--sm">Nothing here.</h1>
        <p className="lede">The page may have moved. Everything else is a click away.</p>
        <Cta to="/">Back to the start</Cta>
      </div>
    </section>
  )
}
