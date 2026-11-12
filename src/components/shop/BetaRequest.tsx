import { useState, type FormEvent } from 'react'
import { api, explain } from '../../account/api'
import type { Software } from '../../content/shop'
import { Link } from '../Link'
import { Arrow } from '../ui'

/** "Request free beta access": the owner approves each request on the admin page. */
export function BetaRequest({ p }: { p: Software }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  if (!p.beta) return null

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const v = (k: string) => String(f.get(k) || '')
    setBusy(true)
    setError('')
    const r = await api.requestBeta({ product: p.id, name: v('name'), email: v('email'), about: v('about'), system: v('system'), daw: v('daw'), _gotcha: v('_gotcha') })
    setBusy(false)
    if (r.ok) setDone(true)
    else setError(explain(r.data.error))
  }

  return (
    <section className="beta-request" aria-labelledby="beta-request-title">
      <p className="label">Free beta</p>
      <h2 id="beta-request-title" className="beta-request__title">
        Test {p.name} before it launches.
      </h2>
      <p className="muted">{p.beta.line}</p>
      {done ? (
        <p className="notice account__notice" role="status">
          Thank you. Your request is in, and we’ve sent you a confirmation. If you’re chosen, your beta key arrives by email.
        </p>
      ) : !open ? (
        <button className="cta" type="button" onClick={() => setOpen(true)}>
          <span>Request beta access</span>
          <Arrow />
        </button>
      ) : (
        <form className="form account__form beta-request__form" onSubmit={submit} noValidate>
          <div className="form__grid">
            <label className="field">
              <span>Your name</span>
              <input name="name" autoComplete="name" maxLength={80} required />
            </label>
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label className="field">
              <span>Your computer</span>
              <select name="system" defaultValue="">
                <option value="" disabled>
                  Choose…
                </option>
                <option>macOS, Apple Silicon</option>
                <option>macOS, Intel</option>
                <option>Windows</option>
              </select>
            </label>
            <label className="field">
              <span>
                DAW <em>e.g. Ableton Live, FL Studio</em>
              </span>
              <input name="daw" maxLength={80} />
            </label>
          </div>
          <label className="field field--wide">
            <span>What do you make?</span>
            <textarea name="about" rows={3} maxLength={2000} placeholder="Genres, what you'd use it for, a link to your music if you like" />
          </label>
          <input className="hp" type="text" name="_gotcha" tabIndex={-1} autoComplete="off" aria-hidden />
          {error && (
            <p className="form__error" role="alert">
              {error}
            </p>
          )}
          <div className="form__foot">
            <button className="cta cta--primary" type="submit" disabled={busy}>
              <span>{busy ? 'Sending…' : 'Send my request'}</span>
              <Arrow />
            </button>
            <p className="form__note muted">
              Free, no payment details. We use your details only for the beta. See our <Link to="/privacy">privacy notice</Link>.
            </p>
          </div>
        </form>
      )}
    </section>
  )
}
