import { useEffect, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import { MIN_PASSWORD, api, explain, type Licence, type Me, type Order } from '../account/api'
import { Link } from '../components/Link'
import { PageHead } from '../components/PageHead'
import { Arrow } from '../components/ui'
import { navigate, queryParam } from '../router'

// Customer accounts: licence keys, the computers they're active on, downloads and orders.
// The server side is server/accounts/ (docs/accounts.md).

const NOTICES: Record<string, string> = {
  verified: 'Your email address is confirmed. Welcome.',
  purchased: 'Thank you for your order. Your licence key is below, and on its way by email.',
  link_expired: 'That link has expired or has already been used. Sign in, or ask for a new one.',
  google_failed: 'Signing in with Google didn’t work. Please try again, or use your email and password.',
  google_unavailable: 'Signing in with Google isn’t available yet. Please use your email and password.',
}

function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'error' }) {
  return (
    <p className={tone === 'error' ? 'form__error' : 'notice account__notice'} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  )
}

function Field({ label, hint, ...input }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field">
      <span>
        {label} {hint && <em>{hint}</em>}
      </span>
      <input {...input} />
    </label>
  )
}

/* ─────────────── signed out ─────────────── */

function SignIn({ notice }: { notice: string | null }) {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState('')

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const email = String(f.get('email') || '').trim()
    const password = String(f.get('password') || '')
    setError('')
    if (mode === 'up' && password.length < MIN_PASSWORD) return setError(`Please use at least ${MIN_PASSWORD} characters for your password.`)
    if (mode === 'up' && password !== f.get('confirm')) return setError('The two passwords don’t match.')
    setBusy(true)
    const r = mode === 'in' ? await api.login(email, password) : await api.signup(email, String(f.get('name') || ''), password)
    setBusy(false)
    if (r.ok && r.data.status === 'signed_in') return window.location.reload()
    if (r.ok) return setSent(email)
    setError(explain(r.data.error))
  }

  if (sent)
    return (
      <div className="form-done account__card" role="status">
        <p className="label">One more step</p>
        <h3>Check your email.</h3>
        <p className="muted">
          We’ve sent a link to <strong>{sent}</strong>. Open it to confirm your address and sign in. It works for 24 hours.
        </p>
      </div>
    )

  return (
    <div className="account__card account__auth">
      {notice && NOTICES[notice] && <Notice tone={notice.startsWith('google') || notice === 'link_expired' ? 'error' : 'info'}>{NOTICES[notice]}</Notice>}
      <div className="account__tabs" role="tablist">
        {(['in', 'up'] as const).map((m) => (
          <button key={m} role="tab" type="button" className="chip" aria-pressed={mode === m} aria-selected={mode === m} onClick={() => (setMode(m), setError(''))}>
            {m === 'in' ? 'Sign in' : 'Create an account'}
          </button>
        ))}
      </div>

      <a className="cta account__google" href="/api/account/google">
        <GoogleMark />
        <span>Continue with Google</span>
      </a>
      <p className="account__or" aria-hidden>
        <span>or with your email</span>
      </p>

      <form className="form account__form" onSubmit={submit} key={mode}>
        {mode === 'up' && <Field label="Your name" name="name" autoComplete="name" maxLength={80} />}
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field
          label="Password"
          hint={mode === 'up' ? `at least ${MIN_PASSWORD} characters` : undefined}
          name="password"
          type="password"
          autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
          minLength={mode === 'up' ? MIN_PASSWORD : undefined}
          required
        />
        {mode === 'up' && <Field label="Password, again" name="confirm" type="password" autoComplete="new-password" required />}
        {error && <Notice tone="error">{error}</Notice>}
        <div className="form__foot">
          <button className="cta cta--primary" type="submit" disabled={busy}>
            <span>{busy ? 'One moment…' : mode === 'in' ? 'Sign in' : 'Create account'}</span>
            <Arrow />
          </button>
          {mode === 'in' && (
            <Link to="/account/forgot" className="text-link text-link--quiet">
              Forgotten your password?
            </Link>
          )}
        </div>
        {mode === 'up' && (
          <p className="form__note muted">
            Your account keeps your licence keys, downloads and orders. See our <Link to="/privacy">privacy notice</Link>.
          </p>
        )}
      </form>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.2C12.5 13.6 17.8 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.5 5.8c4.4-4 6.8-10 6.8-17.2z" />
      <path fill="#FBBC05" d="M10.6 28.5c-.5-1.4-.8-2.9-.8-4.5s.3-3.1.8-4.5l-7.9-6.2C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.2z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.2 0-11.5-4.2-13.4-9.9l-7.9 6.2C6.6 42.6 14.6 48 24 48z" />
    </svg>
  )
}

