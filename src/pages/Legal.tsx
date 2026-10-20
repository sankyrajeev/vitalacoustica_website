import type { ReactNode } from 'react'
import { Link } from '../components/Link'
import { PageHead } from '../components/PageHead'
import { site } from '../content/site'

// Privacy notice and legal information.
// Written for an Indian business under the Digital Personal Data Protection Act, 2023 and the
// Information Technology Act, 2000. Have a lawyer review before relying on it.

const LEGAL = {
  company: 'Vital Acoustica',
  address: 'Bangalore, Karnataka, India', // DUMMY: full registered address
  gstin: site.gst,
  updated: '20 October 2026',
  jurisdiction: 'Bengaluru, Karnataka',
}

function Contact() {
  const { email, phone } = site.contact
  return (
    <>
      {email && (
        <>
          email <a href={`mailto:${email}`}>{email}</a>
        </>
      )}
      {email && phone && ' or '}
      {phone && (
        <>
          call <a href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a>
        </>
      )}
      {!email && !phone && <Link to="/contact">use our contact form</Link>}
    </>
  )
}

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="legal__section" aria-labelledby={`legal-${n}`}>
      <h2 id={`legal-${n}`} className="h3">
        <span className="legal__n">{String(n).padStart(2, '0')}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Updated() {
  return (
    <p className="legal__meta">
      Last updated {LEGAL.updated} · {LEGAL.company} · GSTIN {LEGAL.gstin}
    </p>
  )
}

/* ─────────────── Privacy notice ─────────────── */

