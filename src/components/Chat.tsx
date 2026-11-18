import { useEffect, useRef, useState, type FormEvent } from 'react'
import { loadModel } from '../assistant/model'
import { answer, GREETING, wa, type Action, type Reply } from '../content/chat'
import { fullName } from '../content/gear'
import { waLink } from '../content/site'
import { openExplore } from '../events'
import { navigate } from '../router'
import { gearImg } from './gearImg'
import { Arrow } from './ui'

type Message = { from: 'bot'; reply: Reply } | { from: 'you'; text: string }

const STORE = 'va-chat'


/**
 * Asks the site's language model (server/assistant/chat.ts), with the last few turns for context.
 * Null when it isn't there (a review copy of the site, offline) or can't answer just now: the
 * small model in the page answers instead.
 */
async function askModel(history: Message[], question: string): Promise<Reply | null> {
  const turns = history
    .slice(-6)
    .map((m) => (m.from === 'you' ? { role: 'user', text: m.text } : { role: 'assistant', text: m.reply.text }))
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [...turns, { role: 'user', text: question }], page: window.location.pathname }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const { reply, unsure } = (await res.json()) as { reply?: string; unsure?: boolean }
    if (!reply) return null
    return { text: reply, actions: unsure ? [wa(`Hi Vital Acoustica, ${question.trim()}`)] : undefined }
  } catch {
    return null
  }
}

/** The reply's text, with its [label](/path) links made into in-site links. */
function RichText({ text, go }: { text: string; go: (to: string) => void }) {
  const parts = text.split(/(\[[^\]]+\]\([^)\s]+\))/g)
  return (
    <p>
      {parts.map((part, i) => {
        const m = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)
        if (!m) return part.replace(/\*\*/g, '')
        // only pages of this site: anything else stays as plain text
        return m[2].startsWith('/') && !m[2].startsWith('//') ? (
          <a
            key={i}
            href={m[2]}
            className="msg__link"
            onClick={(e) => {
              e.preventDefault()
              go(m[2])
            }}
          >
            {m[1]}
          </a>
        ) : (
          m[1]
        )
      })}
    </p>
  )
}

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
    // fetch the assistant's model while the visitor reads the greeting
    loadModel().catch(() => {})
    input.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const ask = async (q: string, shown = q, intent?: string) => {
    if (!q.trim()) return
    setMessages((m) => [...m, { from: 'you', text: shown }])
    setTyping(true)
    // at least a short pause, so the reply reads as a reply
    // a tapped suggestion has its own written answer; anything typed goes to the language model
    const thinking = intent ? Promise.resolve(null) : askModel(messages, q)
    const [reply] = await Promise.all([thinking.then((r) => r ?? answer(q, intent)), new Promise((r) => window.setTimeout(r, 550))])
    setTyping(false)
    setMessages((m) => [...m, { from: 'bot', reply }])
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    ask(text)
    setText('')
  }

  const act = (a: Action) => {
    if (a.kind === 'ask') return ask(a.query, a.label, a.intent)
    if (a.kind === 'link') {
      navigate(a.to)
      if (window.matchMedia('(max-width: 640px)').matches) setOpen(false)
      return
    }
    if (a.kind === 'explore') {
      setOpen(false)
      return openExplore(a.gear)
    }
    window.open(waLink(a.text), '_blank', 'noopener')
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
                  <RichText text={m.reply.text} go={(to) => act({ kind: 'link', label: '', to })} />
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
                      {m.reply.actions.map((a) =>
                        // a real link, not window.open: in-app browsers and previews block scripted pop-ups
                        a.kind === 'whatsapp' ? (
                          <a key={a.label} className="qr qr--wa" href={waLink(a.text)} target="_blank" rel="noopener noreferrer">
                            {a.label}
                            <Arrow />
                          </a>
                        ) : (
                          <button key={a.label} className="qr" onClick={() => act(a)}>
                            {a.label}
                            {a.kind !== 'ask' && <Arrow />}
                          </button>
                        ),
                      )}
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
