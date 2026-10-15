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
              Those answers guide our creative decisions, system choices and execution. We take on a limited number of
              productions so that each one gets the attention it deserves, and so that everything carrying our name meets
              the same standard.
            </p>
            <p>
              We work with artists, promoters and venues, and with brands and private clients who want an event to feel
              considered rather than assembled.
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
                An independent creative production house bringing sound, light and space together. Technically serious,
                creatively ambitious and selective about the work we take on.
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
                    <strong>{group}</strong> {gear.filter((g) => g.group === group).map(fullName).join(', ')}.
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
  Lighting: 'Lighting',
  'LED & visuals': 'LED & visuals',
  Structure: 'Full production',
}

export function ContactPage() {
  const { email, phone, whatsapp, instagram } = site.contact
  // arriving from an equipment page: "#/contact?item=b22"
  const item = gearById[queryParam('item') as GearId]
  const direct = [
    email && { label: 'Email', value: email, href: `mailto:${email}` },
    phone && { label: 'Phone', value: phone, href: `tel:${phone.replace(/\s/g, '')}` },
    whatsapp && { label: 'WhatsApp', value: 'Message us', href: `https://wa.me/${whatsapp}` },
    instagram && { label: 'Instagram', value: `@${instagram}`, href: `https://instagram.com/${instagram}` },
  ].filter(Boolean) as { label: string; value: string; href: string }[]

  return (
    <>
      <PageHead label="Get a quote" title="Tell us about your event.">
        The date, the venue and roughly how many people. We’ll come back with the right system, a quote, and who will be
        on site to run it.
      </PageHead>
      <section className="section section--tight">
        <div className="wrap contact">
          <EnquiryForm
            id="contact"
            initialServices={item ? [SERVICE_FOR_GROUP[item.group]] : []}
            initialDescription={item ? `Interested in: ${fullName(item)}\n\n` : ''}
          />
          <aside className="contact__aside">
            {direct.length > 0 && (
              <>
                <Label>Direct</Label>
                <ul className="contact__direct">
                  {direct.map((d) => (
                    <li key={d.label}>
                      <span className="muted">{d.label}</span>
                      <a href={d.href} target={d.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
                        {d.value}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <Label>What helps</Label>
            <p className="muted">
              A date, a venue, an idea of the audience and what the night should feel like. If you have drawings or a tech
              rider, mention it and we’ll ask for it when we reply.
            </p>
          </aside>
        </div>
      </section>
    </>
  )
}

/* ─────────────── Privacy / Legal ─────────────── */

export function LegalPage({ kind }: { kind: 'privacy' | 'legal' }) {
  const privacy = kind === 'privacy'
  return (
    <>
      <PageHead label={privacy ? 'Privacy' : 'Legal'} title={privacy ? 'Privacy notice' : 'Legal information'} />
      <section className="section section--tight">
        <div className="wrap prose">
          <p className="draft">Draft for review. Please have this checked before the site goes live.</p>
          {privacy ? (
            <>
              <h2 className="h3">What we collect</h2>
              <p>
                When you send an enquiry we receive the details you enter in the form: your name, email address, optional
                phone number and organisation, and the information about your event.
              </p>
              <h2 className="h3">How we use it</h2>
              <p>
                We use these details only to respond to your enquiry and to plan a production with you. We do not sell or
                share them for marketing.
              </p>
              <h2 className="h3">Where it is processed</h2>
              <p>
                Enquiries are delivered to us through a form-handling service, named here once configured. Your choice of
                light or dark edition is stored only in your own browser.
              </p>
              <h2 className="h3">Your rights</h2>
              <p>You can ask us to show, correct or delete the information we hold about you by contacting us.</p>
            </>
          ) : (
            <>
              <h2 className="h3">Company details</h2>
              {/* DUMMY: the address line is a stand-in; the GSTIN is real */}
              <p>
                Vital Acoustica, Bangalore, Karnataka, India.
                <br />
                GSTIN: 29ABCFV2853P1ZF
              </p>
              <h2 className="h3">Content</h2>
              <p>
                Photographs show productions by {site.name}. Visual studies and renders are labelled as such. Equipment
                specifications are as published by their manufacturers. Brand names belong to their respective owners.
              </p>
            </>
          )}
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
