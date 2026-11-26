import { navigate } from '../../router'

// Paddle.js, loaded once and only when a checkout opens: from a Buy button (Buy.tsx), or from a
// Paddle checkout link that lands on the site (App.tsx).

// Paddle's client-side token is public by design (it can only open checkouts). Set it when building:
// VITE_PADDLE_CLIENT_TOKEN=live_… (or test_… with VITE_PADDLE_ENV=sandbox). See docs/accounts.md.
export const PADDLE_TOKEN = (import.meta.env.VITE_PADDLE_CLIENT_TOKEN as string | undefined) ?? ''
const PADDLE_SANDBOX = import.meta.env.VITE_PADDLE_ENV === 'sandbox'

type PaddleGlobal = {
  Environment: { set: (env: string) => void }
  Initialize: (o: { token: string; eventCallback?: (e: { name: string }) => void }) => void
  Checkout: {
    open: (o: {
      items?: { priceId: string; quantity: number }[]
      transactionId?: string
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
export function loadPaddle() {
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

/**
 * A checkout link from Paddle (an invoice, or a link made in Paddle's dashboard) arrives as
 * …?_ptxn=txn_… on the default payment link: open that transaction's checkout over the page.
 */
export async function openPaddleLink(transactionId: string) {
  if (!PADDLE_TOKEN) return
  const P = await loadPaddle()
  P.Checkout.open({ transactionId, settings: { displayMode: 'overlay', theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark' } })
}
