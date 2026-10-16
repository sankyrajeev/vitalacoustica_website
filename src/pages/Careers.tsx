import type { CSSProperties } from 'react'
import { PageHead } from '../components/PageHead'
import { Arrow, Label } from '../components/ui'
import { positions } from '../content/careers'
import { site, waLink } from '../content/site'

// The crew are channels on a desk; when every channel is taken, the page says so.
const CHANNELS = ['Sound', 'Light', 'Rigging', 'Power', 'Stage', 'Crew', 'Desk', 'Load-out']

const TRAITS = [
  'You hear a 3 dB dip at 60 Hz and can’t let it go.',
  'You coil cables over-under without thinking about it.',
  'You stay calm at 2 a.m. when the generator coughs.',
  'You’d rather focus a light properly than leave early.',
  'You think load-out is a team sport, and you play to win.',
]

export function CareersPage() {
  const open = positions.length
  // applications come in on WhatsApp, so no address is published here
  const mail = site.contact.whatsapp ? waLink('Soundcheck: I’d like to join the crew. ') : undefined

  return (
    <>
      <PageHead label="Careers" title={open ? 'Join the crew.' : 'The crew is full. The coffee isn’t.'}>
        {open
          ? 'We’re looking for people who care about how a night sounds and feels. Here’s what’s open right now.'
          : 'Right now every channel on our desk is patched and every flight case has a name on it, so we’re not hiring. But the nights keep getting bigger, and so will the crew.'}
      </PageHead>

      <section className="section section--tight">
        <div className="wrap careers">
          {open ? (
            <ul className="positions">
              {positions.map((p) => (
                <li key={p.title}>
                  <div>
                    <h2 className="h3">{p.title}</h2>
                    <p className="muted">{p.summary}</p>
                  </div>
                  <p className="positions__meta">
                    {p.type} · {p.location}
                  </p>
                  {mail && (
                    <a className="text-link" href={waLink(`Application: ${p.title}. `)} target="_blank" rel="noreferrer">
                      Apply <Arrow />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div
              className="patched"
              role="img"
              aria-label="A mixing desk with every channel patched in: no open positions right now"
            >
              <div className="patched__display">
                <span className="patched__count">00</span>
                <span className="patched__caption">
                  open positions
                  <em>signal present on all channels</em>
                </span>
              </div>
              <div className="patched__desk" aria-hidden>
                {CHANNELS.map((c, i) => (
                  <div key={c} className="patched__strip" style={{ '--i': i } as CSSProperties}>
                    <span className="patched__meter">
                      <span />
                    </span>
                    <span className="patched__fader" />
                    <span className="patched__on">on</span>
                    <span className="patched__name">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="careers__copy">
            <Label>{open ? 'Who we’re looking for' : 'Still keen? Good sign.'}</Label>
            <h2 className="h2">You might belong in the crew if…</h2>
            <ul className="traits">
              {TRAITS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <p className="lede">
              {open
                ? 'Not quite any of the roles above? Write to us anyway.'
                : 'Send us a few lines and a link to your work. We read every one, keep the good ones on file, and call first when a channel opens.'}
            </p>
            {mail ? (
              <a className="cta cta--primary" href={mail} target="_blank" rel="noreferrer">
                <span>Say hello anyway</span>
                <Arrow />
              </a>
            ) : null}
            {mail && (
              <p className="fineprint">Start your message with “Soundcheck”. Bonus points for good taste in techno.</p>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
