import { useState } from 'react'
import { Link } from '../components/Link'
import { AudioPreview, DemoTrack } from '../components/shop/AudioPreview'
import PEAKS from '../content/audio-peaks.json'
import { AudioCover, GarmentMock, LoopPreview, SoftwareCover } from '../components/shop/Art'
import { BetaRequest } from '../components/shop/BetaRequest'
import { Buy } from '../components/shop/Buy'
import { Arrow, Label } from '../components/ui'
import { price, products, SECTIONS, SOFTWARE_AREAS, STATUS_ORDER, sectionOf, statusOf, type Product, type ShopKind } from '../content/shop'
import { href, queryParam } from '../router'
import { NotFound } from './NotFound'

function Art({ p, colour, view }: { p: Product; colour?: number; view?: string }) {
  if (p.kind === 'software') {
    const shot = view ? p.screenshots?.find((s) => s.src === view) : undefined
    if (shot) return <img className="cover cover--screen" src={`${import.meta.env.BASE_URL}${shot.src}`} alt={shot.caption} />
    return <SoftwareCover p={p} />
  }
  if (p.kind === 'audio') return <AudioCover p={p} />
  if (p.kind === 'loops') return <LoopPreview p={p} />
  const photo = view ?? p.photo
  if (photo) return <img className="cover cover--photo" src={`${import.meta.env.BASE_URL}${photo}`} alt="" loading="lazy" />
  return <GarmentMock p={p} colour={p.colours[colour ?? 0]} />
}

const STATUS_LABEL = { available: 'Available', beta: 'Free beta', soon: 'Coming soon' } as const

function ProductCard({ p }: { p: Product }) {
  const status = statusOf(p)
  return (
    <article className={`shop-card is-${status}`}>
      <div className="shop-card__media">
        <Link to={`/shop/${p.id}`} aria-label={`${p.name}: details`}>
          <Art p={p} />
        </Link>
        {p.kind === 'audio' && (
          <div className="shop-card__player">
            <AudioPreview p={p} compact />
          </div>
        )}
        {p.sample && <span className="shop-card__sample">Sample</span>}
      </div>
      <div className="shop-card__body">
        <h3 className="shop-card__name">
          <Link to={`/shop/${p.id}`}>{p.name}</Link>
        </h3>
        {p.kind === 'software' && <p className="shop-card__type">{p.type}</p>}
        <p className="shop-card__tagline">{p.tagline}</p>
        <p className="shop-card__foot">
          {status === 'available' ? (
            <span className="shop-card__price">{price(p)}</span>
          ) : (
            <span className={`shop-status shop-status--${status}`}>{STATUS_LABEL[status]}</span>
          )}
          <Link to={`/shop/${p.id}`} className="text-link">
            {status === 'available' ? 'Buy' : status === 'beta' ? 'Join the beta' : 'Details'} <Arrow />
          </Link>
        </p>
      </div>
    </article>
  )
}

type Shelf = ShopKind
type Area = (typeof SOFTWARE_AREAS)[number]['id']

/** The shelf and software area in the address (/shop?section=software&area=lighting), so links and Back work. */
function useShelf(): [Shelf, Area, (s: Shelf, a?: Area) => void] {
  const read = (): [Shelf, Area] => {
    const s = queryParam('section')
    const a = queryParam('area')
    return [SECTIONS.some((x) => x.kind === s) ? (s as Shelf) : 'software', a === 'lighting' ? 'lighting' : 'audio']
  }
  const [[shelf, area], set] = useState(read)
  const choose = (s: Shelf, a: Area = 'audio') => {
    set([s, a])
    const q = s === 'software' ? (a === 'audio' ? '' : `?section=software&area=${a}`) : `?section=${s}`
    window.history.replaceState(null, '', href(`/shop${q}`))
  }
  return [shelf, area, choose]
}

