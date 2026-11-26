import { useEffect, useState, type FormEvent } from 'react'
import { api, explain, type Licence, type Me } from '../../account/api'
import type { Software } from '../../content/shop'
import { queryParam, scrollToId } from '../../router'
import { Link } from '../Link'
import { Arrow } from '../ui'

const today = () => new Date().toISOString().slice(0, 10)

/** A beta (or full) licence for this product that still works. */
const access = (me: Me | null, product: string): Licence | undefined =>
  me?.licences.find((l) => l.product === product && !l.revoked && (!l.expires || l.expires >= today()))

const longDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

/**
 * "Request free beta access": the owner approves each request on the admin page. Someone signed
 * in who already has a key for this product sees that instead, with the way to their download.
 */
export function BetaRequest({ p }: { p: Software }) {
  // arriving from "Request beta access" elsewhere (/software/vanta?beta=1): the form, open and in view
  const [open, setOpen] = useState(() => queryParam('beta') === '1')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [me, setMe] = useState<Me | null>(null)
  useEffect(() => {
    // signed out (or no accounts on this copy of the site): the request form as usual
    void api.me().then((r) => r.ok && setMe(r.data))
    if (queryParam('beta') === '1') setTimeout(() => scrollToId('beta-access'), 300)
    // the hero's "Request beta access" button opens the form
    const openForm = () => setOpen(true)
    window.addEventListener('vanta:request-beta', openForm)
    return () => window.removeEventListener('vanta:request-beta', openForm)
  }, [])
  if (!p.beta) return null

  const has = access(me, p.id)
  if (has)
    return (
      <section id="beta-access" className="beta-request" aria-labelledby="beta-request-title">
        <p className="label">{has.edition === 'Beta' ? 'Free beta' : 'Your licence'}</p>
        <h2 id="beta-request-title" className="beta-request__title">
          {has.edition === 'Beta' ? `You’re in the ${p.name} beta.` : `You already own ${p.name}.`}
        </h2>
        <p className="muted">
          {has.edition === 'Beta'
            ? `You already have access${has.expires ? ` until ${longDate(has.expires)}` : ''}, so there’s nothing to request. Your key and the latest beta download are in your account.`
            : 'Your key and the latest download are in your account.'}
        </p>
        <Link to="/account" className="cta cta--primary">
          <span>Download and your key</span>
          <Arrow />
        </Link>
      </section>
    )

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const v = (k: string) => String(f.get(k) || '')
    setBusy(true)
    setError('')
    const r = await api.requestBeta({ product: p.id, name: v('name'), email: v('email'), about: v('about'), system: v('system'), daw: v('daw'), _gotcha: v('_gotcha') })
    setBusy(false)
    if (r.ok) setDone(true)
    else
      setError(
        ['unavailable', 'unreachable', 'not_configured'].includes(r.data.error ?? '')
          ? 'We couldn’t send your request just now. Please try again in a few minutes.'
          : explain(r.data.error),
      )
  }

  return (
    <section id="beta-access" className="beta-request" aria-labelledby="beta-request-title">
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
              <input name="name" autoComplete="name" maxLength={80} required defaultValue={me?.user.name ?? ''} />
            </label>
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" autoComplete="email" required defaultValue={me?.user.email ?? ''} />
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
