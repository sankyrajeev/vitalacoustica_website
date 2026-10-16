import { useState, type FormEvent } from 'react'
import { Link } from '../components/Link'
import { PageHead } from '../components/PageHead'
import { TestimonialSlider } from '../components/TestimonialSlider'
import { Cta, Label } from '../components/ui'
import { published, site, waLink } from '../content/site'
import { testimonials } from '../content/testimonials'

export function TestimonialsPage() {
  return (
    <>
      <PageHead label="Testimonials" title="In their words.">
        What promoters, artists and hosts say after working with us. Every testimonial here is published with the person's
        permission, in their own words.
      </PageHead>

      <section className="section section--tight">
        <div className="wrap">
          {published.testimonials && testimonials.length > 0 ? (
            <TestimonialSlider items={testimonials} />
          ) : (
            <div className="coming-soon">
              <span className="label">Updated soon</span>
              <p>
                We’re gathering words from the people we’ve worked with. This page will be updated soon with their testimonials,
                published with their permission.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="section section--solid testimonial-invite" aria-labelledby="invite-title">
        <div className="wrap testimonial-invite__inner">
          <div>
            <Label>Worked with us?</Label>
            <h2 id="invite-title" className="h1">
              Tell us how it felt.
            </h2>
            <p className="lede">
              A few lines about your event: the sound, the light, the crew. We'll only publish it if you say yes below.
            </p>
            <Cta to="/contact" variant="quiet">
              Or plan your next event
            </Cta>
          </div>
          <TestimonialForm />
        </div>
      </section>
    </>
  )
}

type Status = { state: 'idle' | 'sending' | 'sent' | 'error'; message?: string; viaWhatsApp?: string }

/** Sends a testimonial to the same destination as enquiries (form service, or WhatsApp). */
function TestimonialForm() {
  const [status, setStatus] = useState<Status>({ state: 'idle' })

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    if (!form.checkValidity()) return form.reportValidity()
    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>
    if (data._gotcha) return setStatus({ state: 'sent' })
    delete data._gotcha
    const publish = data.publish === 'yes' ? 'Yes, may be published' : 'No, private feedback only'
    const subject = `Testimonial from ${data.name}`

    const body = [
      `Name: ${data.name}`,
      data.context && `Event / organisation: ${data.context}`,
      data.email && `Email: ${data.email}`,
      `Publish: ${publish}`,
      '',
      data.quote,
    ]
      .filter((l) => l !== undefined && l !== '')
      .join('\n')
    // if the site can't send it, it's written out for WhatsApp instead
    const viaWhatsApp = () => setStatus({ state: 'sent', viaWhatsApp: waLink(`${subject}\n\n${body}`) })
    if (!site.enquiry.endpoint) return viaWhatsApp()

    setStatus({ state: 'sending' })
    let res: Response
    try {
      res = await fetch(site.enquiry.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          type: 'testimonial',
          ...data,
          publish,
          _subject: subject,
          subject,
          _replyto: data.email,
          ...(site.enquiry.accessKey ? { access_key: site.enquiry.accessKey } : {}),
        }),
      })
    } catch {
      return viaWhatsApp()
    }
    if (res.ok) {
      setStatus({ state: 'sent' })
      form.reset()
    } else if (res.status === 400) {
      setStatus({ state: 'error', message: 'Please add your name and your words, then send it again.' })
    } else viaWhatsApp()
  }

  if (status.state === 'sent') {
    return (
      <div className="form-done" role="status">
        <p className="label">{status.viaWhatsApp ? 'One more step' : 'Received'}</p>
        <h3>{status.viaWhatsApp ? 'Send it to us on WhatsApp.' : 'Thank you.'}</h3>
        <p className="muted">
          {status.viaWhatsApp
            ? 'We couldn’t send it from the site just now, so your words are written out and ready in WhatsApp.'
            : 'We read every one.'}
        </p>
        {status.viaWhatsApp && (
          <a className="cta cta--primary form-done__wa" href={status.viaWhatsApp} target="_blank" rel="noreferrer">
            <span>Open WhatsApp</span>
          </a>
        )}
      </div>
    )
  }

  return (
    <form className="form testimonial-form" onSubmit={submit} noValidate>
      <div className="form__grid">
        <label className="field" htmlFor="t-name">
          <span>Name</span>
          <input id="t-name" name="name" type="text" autoComplete="name" required />
        </label>
        <label className="field" htmlFor="t-context">
          <span>
            Event or organisation <em>optional</em>
          </span>
          <input id="t-context" name="context" type="text" autoComplete="organization" />
        </label>
      </div>
      <label className="field field--wide" htmlFor="t-email">
        <span>
          Email <em>optional, so we can thank you</em>
        </span>
        <input id="t-email" name="email" type="email" autoComplete="email" />
      </label>
      <label className="field field--wide" htmlFor="t-quote">
        <span>Your words</span>
        <textarea id="t-quote" name="quote" rows={5} required placeholder="How did the night sound and feel?" />
      </label>
      <fieldset className="field field--wide publish">
        <legend>May we publish this on our website?</legend>
        <label>
          <input type="radio" name="publish" value="yes" required /> Yes, with my name
        </label>
        <label>
          <input type="radio" name="publish" value="no" /> No, it’s just for you
        </label>
      </fieldset>
      <input className="hp" type="text" name="_gotcha" tabIndex={-1} autoComplete="off" aria-hidden />
      <div className="form__foot">
        <button className="cta cta--primary" type="submit" disabled={status.state === 'sending'}>
          <span>{status.state === 'sending' ? 'Sending…' : 'Send testimonial'}</span>
        </button>
        <p className="form__note muted">
          See our <Link to="/privacy">privacy notice</Link>.
        </p>
      </div>
      {status.state === 'error' && (
        <p className="form__error" role="alert">
          {status.message}
        </p>
      )}
    </form>
  )
}
