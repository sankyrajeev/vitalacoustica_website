import { useState, type FormEvent } from 'react'
import { site } from '../content/site'

// Project enquiry. Posts JSON to the endpoint configured in site.enquiry
// (Formspree, FormSubmit or Web3Forms all accept this shape).

const EVENT_TYPES = ['Concert or club night', 'Festival or open air', 'Corporate or brand event', 'Private event', 'Permanent installation', 'Other']
const SERVICES = ['Sound system', 'Lighting', 'LED & visuals', 'Full production', 'Installation consulting']
const AUDIENCE = ['Under 100', '100–300', '300–600', '600–1,000', 'Over 1,000']
const BUDGET = ['Prefer not to say', 'To be discussed', 'Under ₹2 lakh', '₹2–5 lakh', '₹5–10 lakh', 'Over ₹10 lakh']

type Status = { state: 'idle' | 'sending' | 'sent' | 'error'; message?: string }

function enquiryConfigured() {
  return Boolean(site.enquiry.endpoint)
}

type FormProps = {
  id?: string
  /** pre-selected services and description, e.g. when arriving from an equipment page */
  initialServices?: string[]
  initialDescription?: string
}

export function EnquiryForm({ id = 'enquiry', initialServices = [], initialDescription = '' }: FormProps) {
  const [status, setStatus] = useState<Status>({ state: 'idle' })
  const [services, setServices] = useState<string[]>(initialServices)
  const f = (name: string) => `${id}-${name}`

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    if (!form.checkValidity()) {
      form.reportValidity()
      return
    }
    if (services.length === 0) {
      setStatus({ state: 'error', message: 'Choose at least one service so we know what you need.' })
      return
    }
    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>
    // honeypot: real people never fill this in
    if (data._gotcha) return setStatus({ state: 'sent' })
    delete data._gotcha

    if (!enquiryConfigured()) {
      setStatus({
        state: 'error',
        message: import.meta.env.DEV
          ? 'Not connected yet: set site.enquiry.endpoint in src/content/site.ts.'
          : 'Enquiries can’t be sent from the site right now. Please contact us directly.',
      })
      return
    }

    setStatus({ state: 'sending' })
    try {
      const res = await fetch(site.enquiry.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          ...data,
          services: services.join(', '),
          _subject: `Hire enquiry: ${data.eventType || 'New event'} — ${data.name}`,
          _replyto: data.email,
          subject: `Hire enquiry from ${data.name}`,
          ...(site.enquiry.accessKey ? { access_key: site.enquiry.accessKey } : {}),
        }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setStatus({ state: 'sent' })
      form.reset()
      setServices([])
    } catch {
      setStatus({ state: 'error', message: 'That didn’t go through. Please check your connection and try again.' })
    }
  }

  if (status.state === 'sent') {
    return (
      <div className="form-done" role="status">
        <p className="label">Received</p>
        <h3>Thank you. We’ll be in touch.</h3>
        <p className="muted">We read every enquiry and reply personally.</p>
      </div>
    )
  }

  const toggle = (s: string) => setServices((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))

  return (
    <form className="form" onSubmit={submit} noValidate>
      <fieldset className="form__group">
        <legend className="label">The event</legend>
        <div className="form__grid">
          <label className="field" htmlFor={f('eventType')}>
            <span>Type of event</span>
            <select id={f('eventType')} name="eventType" required defaultValue="">
              <option value="" disabled>
                Select
              </option>
              {EVENT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="field" htmlFor={f('date')}>
            <span>Date</span>
            <input id={f('date')} name="date" type="date" />
          </label>
          <label className="field" htmlFor={f('location')}>
            <span>Location or venue</span>
            <input id={f('location')} name="location" type="text" autoComplete="off" required />
          </label>
          <label className="field" htmlFor={f('audience')}>
            <span>Approximate audience</span>
            <select id={f('audience')} name="audience" defaultValue="">
              <option value="">Select</option>
              {AUDIENCE.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="field field--wide" role="group" aria-labelledby={f('services-label')}>
          <span id={f('services-label')}>Services required</span>
          <div className="chips">
            {SERVICES.map((s) => (
              <button type="button" key={s} className="chip" aria-pressed={services.includes(s)} onClick={() => toggle(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="form__grid">
          <label className="field" htmlFor={f('budget')}>
            <span>
              Budget <em>optional</em>
            </span>
            <select id={f('budget')} name="budget" defaultValue="">
              <option value="">Select</option>
              {BUDGET.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="field field--wide" htmlFor={f('description')}>
          <span>Tell us about it</span>
          <textarea
            id={f('description')}
            name="description"
            rows={5}
            required
            defaultValue={initialDescription}
            placeholder="The venue, the music or programme, timings, and any equipment you already have in mind."
          />
        </label>
      </fieldset>

      <fieldset className="form__group">
        <legend className="label">You</legend>
        <div className="form__grid">
          <label className="field" htmlFor={f('name')}>
            <span>Name</span>
            <input id={f('name')} name="name" type="text" autoComplete="name" required />
          </label>
          <label className="field" htmlFor={f('organisation')}>
            <span>
              Organisation <em>optional</em>
            </span>
            <input id={f('organisation')} name="organisation" type="text" autoComplete="organization" />
          </label>
          <label className="field" htmlFor={f('email')}>
            <span>Email</span>
            <input id={f('email')} name="email" type="email" autoComplete="email" required />
          </label>
          <label className="field" htmlFor={f('phone')}>
            <span>
              Phone <em>optional</em>
            </span>
            <input id={f('phone')} name="phone" type="tel" autoComplete="tel" />
          </label>
        </div>
        <input className="hp" type="text" name="_gotcha" tabIndex={-1} autoComplete="off" aria-hidden />
      </fieldset>

      <div className="form__foot">
        <button className="cta cta--primary" type="submit" disabled={status.state === 'sending'}>
          <span>{status.state === 'sending' ? 'Sending…' : 'Request a quote'}</span>
        </button>
        <p className="form__note muted">We use your details only to reply to this enquiry.</p>
      </div>
      {status.state === 'error' && (
        <p className="form__error" role="alert">
          {status.message}
        </p>
      )}
    </form>
  )
}
