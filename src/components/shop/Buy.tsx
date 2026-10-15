import { useEffect } from 'react'
import { price, type Product } from '../../content/shop'
import { site } from '../../content/site'
import { Arrow } from '../ui'

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

/** Buy button, or "coming soon" with a way to hear when it's out. `option` is e.g. "Black, M". */
export function Buy({ p, option }: { p: Product; option?: string }) {
  const digital = p.kind !== 'merch'
  useGumroad(digital && !!p.checkout)

  if (!p.checkout) {
    const text = `Hi Vital Acoustica, please let me know when ${p.name}${option ? ` (${option})` : ''} is available.`
    return (
      <div className="buy">
        <span className="cta cta--disabled" aria-disabled="true">
          <span>Coming soon · {price(p)}</span>
        </span>
        <a
          className="text-link"
          href={`https://wa.me/${site.contact.whatsapp}?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Tell me when it’s out <Arrow />
        </a>
      </div>
    )
  }

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