export function PrivacyPage() {
  return (
    <>
      <PageHead label="Privacy" title="Privacy notice">
        What we collect when you use this website or get in touch, why we collect it, and the choices you have.
      </PageHead>
      <section className="section section--tight">
        <div className="wrap prose legal">
          <Updated />

          <Section n={1} title="Who we are">
            <p>
              {LEGAL.company} ("we", "us") provides sound and lighting rental, event production and installation consulting, based
              in {LEGAL.address}. We are the Data Fiduciary for the personal data described in this notice, within the meaning of
              the Digital Personal Data Protection Act, 2023 ("DPDP Act").
            </p>
          </Section>

          <Section n={2} title="What we collect">
            <p>We only collect what you give us, or what is needed to run this website:</p>
            <ul>
              <li>
                <strong>Enquiries and quote requests:</strong> your name, email address, and optionally your phone number and
                organisation, plus the details of your event (type, date, venue, audience size, budget range, the services and
                equipment you're interested in, and your message).
              </li>
              <li>
                <strong>Testimonials:</strong> if you send us a testimonial, your name, your organisation or event, your words,
                and whether you agree to us publishing them.
              </li>
              <li>
                <strong>The Acoustica Edit (our newsletter):</strong> if you sign up, your email address, the fact that you agreed to
                receive it and when you confirmed. You are added only after you confirm by clicking the link we email you.
              </li>
              <li>
                <strong>When we work together:</strong> billing and contact details needed for quotes, invoices, GST and delivery.
              </li>
              <li>
                <strong>Preferences on your device:</strong> your choice of light or dark edition is saved in your own browser's
                storage. It is never sent to us.
              </li>
            </ul>
            <p>
              We don't use advertising or tracking cookies, and we don't build profiles of visitors. Our hosting provider may keep
              standard server logs (such as IP address, browser and time of request) for security and to keep the site running.
            </p>
          </Section>

          <Section n={3} title="Why we use it">
            <ul>
              <li>To reply to your enquiry and prepare a proposal and quote.</li>
              <li>To plan, deliver and invoice the hire or production you book with us.</li>
              <li>To publish a testimonial, only when you have explicitly agreed to it.</li>
              <li>To send The Acoustica Edit, only if you have signed up and confirmed. Every edition has an unsubscribe link.</li>
              <li>To meet our legal obligations, including tax and accounting records.</li>
              <li>To keep this website secure and working.</li>
            </ul>
            <p>
              We process your data on the basis of your consent, which you give when you send us a form, or for the legitimate
              uses allowed under the DPDP Act, such as completing a booking you asked for or complying with the law. We do not
              sell your personal data or use it for marketing without asking you first.
            </p>
          </Section>

          <Section n={4} title="Who we share it with">
            <p>We share personal data only with service providers who help us run the business, and only as needed:</p>
            <ul>
              <li>the form or email service that delivers your enquiry to us;</li>
              <li>our email provider (Resend), which stores the newsletter list and delivers The Acoustica Edit;</li>
              <li>our website hosting provider;</li>
              <li>
                for shop orders, the checkout provider (Gumroad) and our print-on-demand partner, to take payment and deliver;
              </li>
              <li>our accountants and tax advisers, for invoicing and statutory records;</li>
              <li>authorities, where we are legally required to.</li>
            </ul>
            <p>
              Some of these providers may store data on servers outside India. Where that happens, the transfer is made in line
              with the DPDP Act and any restrictions notified by the Government of India.
            </p>
          </Section>

          <Section n={5} title="How long we keep it">
            <p>
              Enquiries that don't lead to a booking are deleted within 24 months. Booking, invoice and GST records are kept for
              as long as Indian tax law requires, currently up to eight years. A published testimonial stays up until you ask us
              to remove it. Your newsletter address stays on the list until you unsubscribe; after that it is kept only as a record
              that you unsubscribed, so we never write to you again by mistake.
            </p>
          </Section>

          <Section n={6} title="Your rights">
            <p>Under the DPDP Act you can:</p>
            <ul>
              <li>ask for a summary of the personal data we hold about you and how we use it;</li>
              <li>ask us to correct, complete, update or erase it;</li>
              <li>withdraw your consent at any time, which won't affect anything we did before you withdrew it;</li>
              <li>nominate someone to exercise these rights on your behalf if you die or become incapacitated;</li>
              <li>raise a grievance with us, and if you're not satisfied, complain to the Data Protection Board of India.</li>
            </ul>
            <p>
              To do any of these, <Contact />. We will reply within 30 days.
            </p>
          </Section>

          <Section n={7} title="Grievance officer">
            <p>
              For any question or complaint about your personal data, contact our Grievance Officer: {LEGAL.company},{' '}
              {LEGAL.address}. To reach us, <Contact />.
            </p>
          </Section>

          <Section n={8} title="Security">
            <p>
              The site is served over an encrypted connection (HTTPS), and access to enquiries is limited to the people who need
              them to reply. No system is completely secure, so please don't send sensitive personal information, such as ID or
              bank details, through the website forms.
            </p>
          </Section>

          <Section n={9} title="Children">
            <p>
              This website is meant for adults organising events. We don't knowingly collect personal data from anyone under 18.
              If you think a child has sent us their details, contact us and we'll delete them.
            </p>
          </Section>

          <Section n={10} title="Changes to this notice">
            <p>
              We may update this notice from time to time. The date at the top shows when it last changed. If a change affects how
              we use data you have already given us, we'll ask for your consent again where the law requires.
            </p>
          </Section>
        </div>
      </section>
    </>
  )
}

/* ─────────────── Legal information & terms of use ─────────────── */

export function LegalPage() {
  return (
    <>
      <PageHead label="Legal" title="Legal information">
        Who runs this website, and the terms for using it.
      </PageHead>
      <section className="section section--tight">
        <div className="wrap prose legal">
          <Updated />

          <Section n={1} title="Company details">
            <dl className="legal__details">
              <div>
                <dt>Business name</dt>
                <dd>{LEGAL.company}</dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>{LEGAL.address}</dd>
              </div>
              <div>
                <dt>GSTIN</dt>
                <dd>{LEGAL.gstin}</dd>
              </div>
              {site.contact.email && (
                <div>
                  <dt>Email</dt>
                  <dd>
                    <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
                  </dd>
                </div>
              )}
              {site.contact.phone && (
                <div>
                  <dt>Phone</dt>
                  <dd>
                    <a href={`tel:${site.contact.phone.replace(/\s/g, '')}`}>{site.contact.phone}</a>
                  </dd>
                </div>
              )}
              <div>
                <dt>Website</dt>
                <dd>{site.domain}</dd>
              </div>
            </dl>
          </Section>

          <Section n={2} title="Using this website">
            <p>
              By using {site.domain} you agree to these terms. If you don't agree, please don't use the site. You may browse it,
              share links to it and download pages for your own reference. You may not copy, republish or sell its content, try to
              disrupt or gain unauthorised access to it, or use it for anything unlawful.
            </p>
          </Section>

          <Section n={3} title="Information on this site">
            <p>
              We describe our equipment and services as accurately as we can, but the website is for general information only. It
              isn't an offer to hire: availability, quantities, specifications and prices are confirmed only in a written quote
              from us. Manufacturer specifications are shown as published by the manufacturer and may change without notice.
            </p>
          </Section>

          <Section n={4} title="Quotes and bookings">
            <p>
              A request through this website is an enquiry, not a booking. A hire or production is confirmed only when we have
              both agreed a written quote, and it is governed by the terms set out in that quote, including deposits, payment,
              cancellation, delivery, setup, care of equipment and liability. All prices are subject to GST as applicable.
            </p>
          </Section>

          <Section n={5} title="Photographs, renders and studies">
            <p>
              Photographs of productions show events delivered by {site.name}. 3D renders, the stage model and visual studies are
              illustrations and are labelled as such; they are not photographs of a specific event. Some equipment images are
              manufacturer or supplier product photos, used to show the exact item we hire.
            </p>
          </Section>

          <Section n={6} title="Intellectual property">
            <p>
              The {site.name} name, logo, website design, text, photographs, 3D models and renders belong to {site.name} or are
              used with permission, and are protected by copyright and trademark law. d&b audiotechnik, RCF, Yamaha, Pioneer DJ,
              AlphaTheta, BSS Audio, ATI Pro and other brand names and product images belong to their respective owners.
              Mentioning them doesn't mean they endorse us or that we are an authorised dealer.
            </p>
          </Section>

          <Section n={7} title="Testimonials">
            <p>
              Testimonials are published with the permission of the person who gave them and reflect their own experience. We
              don't edit their meaning; we may shorten them for length.
            </p>
          </Section>

          <Section n={8} title="Shop">
            <p>
              <strong>Sample packs and VJ loops</strong> are sold through Gumroad, which processes the payment, charges any tax
              due in your country and delivers the download. Buying one gives you a non-exclusive, royalty-free licence to use it
              in your own music, DJ sets, performances, videos and streams. You may not resell, share or redistribute the files
              themselves, on their own or in another sample or loop pack. Because files are delivered instantly, digital purchases
              can't be returned; if a file is faulty or missing, contact us and we'll replace it or refund you.
            </p>
            <p>
              <strong>Merch</strong> is printed to order by our printing partner and shipped within India. Prices include GST. If
              an item arrives damaged, misprinted or wrong, tell us within 7 days of delivery with a photo and we'll replace it or
              refund you. As each piece is made for you, we can't take returns for a change of mind or the wrong size, so please
              check the size guide before ordering.
            </p>
            <p>
              To complete an order, the checkout provider and our printing partner receive the details needed to take payment and
              deliver it, such as your name, email and delivery address. See our <Link to="/privacy">privacy notice</Link>.
            </p>
          </Section>

          <Section n={9} title="Links to other sites">
            <p>
              The site may link to other websites, such as Instagram or manufacturer pages. We aren't responsible for their
              content or privacy practices.
            </p>
          </Section>

          <Section n={10} title="Liability">
            <p>
              We work to keep the site accurate and available, but it is provided "as is". To the extent the law allows, we aren't
              liable for any loss arising from your use of the website or reliance on its content. Nothing in these terms limits
              liability that cannot be limited under Indian law.
            </p>
          </Section>

          <Section n={11} title="Privacy">
            <p>
              How we handle personal data is explained in our <Link to="/privacy">privacy notice</Link>.
            </p>
          </Section>

          <Section n={12} title="Governing law">
            <p>
              These terms are governed by the laws of India. The courts at {LEGAL.jurisdiction} have exclusive jurisdiction over
              any dispute arising from them.
            </p>
          </Section>

          <Section n={13} title="Changes">
            <p>We may update these terms from time to time. The date at the top shows when they last changed.</p>
          </Section>
        </div>
      </section>
    </>
  )
}
