import { useEffect, useRef, useState, type FormEvent } from 'react'
import { answer, GREETING, type Action, type Reply } from '../content/chat'
import { fullName } from '../content/gear'
import { site } from '../content/site'
import { openExplore } from '../events'
import { navigate } from '../router'
import { gearImg } from './gearImg'
import { Arrow } from './ui'

type Message = { from: 'bot'; reply: Reply } | { from: 'you'; text: string }

const STORE = 'va-chat'

function load(): Message[] {
  try {
    const raw = sessionStorage.getItem(STORE)
    if (raw) return JSON.parse(raw) as Message[]
  } catch {
    /* storage unavailable: start fresh */
  }
  return [{ from: 'bot', reply: GREETING }]
}

/** The site assistant: a floating button that opens a small chat panel. */
export function Chat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>(load)
  const [typing, setTyping] = useState(false)
  const [text, setText] = useState('')
  const log = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify(messages.slice(-40)))
    } catch {
      /* not saved: fine */
    }
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  useEffect(() => {
    if (!open) return
    input.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const ask = (q: string, shown = q) => {
    if (!q.trim()) return
    setMessages((m) => [...m, { from: 'you', text: shown }])
    setTyping(true)
    // a short pause so the reply reads as a reply
    window.setTimeout(() => {
      setTyping(false)
      setMessages((m) => [...m, { from: 'bot', reply: answer(q) }])
    }, 550)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    ask(text)
    setText('')
  }

  const act = (a: Action) => {
    if (a.kind === 'ask') return ask(a.query, a.label)
    if (a.kind === 'link') {
      navigate(a.to)
      if (window.matchMedia('(max-width: 640px)').matches) setOpen(false)
      return
    }
    if (a.kind === 'explore') {
      setOpen(false)
      return openExplore(a.gear)
    }
    window.open(`https://wa.me/${site.contact.whatsapp}?text=${encodeURIComponent(a.text)}`, '_blank', 'noopener')
  }

  return (
    <div className={`chat ${open ? 'chat--open' : ''}`}>
      {open && (
        <section className="chat__panel" role="dialog" aria-label="Ask Vital Acoustica">
          <header className="chat__head">
            <span className="chat__avatar" aria-hidden />
            <div>
              <strong>Vital Acoustica</strong>
              <span>
                <i aria-hidden /> Usually replies instantly
              </span>
            </div>
            <button className="chat__close" onClick={() => setOpen(false)} aria-label="Close chat">
              ×
            </button>
          </header>

          <div ref={log} className="chat__log" aria-live="polite">
            {messages.map((m, i) =>
              m.from === 'you' ? (
                <p key={i} className="msg msg--you">
                  {m.text}
                </p>
              ) : (
                <div key={i} className="msg msg--bot">
                  <p>{m.reply.text}</p>
                  {m.reply.gear && (
                    <div className="msg__gear">
                      {m.reply.gear.map((g) => (
                        <button key={g.id} className="gearchip" onClick={() => act({ kind: 'link', label: g.name, to: `/equipment/${g.id}` })}>
                          <span className={`gearchip__img gearchip__img--${g.photo.source}`}>
                            {g.photo.source !== 'none' && <img src={gearImg(g.photo.file, 'sm')} alt="" loading="lazy" />}
                          </span>
                          <span className="gearchip__name">{fullName(g)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {m.reply.actions && i === messages.length - 1 && (
                    <div className="msg__actions">
                      {m.reply.actions.map((a) => (
                        <button key={a.label} className={`qr ${a.kind === 'whatsapp' ? 'qr--wa' : ''}`} onClick={() => act(a)}>
                          {a.label}
                          {a.kind !== 'ask' && <Arrow />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ),
            )}
            {typing && (
              <p className="msg msg--bot msg--typing" aria-label="Typing">
                <span />
                <span />
                <span />
              </p>
            )}
          </div>

          <form className="chat__form" onSubmit={submit}>
            <input
              ref={input}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ask about gear, dates, prices…"
              aria-label="Your question"
              maxLength={300}
            />
            <button type="submit" aria-label="Send" disabled={!text.trim()}>
              <Arrow />
            </button>
          </form>
        </section>
      )}

      <button className="chat__fab" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? 'Close chat' : 'Ask us anything'}>
        {open ? (
          <span aria-hidden>×</span>
        ) : (
          <>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
              <path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm3 6.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm5 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm5 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Z" />
            </svg>
            <span className="chat__fab-label">Ask us</span>
          </>
        )}
      </button>
    </div>
  )
}