/* ─────────────── signed in ─────────────── */

const date = (seconds: number) => new Date(seconds * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const money = (o: Order) =>
  o.total == null || !o.currency ? '' : new Intl.NumberFormat('en', { style: 'currency', currency: o.currency }).format(o.total / 100)
const size = (bytes: number) => (bytes > 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${Math.max(1, Math.round(bytes / 1e6))} MB`)

function Downloads({ product }: { product: string }) {
  const [state, setState] = useState<'closed' | 'loading' | 'open'>('closed')
  const [files, setFiles] = useState<{ id: number; name: string; size: number }[]>([])
  const [version, setVersion] = useState('')

  async function open() {
    setState('loading')
    const r = await api.downloads(product)
    setFiles(r.ok ? r.data.files : [])
    setVersion(r.data.version ?? '')
    setState('open')
  }

  if (state !== 'open')
    return (
      <button className="cta cta--quiet" type="button" onClick={open} disabled={state === 'loading'}>
        <span>{state === 'loading' ? 'Loading…' : 'Download'}</span>
        <Arrow />
      </button>
    )
  if (!files.length) return <p className="muted account__small">The installers will be here as soon as they’re released.</p>
  return (
    <div className="account__files">
      {version && <p className="label">{version}</p>}
      <ul>
        {files.map((f) => (
          <li key={f.id}>
            <a className="text-link" href={`/api/account/download?product=${encodeURIComponent(product)}&file=${f.id}`}>
              {f.name} <span className="muted">· {size(f.size)}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function LicenceCard({ l, onChange }: { l: Licence; onChange: () => void }) {
  const [copied, setCopied] = useState(false)
  const [removing, setRemoving] = useState('')

  async function copy() {
    try {
      await navigator.clipboard.writeText(l.key)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* the key is selectable */
    }
  }
  async function remove(machine: string, name: string) {
    if (!window.confirm(`Remove ${name} from this licence? ${l.name} on that computer will stop working until it’s activated again.`)) return
    setRemoving(machine)
    await api.removeDevice(l.key, machine)
    setRemoving('')
    onChange()
  }

  return (
    <article className={`account__licence ${l.revoked ? 'is-revoked' : ''}`}>
      <header>
        <h3>{l.name}</h3>
        <p className="muted account__small">
          {l.edition} licence · {date(l.created)}
          {l.expires ? ` · until ${l.expires}` : ''}
          {l.revoked ? ' · refunded, no longer active' : ''}
        </p>
      </header>
      <div className="account__key">
        <code>{l.key}</code>
        {!l.revoked && (
          <button className="chip" type="button" onClick={copy}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
      {!l.revoked && (
        <>
          <div className="account__devices">
            <p className="label">
              Computers · {l.devices.length} of {l.maxDevices}
            </p>
            {l.devices.length ? (
              <ul>
                {l.devices.map((d) => (
                  <li key={d.machine}>
                    <span>
                      {d.name} <span className="muted">· since {date(d.activated)}</span>
                    </span>
                    <button className="text-link text-link--quiet" type="button" disabled={removing === d.machine} onClick={() => remove(d.machine, d.name)}>
                      {removing === d.machine ? 'Removing…' : 'Remove'}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted account__small">Not active anywhere yet. Open {l.name}, choose Activate and paste the key above.</p>
            )}
          </div>
          {l.download && <Downloads product={l.product} />}
        </>
      )}
    </article>
  )
}

function Settings({ me }: { me: Me }) {
  const [msg, setMsg] = useState<{ tone: 'info' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const f = new FormData(form)
    const next = String(f.get('next') || '')
    if (next.length < MIN_PASSWORD) return setMsg({ tone: 'error', text: `Please use at least ${MIN_PASSWORD} characters.` })
    if (next !== f.get('confirm')) return setMsg({ tone: 'error', text: 'The two passwords don’t match.' })
    setBusy(true)
    const r = await api.changePassword(me.user.email, me.user.hasPassword ? String(f.get('current') || '') : null, next)
    setBusy(false)
    if (r.ok) form.reset()
    setMsg(r.ok ? { tone: 'info', text: 'Password saved. You’ve been signed out on your other devices.' } : { tone: 'error', text: explain(r.data.error) })
  }

  return (
    <section className="account__section">
      <h2 className="account__h">Sign-in</h2>
      <p className="muted">
        {me.user.email}
        {me.user.google ? ' · linked to Google' : ''}
      </p>
      <form className="form account__form" onSubmit={submit}>
        <p className="label">{me.user.hasPassword ? 'Change your password' : 'Add a password'}</p>
        {me.user.hasPassword && <Field label="Current password" name="current" type="password" autoComplete="current-password" required />}
        <Field label="New password" hint={`at least ${MIN_PASSWORD} characters`} name="next" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} required />
        <Field label="New password, again" name="confirm" type="password" autoComplete="new-password" required />
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        <div className="form__foot">
          <button className="cta" type="submit" disabled={busy}>
            <span>{busy ? 'Saving…' : 'Save password'}</span>
          </button>
        </div>
      </form>
    </section>
  )
}

function Dashboard({ me, notice, reload }: { me: Me; notice: string | null; reload: () => void }) {
  async function signOut() {
    await api.logout()
    window.location.reload()
  }
  const first = me.user.name?.split(' ')[0]
  return (
    <div className="account__dash">
      {notice && NOTICES[notice] && <Notice tone={notice === 'link_expired' || notice.startsWith('google') ? 'error' : 'info'}>{NOTICES[notice]}</Notice>}
      <div className="account__bar">
        <p className="lede">{first ? `Hello, ${first}.` : 'Hello.'}</p>
        <span className="account__links">
          {me.user.admin && (
            <Link to="/account/admin" className="text-link">
              Admin
            </Link>
          )}
          <button className="text-link" type="button" onClick={signOut}>
            Sign out
          </button>
        </span>
      </div>

      <section className="account__section">
        <h2 className="account__h">Your software</h2>
        {me.licences.length ? (
          <div className="account__licences">
            {me.licences.map((l) => (
              <LicenceCard key={l.key} l={l} onChange={reload} />
            ))}
          </div>
        ) : (
          <div className="coming-soon">
            <p className="label">Nothing here yet</p>
            <p>
              When you buy software from us, its licence key and downloads appear here. Bought with another email address? Sign in with that one.
            </p>
            <Link to="/shop" className="text-link">
              Visit the shop <Arrow />
            </Link>
          </div>
        )}
      </section>

      {me.orders.length > 0 && (
        <section className="account__section">
          <h2 className="account__h">Orders</h2>
          <div className="account__orders" role="table" aria-label="Your orders">
            {me.orders.map((o) => (
              <div className="account__order" role="row" key={o.id}>
                <span role="cell">{date(o.created)}</span>
                <span role="cell">{o.items.map((i) => (i.quantity > 1 ? `${i.name} × ${i.quantity}` : i.name)).join(', ')}</span>
                <span role="cell" className="muted">
                  {o.invoice ? `Invoice ${o.invoice}` : ''}
                </span>
                <span role="cell">{o.status === 'refunded' ? 'Refunded' : money(o)}</span>
              </div>
            ))}
          </div>
          <p className="muted account__small">Payments are handled by Paddle, our reseller: your receipts and invoices come from them by email.</p>
        </section>
      )}

      <Settings me={me} />
    </div>
  )
}

export function AccountPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [state, setState] = useState<'loading' | 'in' | 'out' | 'down'>('loading')
  const [notice] = useState(() => queryParam('notice'))

  const load = () =>
    api.me().then((r) => {
      if (r.ok) {
        setMe(r.data)
        setState('in')
      } else setState(r.status === 401 ? 'out' : 'down')
    })
  useEffect(() => {
    void load()
    // drop ?notice= from the address so a reload doesn't show it again
    if (notice) window.history.replaceState(null, '', window.location.href.replace(/[?&]notice=[^&#]*/, ''))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <PageHead label="Your account" title={state === 'in' ? 'Your account' : 'Sign in'}>
        {state === 'in' ? 'Licence keys, downloads and orders for the software you’ve bought from us.' : 'Your licence keys, downloads and orders, in one place.'}
      </PageHead>
      <div className="wrap account">
        {state === 'loading' && <p className="muted">Loading…</p>}
        {state === 'down' && <Notice tone="error">{explain('not_configured')}</Notice>}
        {state === 'out' && <SignIn notice={notice} />}
        {state === 'in' && me && <Dashboard me={me} notice={notice} reload={load} />}
      </div>
    </>
  )
}

export function ForgotPage() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    const r = await api.forgot(String(new FormData(e.currentTarget).get('email') || '').trim())
    setBusy(false)
    if (r.ok) setSent(true)
    else setError(explain(r.data.error))
  }

  return (
    <>
      <PageHead label="Your account" title="Forgotten your password?">
        Enter your email address and we’ll send you a link to choose a new one.
      </PageHead>
      <div className="wrap account">
        <div className="account__card">
          {sent ? (
            <div className="form-done" role="status">
              <p className="label">Sent</p>
              <h3>Check your email.</h3>
              <p className="muted">If there’s an account for that address, a link to reset its password is on its way. It works for an hour.</p>
            </div>
          ) : (
            <form className="form account__form" onSubmit={submit}>
              <Field label="Email" name="email" type="email" autoComplete="email" required />
              {error && <Notice tone="error">{error}</Notice>}
              <div className="form__foot">
                <button className="cta cta--primary" type="submit" disabled={busy}>
                  <span>{busy ? 'Sending…' : 'Send the link'}</span>
                  <Arrow />
                </button>
                <Link to="/account" className="text-link text-link--quiet">
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  )
}

export function ResetPage() {
  const [token] = useState(() => queryParam('token') || '')
  const [email, setEmail] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.resetInfo(token).then((r) => (r.ok ? setEmail(r.data.email) : setError(explain(r.data.error))))
  }, [token])

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const password = String(f.get('password') || '')
    if (password.length < MIN_PASSWORD) return setError(`Please use at least ${MIN_PASSWORD} characters.`)
    if (password !== f.get('confirm')) return setError('The two passwords don’t match.')
    setBusy(true)
    const r = await api.reset(token, email!, password)
    setBusy(false)
    if (r.ok) navigate('/account')
    else setError(explain(r.data.error))
  }

  return (
    <>
      <PageHead label="Your account" title="Choose a new password" />
      <div className="wrap account">
        <div className="account__card">
          {email ? (
            <form className="form account__form" onSubmit={submit}>
              <p className="muted">For {email}. This signs you out everywhere else.</p>
              <Field label="New password" hint={`at least ${MIN_PASSWORD} characters`} name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} required />
              <Field label="New password, again" name="confirm" type="password" autoComplete="new-password" required />
              {error && <Notice tone="error">{error}</Notice>}
              <div className="form__foot">
                <button className="cta cta--primary" type="submit" disabled={busy}>
                  <span>{busy ? 'Saving…' : 'Save and sign in'}</span>
                  <Arrow />
                </button>
              </div>
            </form>
          ) : error ? (
            <>
              <Notice tone="error">{error}</Notice>
              <p>
                <Link to="/account/forgot" className="text-link">
                  Send a new link <Arrow />
                </Link>
              </p>
            </>
          ) : (
            <p className="muted">Checking your link…</p>
          )}
        </div>
      </div>
    </>
  )
}
