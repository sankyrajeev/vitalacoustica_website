import { useEffect, useState, type FormEvent } from 'react'
import { queryParam } from '../../router'
import { Link } from '../Link'
import { Arrow } from '../ui'

// The Acoustica Edit: the weekly newsletter's sign-up, in full on the blog and compact in every
// page's footer. The Worker (server/newsletter.ts) keeps the list and sends a confirmation email;
// nobody is added until they click it. Without the Worker's database it answers 503 and this says
// sign-ups open soon. Nothing here ever pretends to succeed.

type State =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'pending' }
  | { kind: 'soon' }
  | { kind: 'error'; message: string }

const RETURNS: Record<string, { title: string; text: string }> = {
  confirmed: { title: 'You’re on the list.', text: 'Thank you for confirming. The next weekly edition of The Acoustica Edit will come to your inbox on Monday.' },
  unsubscribed: { title: 'You’ve been unsubscribed.', text: 'You won’t receive The Acoustica Edit any more. You can sign up again at any time.' },
  expired: { title: 'That link has expired.', text: 'Confirmation links work for seven days. Enter your email again and we’ll send a new one.' },
  error: { title: 'Something went wrong.', text: 'We couldn’t complete that just now. Please try again in a little while.' },
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const CONSENT = 'Please tick the box to agree to receive The Acoustica Edit.'

/** Sends a sign-up. The full form has a consent box; the footer has a consent line beside its button. */
function useSignup() {
  const [state, setState] = useState<State>({ kind: 'idle' })
  const submit = async (e: FormEvent<HTMLFormElement>, needsBox: boolean) => {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const email = String(data.get('email') ?? '').trim()
    if (!EMAIL.test(email)) return setState({ kind: 'error', message: 'Please enter a valid email address.' })
    if (needsBox && !data.get('consent')) return setState({ kind: 'error', message: CONSENT })
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
      if (body.error === 'consent_required') return setState({ kind: 'error', message: CONSENT })
      setState({ kind: 'error', message: 'We couldn’t sign you up just now. Please try again in a few minutes.' })
    } catch {
      // no Worker (a review copy of the site) or offline
      setState({ kind: 'soon' })
    }
  }
  return { state, submit }
}

const PENDING = 'If this address isn’t already subscribed, we’ve sent an email to confirm it. You’ll only be added once you click the link inside.'

/** Opened from an edition's unsubscribe link: one button, so a mail scanner opening the link changes nothing. */
function Leave({ token }: { token: string }) {
  const [state, setState] = useState<'ask' | 'sending' | 'done' | 'error'>('ask')
  async function leave() {
    setState('sending')
    try {
      const res = await fetch(`/api/newsletter/unsubscribe?t=${encodeURIComponent(token)}`, { method: 'POST' })
      setState(res.ok ? 'done' : 'error')
    } catch {
      setState('error')
    }
  }
  if (state === 'done')
    return (
      <div className="edit__done" role="status">
        <h3>{RETURNS.unsubscribed.title}</h3>
        <p className="muted">{RETURNS.unsubscribed.text}</p>
      </div>
    )
  return (
    <div className="edit__done" role="status">
      <h3>Leave The Acoustica Edit?</h3>
      <p className="muted">
        {state === 'error' ? 'That didn’t work. The link may be out of date: use the one in the latest edition.' : 'You’ll stop getting the weekly email. Nothing else changes.'}
      </p>
      <button className="cta edit__leave" type="button" onClick={leave} disabled={state === 'sending'}>
        <span>{state === 'sending' ? 'Unsubscribing…' : 'Unsubscribe'}</span>
      </button>
    </div>
  )
}

export function AcousticaEdit() {
  const { state, submit } = useSignup()
  const [returned] = useState(() => queryParam('edit'))
  const [token] = useState(() => queryParam('t'))
  const notice = returned ? RETURNS[returned] : undefined
  const leaving = returned === 'leave' && !!token

  // arriving from a confirm or unsubscribe link: bring the message into view
  useEffect(() => {
    if (notice || leaving) document.getElementById('the-acoustica-edit')?.scrollIntoView({ block: 'center' })
  }, [notice, leaving])

  return (
    <section id="the-acoustica-edit" className="edit" aria-labelledby="edit-title">
      <div className="wrap edit__inner">
        <div className="edit__intro">
          <p className="label">Newsletter</p>
          <h2 id="edit-title" className="h1">
            The Acoustica Edit
          </h2>
          <p className="edit__line">The week in sound, light and visuals.</p>
          <p className="muted edit__note">
            Every Monday: the best of the week’s news from around the world, and our newest guides. Free, and one click to leave.
          </p>
        </div>

        {leaving ? (
          <Leave token={token!} />
        ) : notice ? (
          <div className="edit__done" role="status">
            <h3>{notice.title}</h3>
            <p className="muted">{notice.text}</p>
          </div>
        ) : state.kind === 'pending' ? (
          <div className="edit__done" role="status">
            <h3>Check your inbox.</h3>
            <p className="muted">{PENDING}</p>
          </div>
        ) : state.kind === 'soon' ? (
          <div className="edit__done" role="status">
            <h3>Sign-ups open soon.</h3>
            <p className="muted">The Acoustica Edit isn’t taking subscribers just yet. Nothing has been saved. Please come back shortly.</p>
          </div>
        ) : (
          <form className="edit__form" onSubmit={(e) => submit(e, true)} noValidate>
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

/** The footer's one-line sign-up, on every page. */
export function FooterSignup() {
  const { state, submit } = useSignup()
  return (
    <div className="footer-edit">
      <p className="label">The Acoustica Edit</p>
      <p className="footer-edit__line">The week in sound, light and visuals, every Monday.</p>
      {state.kind === 'pending' ? (
        <p className="footer-edit__note" role="status">
          Check your inbox. {PENDING}
        </p>
      ) : state.kind === 'soon' ? (
        <p className="footer-edit__note" role="status">
          Sign-ups open soon. Nothing has been saved.
        </p>
      ) : (
        <form className="footer-edit__form" onSubmit={(e) => submit(e, false)} noValidate>
          <label className="sr-only" htmlFor="footer-edit-email">
            Email
          </label>
          <input id="footer-edit-email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="Your email" required />
          <input className="hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden />
          <button className="cta cta--primary" type="submit" disabled={state.kind === 'sending'}>
            <span>{state.kind === 'sending' ? 'Sending…' : 'Subscribe'}</span>
          </button>
        </form>
      )}
      {state.kind === 'error' && (
        <p className="form__error" role="alert">
          {state.message}
        </p>
      )}
      {state.kind !== 'pending' && state.kind !== 'soon' && (
        <p className="footer-edit__note">
          By subscribing you agree to receive this weekly email. One click to leave. <Link to="/privacy">Privacy notice</Link>
        </p>
      )}
    </div>
  )
}
