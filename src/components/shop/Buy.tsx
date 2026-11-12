import { useEffect, useState, type FormEvent } from 'react'
import { api, explain } from '../../account/api'
import { price, type Product } from '../../content/shop'
import { navigate } from '../../router'
import { Arrow } from '../ui'

// Paddle's client-side token is public by design (it can only open checkouts). Set it when building:
// VITE_PADDLE_CLIENT_TOKEN=live_… (or test_… with VITE_PADDLE_ENV=sandbox). See docs/accounts.md.
const PADDLE_TOKEN = (import.meta.env.VITE_PADDLE_CLIENT_TOKEN as string | undefined) ?? ''
const PADDLE_SANDBOX = import.meta.env.VITE_PADDLE_ENV === 'sandbox'

type PaddleGlobal = {
  Environment: { set: (env: string) => void }
  Initialize: (o: { token: string; eventCallback?: (e: { name: string }) => void }) => void
  Checkout: {
    open: (o: {
      items: { priceId: string; quantity: number }[]
      customer?: { email: string }
      customData?: Record<string, string>
      settings?: Record<string, unknown>
    }) => void
  }
}
declare global {
  interface Window {
    Paddle?: PaddleGlobal
  }
}

let paddleReady: Promise<PaddleGlobal> | null = null
function loadPaddle() {
  paddleReady ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://cdn.paddle.com/paddle/v2/paddle.js'
    s.async = true
    s.onload = () => {
      const P = window.Paddle
      if (!P) return reject(new Error('Paddle did not load'))
      if (PADDLE_SANDBOX) P.Environment.set('sandbox')
      P.Initialize({
        token: PADDLE_TOKEN,
        eventCallback: (e) => {
          if (e.name === 'checkout.completed') setTimeout(() => navigate('/account?notice=purchased'), 2500)
        },
      })
      resolve(P)
    }
    s.onerror = () => {
      paddleReady = null
      reject(new Error('Paddle did not load'))
    }
    document.head.appendChild(s)
  })
  return paddleReady
}

// Gumroad's checkout script, added once and only when a digital product is on sale.
// It turns links to Gumroad products into a checkout that opens over our page.
function useGumroad(on: boolean) {
  useEffect(() => {
    if (!on || document.querySelector('script[data-gumroad]')) return
    const s = document.createElement('script')
    s.src = 'https://gumroad.com/js/gumroad.js'
    s.async = true
    s.dataset.gumroad = ''
    document.body.appendChild(s)
  }, [on])
}

/** Software sold through Paddle: the licence key joins the buyer's account when they're signed in. */
function PaddleBuy({ p, priceId }: { p: Product; priceId: string }) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function open() {
    setBusy(true)
    setFailed(false)
    try {
      const [P, me] = await Promise.all([loadPaddle(), api.me()])
      P.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        ...(me.ok ? { customer: { email: me.data.user.email }, customData: { user_id: me.data.user.id } } : {}),
        settings: { displayMode: 'overlay', theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark' },
      })
    } catch {
      setFailed(true)
    }
    setBusy(false)
  }

  return (
    <div className="buy">
      <button className="cta cta--primary" type="button" onClick={open} disabled={busy}>
        <span>{busy ? 'Opening checkout…' : `Buy · ${price(p)}`}</span>
        <Arrow />
      </button>
      {failed && (
        <p className="form__error" role="alert">
          The checkout couldn’t open. Please check your connection and try again.
        </p>
      )}
      <p className="muted buy__note">Instant licence key by email and in your account. Payments by Paddle.</p>
    </div>
  )
}

/** Buy button, or "launching soon" with a way to hear when it's out. `option` is e.g. "Black, M". */
export function Buy({ p, option }: { p: Product; option?: string }) {
  const digital = p.kind !== 'merch'
  const paddlePrice = p.kind === 'software' && PADDLE_TOKEN ? p.paddlePrice : undefined
  useGumroad(digital && !!p.checkout && !paddlePrice)

  if (paddlePrice) return <PaddleBuy p={p} priceId={paddlePrice} />

  if (!p.checkout) return <NotifyMe p={p} option={option} />

  return (
    <div className="buy">
      <a
        className="cta cta--primary"
        href={p.checkout}
        target="_blank"
        rel="noopener noreferrer"
        {...(digital ? { 'data-gumroad-overlay-checkout': 'true' } : {})}
      >
        <span>
          {digital ? 'Buy' : 'Order'} · {price(p)}
        </span>
        <Arrow />
      </a>
    </div>
  )
}

/** Not on sale yet: "Launching soon", and an email sign-up for one message when it's out. */
function NotifyMe({ p, option }: { p: Product; option?: string }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setBusy(true)
    setError('')
    const r = await api.notifyMe({ product: p.id, email: String(f.get('email') || ''), detail: option ?? '', _gotcha: String(f.get('_gotcha') || '') })
    setBusy(false)
    if (r.ok) setDone(true)
    else setError(['unavailable', 'unreachable', 'not_configured'].includes(r.data.error ?? '') ? 'We couldn’t save that just now. Please try again later.' : explain(r.data.error))
  }

  return (
    <div className="buy buy--soon">
      <span className="cta cta--disabled" aria-disabled="true">
        <span>Launching soon</span>
      </span>
      {done ? (
        <p className="notify__done" role="status">
          You’re on the list. We’ll email you once, when it’s out.
        </p>
      ) : !open ? (
        <button className="text-link notify__open" type="button" onClick={() => setOpen(true)}>
          Tell me when it’s out <Arrow />
        </button>
      ) : (
        <form className="notify" onSubmit={submit} noValidate>
          <label className="field notify__field">
            <span>Your email{option ? ` · ${option}` : ''}</span>
            <input name="email" type="email" autoComplete="email" required autoFocus placeholder="you@example.com" />
          </label>
          <input className="hp" type="text" name="_gotcha" tabIndex={-1} autoComplete="off" aria-hidden />
          <button className="cta cta--primary" type="submit" disabled={busy}>
            <span>{busy ? 'Saving…' : 'Notify me'}</span>
          </button>
          <p className="notify__note muted">One email when it launches. Nothing else.</p>
          {error && (
            <p className="form__error notify__error" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  )
}