export function ShopIndex() {
  const [shelf, area, choose] = useShelf()
  const section = sectionOf(shelf)
  const shown = products
    .filter((p) => p.kind === shelf && (p.kind !== 'software' || p.area === area))
    .sort((a, b) => STATUS_ORDER[statusOf(a)] - STATUS_ORDER[statusOf(b)])

  return (
    <>
      <header className="page-head wrap shop-head">
        <Label>Shop</Label>
        <nav className="shop-shelves" aria-label="Shop">
          {SECTIONS.map((s) => (
            <button key={s.kind} type="button" className="shop-shelves__item" aria-pressed={shelf === s.kind} onClick={() => choose(s.kind)}>
              {s.title}
            </button>
          ))}
        </nav>
        {shelf === 'software' && (
          <nav className="shop-areas" aria-label="Software">
            {SOFTWARE_AREAS.map((a) => (
              <button key={a.id} type="button" aria-pressed={area === a.id} onClick={() => choose('software', a.id)}>
                {a.title}
                <span>{products.filter((p) => p.kind === 'software' && p.area === a.id).length}</span>
              </button>
            ))}
          </nav>
        )}
      </header>

      <section className="section section--tight shop-section" aria-label={shelf === 'software' ? `${area === 'audio' ? 'Audio' : 'Lighting'} software` : section.title}>
        <div className="wrap">
          <div className={`shop-grid shop-grid--${shelf}`} key={`${shelf}-${area}`}>
            {shown.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
          <p className="shop-section__note">{section.note}</p>
        </div>
      </section>

      <section className="section section--solid" aria-labelledby="shop-how">
        <div className="wrap">
          <header className="section-head">
            <Label>How buying works</Label>
            <h2 id="shop-how" className="h1">
              Simple, wherever you are.
            </h2>
          </header>
          <ol className="steps">
            <li>
              <span className="steps__n">01</span>
              <strong>Packs and loops</strong>
              <p>
                Pay by card, PayPal or UPI. Your download link arrives by email straight away, and you can download again any
                time.
              </p>
            </li>
            <li>
              <span className="steps__n">02</span>
              <strong>Software</strong>
              <p>
                Download the installer and get a licence key by email. Activate it once in the plugin or app; after that it works
                offline.
              </p>
            </li>
            <li>
              <span className="steps__n">03</span>
              <strong>Merch</strong>
              <p>Each piece is printed when you order it and shipped across India, usually within a week.</p>
            </li>
            <li>
              <span className="steps__n">04</span>
              <strong>Licence</strong>
              <p>
                Use the sounds in your tracks and sets, and the loops in your shows and streams, royalty-free. Just don’t resell
                them as they are.
              </p>
            </li>
            <li>
              <span className="steps__n">05</span>
              <strong>Questions</strong>
              <p>Something not right with an order? Message us on WhatsApp and we’ll sort it out.</p>
            </li>
          </ol>
        </div>
      </section>
    </>
  )
}

export function ShopItem({ id }: { id: string }) {
  const p = products.find((x) => x.id === id)
  const [colour, setColour] = useState(0)
  const [size, setSize] = useState<string | null>(null)
  const [view, setView] = useState<string | undefined>(undefined)
  if (!p) return <NotFound />
  const views =
    p.kind === 'merch' && p.photo && p.gallery ? [p.photo, ...p.gallery] : p.kind === 'software' && p.screenshots ? p.screenshots.map((s) => s.src) : []
  const shot = p.kind === 'software' ? p.screenshots?.find((s) => s.src === (view && views.includes(view) ? view : views[0])) : undefined
  // a view picked on another product's page doesn't carry over
  const shown = view && views.includes(view) ? view : views[0]
  const section = sectionOf(p.kind)
  const more = products.filter((x) => x.kind === p.kind && x.id !== p.id).slice(0, 3)
  const option = p.kind === 'merch' ? [p.colours[colour].name, size].filter(Boolean).join(', ') : undefined

  return (
    <article className="gear-detail shop-item">
      <div className="wrap">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/shop">Shop</Link>
          <span aria-hidden>/</span>
          <Link to={p.kind === 'software' ? (p.area === 'audio' ? '/shop' : '/shop?section=software&area=lighting') : `/shop?section=${p.kind}`}>
            {p.kind === 'software' ? `${section.title} · ${p.area === 'audio' ? 'Audio' : 'Lighting'}` : section.title}
          </Link>
        </nav>
      </div>

      <div className="wrap gear-detail__grid">
        <div className="gear-detail__figure">
        <figure className="shop-item__figure">
          <Art p={p} colour={colour} view={shown} />
          {views.length > 1 && (
            <div className={`shop-item__views ${p.kind === 'software' ? 'shop-item__views--screens' : ''}`}>
              {views.map((v, i) => (
                <button
                  key={v}
                  className={shown === v ? 'is-on' : ''}
                  onClick={() => setView(v)}
                  aria-label={p.kind === 'software' ? (p.screenshots?.[i].caption ?? `Screenshot ${i + 1}`) : i === 0 ? 'Main view' : `View ${i + 1}`}
                  aria-pressed={shown === v}
                >
                  <img src={`${import.meta.env.BASE_URL}${v}`} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
          {p.kind === 'audio' && <AudioPreview p={p} />}
          <figcaption className="muted">
            {p.sample
              ? p.kind === 'audio'
                ? 'Sample product. The preview is a stand-in made in your browser.'
                : p.kind === 'loops'
                  ? 'Sample product. The preview is drawn live in your browser.'
                  : 'Sample product. Mock-up of the design.'
              : p.kind === 'merch' && !p.checkout
                ? 'Mock-up of the design. Launching soon.'
                : shot
                  ? shot.caption
                  : p.kind === 'software' && !p.checkout
                  ? 'Cover artwork. Screenshots to follow. Launching soon.'
                  : section.note}
          </figcaption>
        </figure>
          {p.kind === 'software' && p.demos && (
            <div className="shop-demos">
              <p className="label">Hear it · every sound is VANTA, drums included</p>
              {p.demos.map((d) => {
                const wave = (PEAKS as Record<string, { peaks: number[]; length: number } | undefined>)[d.src]
                return wave ? <DemoTrack key={d.src} src={d.src} title={d.title} detail={d.detail} peaks={wave.peaks} length={wave.length} /> : null
              })}
            </div>
          )}
        </div>

        <div className="gear-detail__info">
          <p className="gear-card__meta">
            <span>{section.title}</span>
            {p.kind === 'software' && <span>{p.type}</span>}
            {p.sample && <span>Sample</span>}
          </p>
          <h1 className="display display--sm gear-detail__name">{p.name}</h1>
          <p className="lede">{p.description}</p>
          {p.checkout && <p className="shop-item__price">{price(p)}</p>}

          {p.kind === 'merch' && (
            <div className="options">
              <fieldset>
                <legend>Colour: {p.colours[colour].name}</legend>
                <div className="swatches">
                  {p.colours.map((c, i) => (
                    <button
                      key={c.name}
                      className={`swatch ${i === colour ? 'is-on' : ''}`}
                      style={{ background: c.hex }}
                      onClick={() => setColour(i)}
                      aria-label={c.name}
                      aria-pressed={i === colour}
                    />
                  ))}
                </div>
              </fieldset>
              {p.sizes.length > 1 && (
                <fieldset>
                  <legend>Size{size ? `: ${size}` : ''}</legend>
                  <div className="sizes">
                    {p.sizes.map((s) => (
                      <button
                        key={s}
                        className={`size ${s === size ? 'is-on' : ''}`}
                        onClick={() => setSize(s)}
                        aria-pressed={s === size}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
            </div>
          )}

          <Buy p={p} option={option} />
          {p.kind === 'software' && <BetaRequest p={p} />}

          {p.kind === 'software' && (
            <div className="shop-item__contents shop-item__features">
              <p className="label">What it does</p>
              <ul>
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {p.kind === 'audio' && (
            <div className="shop-item__contents">
              <p className="label">Inside</p>
              <ul>
                {p.contents.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          <dl className="spec-table">
            {p.specs.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
            {p.kind === 'merch' && (
              <div>
                <dt>Sizes</dt>
                <dd>{p.sizes.join(' · ')}</dd>
              </div>
            )}
          </dl>
          <p className="fineprint">
            {section.note}
            {p.kind === 'merch' ? ' Prices include GST.' : ' Prices in US dollars; tax is added at checkout where it applies.'}
          </p>
          {p.kind === 'software' && p.notice && <p className="fineprint">{p.notice}</p>}
        </div>
      </div>

      {p.kind === 'software' && p.story && (
        <section className="wrap product-story" aria-labelledby="story-title">
          <header className="product-story__head">
            <Label>Inside {p.name}</Label>
            <h2 id="story-title" className="h1">
              {p.tagline}
            </h2>
          </header>
          {p.story.map((b, i) => (
            <article key={b.title} className={`product-story__block ${b.shot ? '' : 'product-story__block--text'} ${i % 2 ? 'is-flipped' : ''}`}>
              <div className="product-story__text">
                <p className="product-story__n">{String(i + 1).padStart(2, '0')}</p>
                <h3>{b.title}</h3>
                <p>{b.text}</p>
                {b.points && (
                  <ul>
                    {b.points.map((pt) => (
                      <li key={pt}>{pt}</li>
                    ))}
                  </ul>
                )}
              </div>
              {b.shot && (
                <figure className="product-story__shot">
                  <img src={`${import.meta.env.BASE_URL}${b.shot}`} alt={`${p.name}: ${b.title}`} loading="lazy" />
                </figure>
              )}
            </article>
          ))}
        </section>
      )}

      {more.length > 0 && (
        <section className="wrap shop-item__more" aria-labelledby="more-title">
          <header className="shop-section__head">
            <Label>More {section.title.toLowerCase()}</Label>
            <h2 id="more-title" className="h2">
              You might also like
            </h2>
          </header>
          <div className={`shop-grid shop-grid--${p.kind}`}>
            {more.map((x) => (
              <ProductCard key={x.id} p={x} />
            ))}
          </div>
        </section>
      )}
    </article>
  )
}
