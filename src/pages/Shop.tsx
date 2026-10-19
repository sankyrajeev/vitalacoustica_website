import { useState } from 'react'
import { Link } from '../components/Link'
import { PageHead } from '../components/PageHead'
import { AudioPreview } from '../components/shop/AudioPreview'
import { AudioCover, GarmentMock, LoopPreview } from '../components/shop/Art'
import { Buy } from '../components/shop/Buy'
import { Arrow, Label } from '../components/ui'
import { price, products, SECTIONS, sectionOf, type Product } from '../content/shop'
import { scrollToId } from '../router'
import { NotFound } from './NotFound'

function Art({ p, colour, view }: { p: Product; colour?: number; view?: string }) {
  if (p.kind === 'audio') return <AudioCover p={p} />
  if (p.kind === 'loops') return <LoopPreview p={p} />
  const photo = view ?? p.photo
  if (photo) return <img className="cover cover--photo" src={`${import.meta.env.BASE_URL}${photo}`} alt="" loading="lazy" />
  return <GarmentMock p={p} colour={p.colours[colour ?? 0]} />
}

function ProductCard({ p }: { p: Product }) {
  return (
    <article className="shop-card">
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
        <p className="shop-card__tagline">{p.tagline}</p>
        <p className="shop-card__foot">
          {p.checkout ? (
            <span className="shop-card__price">{price(p)}</span>
          ) : (
            <span className="shop-card__soon">Launching soon</span>
          )}
          <Link to={`/shop/${p.id}`} className="text-link">
            {p.checkout ? 'Buy' : 'Details'} <Arrow />
          </Link>
        </p>
      </div>
    </article>
  )
}

export function ShopIndex() {
  return (
    <>
      <PageHead label="Shop" title="Things to wear, sounds and visuals.">
        Merch to wear to the next show, printed when you order it. And sample packs and VJ loops made the way we run our shows,
        ready to download anywhere in the world.
      </PageHead>
      <div className="wrap">
        <div className="notice shop-notice">
          <p className="label">Opening soon</p>
          <p>
            Our first merch collection is launching soon. The audio packs and VJ loops are samples, to show how the shop will look;
            the real ones are on their way. Tap “Tell me when it’s out” on anything you like and we’ll message you.
          </p>
        </div>
        <nav className="shop-tabs" aria-label="Shop sections">
          {SECTIONS.map((s) => (
            <a
              key={s.kind}
              href={`#${s.kind}`}
              onClick={(e) => {
                e.preventDefault()
                scrollToId(s.kind)
              }}
            >
              {s.title}
              <span>{products.filter((p) => p.kind === s.kind).length}</span>
            </a>
          ))}
        </nav>
      </div>

      {SECTIONS.map((s, i) => (
        <section key={s.kind} id={s.kind} className="section section--tight shop-section" aria-labelledby={`${s.kind}-title`}>
          <div className="wrap">
            <header className="shop-section__head">
              <Label index={`0${i + 1}`}>{s.kind === 'merch' ? 'Printed to order' : 'Digital download'}</Label>
              <h2 id={`${s.kind}-title`} className="h1">
                {s.title}
              </h2>
              <p>{s.line}</p>
              <p className="shop-section__note">{s.note}</p>
            </header>
            <div className={`shop-grid shop-grid--${s.kind}`}>
              {products
                .filter((p) => p.kind === s.kind)
                .map((p) => (
                  <ProductCard key={p.id} p={p} />
                ))}
            </div>
          </div>
        </section>
      ))}

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
              <strong>Merch</strong>
              <p>Each piece is printed when you order it and shipped across India, usually within a week.</p>
            </li>
            <li>
              <span className="steps__n">03</span>
              <strong>Licence</strong>
              <p>
                Use the sounds in your tracks and sets, and the loops in your shows and streams, royalty-free. Just don’t resell
                them as they are.
              </p>
            </li>
            <li>
              <span className="steps__n">04</span>
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
  const views = p.kind === 'merch' && p.photo && p.gallery ? [p.photo, ...p.gallery] : []
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
          <span>{section.title}</span>
        </nav>
      </div>

      <div className="wrap gear-detail__grid">
        <figure className="gear-detail__figure shop-item__figure">
          <Art p={p} colour={colour} view={shown} />
          {views.length > 1 && (
            <div className="shop-item__views">
              {views.map((v, i) => (
                <button
                  key={v}
                  className={shown === v ? 'is-on' : ''}
                  onClick={() => setView(v)}
                  aria-label={i === 0 ? 'Main view' : `View ${i + 1}`}
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
                : section.note}
          </figcaption>
        </figure>

        <div className="gear-detail__info">
          <p className="gear-card__meta">
            <span>{section.title}</span>
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
        </div>
      </div>

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
