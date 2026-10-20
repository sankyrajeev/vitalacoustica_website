import { useEffect, useState, type FormEvent } from 'react'
import { queryParam } from '../../router'
import { Link } from '../Link'
import { Arrow } from '../ui'

// The Acoustica Edit: newsletter sign-up. The Worker (server/newsletter.ts) sends a confirmation
// email through Resend; nobody is added until they click it. Until the newsletter is configured,
// the Worker answers 503 and this says sign-ups open soon. Nothing here ever pretends to succeed.

type State =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'pending' }
  | { kind: 'soon' }
  | { kind: 'error'; message: string }

const RETURNS: Record<string, { title: string; text: string }> = {
  confirmed: { title: 'You’re on the list.', text: 'Thank you for confirming. The next edition of The Acoustica Edit will come to your inbox.' },
  unsubscribed: { title: 'You’ve been unsubscribed.', text: 'You won’t receive The Acoustica Edit any more. You can sign up again at any time.' },
  expired: { title: 'That link has expired.', text: 'Confirmation links work for seven days. Enter your email again and we’ll send a new one.' },
  error: { title: 'Something went wrong.', text: 'We couldn’t complete that just now. Please try again in a little while.' },
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function AcousticaEdit() {
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [returned] = useState(() => queryParam('edit'))
  const notice = returned ? RETURNS[returned] : undefined

  // arriving from a confirm or unsubscribe link: bring the message into view
  useEffect(() => {
    if (notice) document.getElementById('the-acoustica-edit')?.scrollIntoView({ block: 'center' })
  }, [notice])

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const email = String(data.get('email') ?? '').trim()
    if (!EMAIL.test(email)) return setState({ kind: 'error', message: 'Please enter a valid email address.' })
    if (!data.get('consent')) return setState({ kind: 'error', message: 'Please tick the box to agree to receive The Acoustica Edit.' })
    setState({ kind: 'sending' })
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, consent: true, website: String(data.get('website') ?? '') }),
      })
      if (res.ok) {
        form.reset()
        return setState({ kind: 'pending' })
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      if (res.status === 503 || body.error === 'not_configured') return setState({ kind: 'soon' })
      if (body.error === 'invalid_email') return setState({ kind: 'error', message: 'Please enter a valid email address.' })
      if (body.error === 'consent_required') return setState({ kind: 'error', message: 'Please tick the box to agree to receive The Acoustica Edit.' })
      setState({ kind: 'error', message: 'We couldn’t sign you up just now. Please try again in a few minutes.' })
    } catch {
      // no Worker (a review copy of the site) or offline
      setState({ kind: 'soon' })
    }
  }

  return (
    <section id="the-acoustica-edit" className="edit" aria-labelledby="edit-title">
      <div className="wrap edit__inner">
        <div className="edit__intro">
          <p className="label">Newsletter</p>
          <h2 id="edit-title" className="h1">
            The Acoustica Edit
          </h2>
          <p className="edit__line">A considered perspective on sound, light and live production.</p>
          <p className="muted edit__note">
            Selected Journal articles, verified industry news and genuine production updates. Occasional, never daily.
          </p>
        </div>

        {notice ? (
          <div className="edit__done" role="status">
            <h3>{notice.title}</h3>
            <p className="muted">{notice.text}</p>
          </div>
        ) : state.kind === 'pending' ? (
          <div className="edit__done" role="status">
            <h3>Check your inbox.</h3>
            <p className="muted">
              If this address isn’t already subscribed, we’ve sent an email to confirm it. You’ll only be added once you click the
              link inside.
            </p>
          </div>
        ) : state.kind === 'soon' ? (
          <div className="edit__done" role="status">
            <h3>Sign-ups open soon.</h3>
            <p className="muted">The Acoustica Edit isn’t taking subscribers just yet. Nothing has been saved. Please come back shortly.</p>
          </div>
        ) : (
          <form className="edit__form" onSubmit={submit} noValidate>
            <label className="field" htmlFor="edit-email">
              <span>Email</span>
              <input id="edit-email" name="email" type="email" autoComplete="email" required inputMode="email" />
            </label>
            <label className="edit__consent">
              <input type="checkbox" name="consent" value="yes" required />
              <span>
                I’d like to receive The Acoustica Edit by email. I can unsubscribe at any time, and my address is used only for this
                newsletter. See the <Link to="/privacy">privacy notice</Link>.
              </span>
            </label>
            <input className="hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden />
            <button className="cta cta--primary" type="submit" disabled={state.kind === 'sending'}>
              <span>{state.kind === 'sending' ? 'Sending…' : 'Subscribe'}</span>
              <Arrow />
            </button>
            {state.kind === 'error' && (
              <p className="form__error" role="alert">
                {state.message}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  )
}
