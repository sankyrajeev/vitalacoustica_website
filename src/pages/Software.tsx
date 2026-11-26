import { useState } from 'react'
import { ComingSoon } from '../components/shop/ComingSoon'
import { SoftwareFeature } from '../components/shop/SoftwareFeature'
import { Cta, Label } from '../components/ui'
import { products, SOFTWARE_AREAS, STATUS_ORDER, statusOf, type Software } from '../content/shop'
import { href, queryParam } from '../router'

// The software side of Vital Acoustica: what's out, full size with its interface; what's being
// made, in a quiet list below. Audio and Lighting narrow it down (/software?area=lighting).

type Area = 'all' | (typeof SOFTWARE_AREAS)[number]['id']

const software = products.filter((p): p is Software => p.kind === 'software' && !p.sample)

function useArea(): [Area, (a: Area) => void] {
  const read = (): Area => {
    const a = queryParam('area')
    return SOFTWARE_AREAS.some((x) => x.id === a) ? (a as Area) : 'all'
  }
  const [area, set] = useState(read)
  const choose = (a: Area) => {
    set(a)
    window.history.replaceState(null, '', href(a === 'all' ? '/software' : `/software?area=${a}`))
  }
  return [area, choose]
}

export function SoftwareIndex() {
  const [area, choose] = useArea()
  const shown = software
    .filter((p) => area === 'all' || p.area === area)
    .sort((a, b) => STATUS_ORDER[statusOf(a)] - STATUS_ORDER[statusOf(b)])
  const out = shown.filter((p) => statusOf(p) !== 'soon')
  const soon = shown.filter((p) => statusOf(p) === 'soon')
  const areas: { id: Area; title: string; count: number }[] = [
    { id: 'all', title: 'All', count: software.length },
    ...SOFTWARE_AREAS.map((a) => ({ id: a.id, title: a.title, count: software.filter((p) => p.area === a.id).length })),
  ]

  return (
    <>
      <header className="page-head wrap software-head">
        <Label>Software</Label>
        <h1 className="display display--sm">Instruments and tools for sound and light</h1>
        <p className="lede">Software for artists and audio engineers, made by the people who run the show.</p>
        <nav className="shop-areas software-head__areas" aria-label="Software">
          {areas.map((a) => (
            <button key={a.id} type="button" aria-pressed={area === a.id} onClick={() => choose(a.id)}>
              {a.title}
              <span>{a.count}</span>
            </button>
          ))}
        </nav>
      </header>

      <section className="section section--tight shop-section software-range" aria-label={area === 'all' ? 'Our software' : `${area === 'audio' ? 'Audio' : 'Lighting'} software`}>
        <div className="wrap">
          {out.length ? (
            out.map((p) => <SoftwareFeature key={p.id} p={p} />)
          ) : (
            <p className="shop-section__empty">Nothing out in {area} software yet. Here’s what we’re making.</p>
          )}
          <ComingSoon items={soon} />
        </div>
      </section>

      <section className="section section--solid" aria-labelledby="software-how">
        <div className="wrap">
          <header className="section-head">
            <Label>How it works</Label>
            <h2 id="software-how" className="h1">
              From beta key to your studio
            </h2>
          </header>
          <ol className="steps">
            <li>
              <span className="steps__n">01</span>
              <strong>Join a beta</strong>
              <p>Tell us a little about yourself on the product’s page. If you’re in, your key and the download arrive by email.</p>
            </li>
            <li>
              <span className="steps__n">02</span>
              <strong>Your account</strong>
              <p>Keys, downloads and the computers you’ve activated live in your Vital Acoustica account, under the same email.</p>
            </li>
            <li>
              <span className="steps__n">03</span>
              <strong>Works offline</strong>
              <p>Activate once and it runs without the internet. One licence covers two computers, and you can move it whenever you like.</p>
            </li>
          </ol>
          <div className="software-how__actions">
            <Cta to="/account" variant="quiet">
              Your account
            </Cta>
          </div>
        </div>
      </section>
    </>
  )
}
