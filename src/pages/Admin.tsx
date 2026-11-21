import { useEffect, useState, type FormEvent } from 'react'
import { api, explain, type BetaRequest, type ChatOverview, type NewsletterOverview, type Report, type Tester } from '../account/api'
import { Link } from '../components/Link'
import { PageHead } from '../components/PageHead'
import { Arrow } from '../components/ui'
import { makeRsaKeyPair, type KeyPair } from '../account/keys'

// The owner's admin page: beta keys, testers and what beta builds report. The server only answers
// accounts listed in ADMIN_EMAILS (server/accounts/admin.ts); for anyone else this page is empty.

const day = (s: number | null) => (s ? new Date(s * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const time = (s: number) => new Date(s * 1000).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const inDays = (n: number) => new Date(Date.now() + n * 86400e3).toISOString().slice(0, 10)

/**
 * "A personal note" for the invitation email: shown at the top of it, in italics, signed with the
 * first name on your account. Optional; left empty, the email goes as usual.
 */
function PersonalNote({ name, value, onChange }: { name?: string; value?: string; onChange?: (v: string) => void }) {
  return (
    <label className="field field--wide admin__note">
      <span>
        Personal note <em>optional · at the top of their email, signed with your name</em>
      </span>
      <textarea
        name={name}
        rows={3}
        maxLength={1200}
        placeholder="e.g. Loved the tracks you sent. Try the Sample Lab on your own vocals first, and tell me what you think."
        {...(onChange ? { value, onChange: (e) => onChange(e.target.value) } : {})}
      />
    </label>
  )
}

function IssueBeta({ onIssued }: { onIssued: () => void }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'info' | 'error'; text: string } | null>(null)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const f = new FormData(form)
    setBusy(true)
    const r = await api.admin.issue({
      email: String(f.get('email') || ''),
      name: String(f.get('name') || ''),
      expires: String(f.get('expires') || ''),
      note: String(f.get('note') || ''),
      send: f.get('send') === 'on',
      message: String(f.get('message') || ''),
    })
    setBusy(false)
    if (!r.ok) return setMsg({ tone: 'error', text: explain(r.data.error) })
    form.reset()
    setMsg({ tone: 'info', text: `Beta key ${r.data.key} issued${f.get('send') === 'on' ? (r.data.sent ? ' and the invitation sent.' : ', but the invitation could not be sent: send the key yourself.') : '.'}` })
    onIssued()
  }

  return (
    <form className="form account__form admin__issue" onSubmit={submit}>
      <div className="form__grid">
        <label className="field">
          <span>Tester’s email</span>
          <input name="email" type="email" required />
        </label>
        <label className="field">
          <span>Name</span>
          <input name="name" maxLength={80} />
        </label>
        <label className="field">
          <span>Beta ends</span>
          <input name="expires" type="date" required defaultValue={inDays(60)} min={inDays(1)} />
        </label>
        <label className="field">
          <span>
            Note <em>only you see it</em>
          </span>
          <input name="note" maxLength={200} />
        </label>
      </div>
      <label className="admin__check">
        <input type="checkbox" name="send" defaultChecked /> Email the invitation with the key and download link
      </label>
      <PersonalNote name="message" />
      {msg && (
        <p className={msg.tone === 'error' ? 'form__error' : 'notice account__notice'} role="status">
          {msg.text}
        </p>
      )}
      <div className="form__foot">
        <button className="cta cta--primary" type="submit" disabled={busy}>
          <span>{busy ? 'Issuing…' : 'Issue a VANTA beta key'}</span>
          <Arrow />
        </button>
      </div>
    </form>
  )
}

function Requests({ onChange }: { onChange: () => void }) {
  const [status, setStatus] = useState<BetaRequest['status']>('pending')
  const [rows, setRows] = useState<BetaRequest[] | null>(null)
  const [expires, setExpires] = useState(inDays(60))
  const [busy, setBusy] = useState<number | null>(null)
  const [msg, setMsg] = useState('')
  const [notes, setNotes] = useState<Record<number, string>>({})

  const load = (s = status) => api.admin.requests(s).then((r) => setRows(r.ok ? r.data.requests : []))
  useEffect(() => {
    void load(status)
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  async function approve(r: BetaRequest) {
    setBusy(r.id)
    const res = await api.admin.approve(r.id, expires, notes[r.id] ?? '')
    setBusy(null)
    setMsg(res.ok ? `Approved ${r.email}: key ${res.data.key}${res.data.sent ? ', invitation sent.' : '. The invitation could not be sent: send the key yourself.'}` : explain(res.data.error))
    void load()
    onChange()
  }
  async function decline(r: BetaRequest) {
    if (!window.confirm(`Decline ${r.email}? They won't be emailed.`)) return
    setBusy(r.id)
    await api.admin.decline(r.id)
    setBusy(null)
    void load()
  }

  return (
    <>
      <div className="account__bar">
        <div className="account__tabs">
          {(['pending', 'approved', 'declined'] as const).map((s) => (
            <button key={s} className="chip" type="button" aria-pressed={status === s} onClick={() => setStatus(s)}>
              {s === 'pending' ? 'Waiting' : s === 'approved' ? 'Approved' : 'Declined'}
            </button>
          ))}
        </div>
        {status === 'pending' && (
          <label className="field admin__expiry">
            <span>Approved betas end on</span>
            <input type="date" value={expires} min={inDays(1)} onChange={(e) => setExpires(e.target.value)} />
          </label>
        )}
      </div>
      {msg && (
        <p className="notice account__notice" role="status">
          {msg}
        </p>
      )}
      {rows === null ? (
        <p className="muted">Loading…</p>
      ) : !rows.length ? (
        <p className="muted">{status === 'pending' ? 'No one is waiting.' : 'None.'}</p>
      ) : (
        rows.map((r) => (
          <article key={r.id} className="admin__report admin__request">
            <header>
              <span className="label">{r.name || r.email}</span>
              <span className="muted">
                {r.email} · {time(r.created_at)}
                {r.system ? ` · ${r.system}` : ''}
                {r.daw ? ` · ${r.daw}` : ''}
              </span>
            </header>
            {r.about && <p className="admin__msg">{r.about}</p>}
            {r.status === 'pending' ? (
              <>
                <PersonalNote value={notes[r.id] ?? ''} onChange={(v) => setNotes((n) => ({ ...n, [r.id]: v }))} />
                <div className="admin__actions">
                  <button className="cta cta--primary" type="button" disabled={busy === r.id} onClick={() => approve(r)}>
                    <span>{busy === r.id ? 'Approving…' : 'Approve and send key'}</span>
                  </button>
                  <button className="text-link text-link--quiet" type="button" disabled={busy === r.id} onClick={() => decline(r)}>
                    Decline
                  </button>
                </div>
              </>
            ) : (
              <p className="muted admin__sys">
                {r.status === 'approved' ? `Approved ${day(r.decided_at)} · ${r.licence_key}` : `Declined ${day(r.decided_at)}`}
              </p>
            )}
          </article>
        ))
      )}
    </>
  )
}

type Status = Record<'database' | 'email' | 'admins' | 'vantaKey' | 'pixelForgeKey' | 'downloads' | 'paddle' | 'google', boolean>

const CHECKS: [keyof Status, string, string][] = [
  ['database', 'Database', 'Accounts, licences, beta requests and launch lists are stored.'],
  ['email', 'Email', 'Confirmations, beta invitations and licence keys are sent (Resend).'],
  ['admins', 'Admin notifications', 'Beta requests are emailed to ADMIN_EMAILS.'],
  ['vantaKey', 'VANTA signing key', 'Beta and bought VANTA keys can be activated (LICENCE_KEY_VANTA).'],
  ['pixelForgeKey', 'Pixel Forge signing key', 'Pixel Forge keys can be activated (LICENCE_KEY_PIXELFORGE).'],
  ['downloads', 'Downloads', 'Owners and testers get the installers from GitHub Releases (GITHUB_RELEASES_TOKEN).'],
  ['paddle', 'Paddle', 'Purchases create orders and licence keys.'],
  ['google', 'Sign in with Google', 'Optional.'],
]

function Setup() {
  const [s, setS] = useState<Status | null>(null)
  useEffect(() => {
    void api.admin.status().then((r) => r.ok && setS(r.data))
  }, [])
  if (!s) return null
  return (
    <ul className="admin__setup">
      {CHECKS.map(([k, name, what]) => (
        <li key={k} className={s[k] ? 'is-on' : ''}>
          <span className="admin__tick" aria-hidden>
            {s[k] ? '✓' : '○'}
          </span>
          <span>
            <strong>{name}</strong> <span className="muted">{s[k] ? 'on' : 'not set up yet'}</span>
            <span className="admin__sub">{what}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

const SAMPLE_EMAILS: [string, string][] = [
  ['beta-invite', 'Beta invitation (VANTA)'],
  ['beta-request-received', 'Beta request received'],
  ['licence-keys', 'Licence keys after buying'],
  ['confirm-email', 'Confirm your email'],
  ['reset-password', 'Reset your password'],
  ['launch-signup', 'You’re on the launch list'],
  ['launch-out', 'It’s out'],
  ['key-revoked', 'Beta key turned off'],
  ['offline-reminder', 'Pixel Forge: go online'],
]

function TestEmails() {
  const [which, setWhich] = useState('beta-invite')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  async function send() {
    setBusy(true)
    const r = await api.admin.testEmail(which)
    setBusy(false)
    setMsg(r.ok ? `Sent to ${r.data.sent}. Check your inbox (and spam) on your phone and laptop.` : 'Couldn’t send it. Check Resend’s Emails page for the error.')
  }
  return (
    <div className="admin__test">
      <label className="field">
        <span>Email</span>
        <select value={which} onChange={(e) => setWhich(e.target.value)}>
          {SAMPLE_EMAILS.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <button className="cta" type="button" onClick={send} disabled={busy}>
        <span>{busy ? 'Sending…' : 'Send me a test'}</span>
      </button>
      {msg && <p className="muted admin__sub">{msg}</p>}
    </div>
  )
}

function SigningKeys() {
  const [keys, setKeys] = useState<KeyPair | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState('')

  async function make() {
    if (!window.confirm('Make VANTA’s licence key pair? Do this only once: every VANTA licence will depend on it. If VANTA already has a key pair, stop here.')) return
    setBusy(true)
    setKeys(await makeRsaKeyPair())
    setBusy(false)
  }
  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value).catch(() => undefined)
    setCopied(label)
    setTimeout(() => setCopied(''), 1600)
  }
  function download() {
    if (!keys) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([keys.backup], { type: 'application/json' }))
    a.download = 'vanta-private_key.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (!keys)
    return (
      <div className="admin__keys">
        <p className="muted">
          Makes VANTA’s key pair here, in your browser: nothing is sent to the website or anywhere else. You get three things to put in three places.
        </p>
        <button className="cta" type="button" onClick={make} disabled={busy}>
          <span>{busy ? 'Making… (a few seconds)' : 'Make VANTA’s key pair'}</span>
        </button>
      </div>
    )
  const box = (n: string, title: string, where: string, value: string, secret = false) => (
    <div className="admin__keybox">
      <p className="label">
        {n} · {title}
      </p>
      <p className="admin__sub">{where}</p>
      <textarea readOnly rows={secret ? 4 : 3} value={value} onFocus={(e) => e.currentTarget.select()} />
      <button className="chip" type="button" onClick={() => copy(title, value)}>
        {copied === title ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
  return (
    <div className="admin__keys">
      <p className="form__error" role="alert">
        Keep this page open until all three are saved. Once you leave it, the private key is gone for good unless you downloaded the backup.
      </p>
      {box('1', 'Website secret', 'Cloudflare → Workers & Pages → vitalacoustica-website → Settings → Variables and Secrets → Add → type Secret, name LICENCE_KEY_VANTA, paste this.', keys.secret, true)}
      {box('2', 'Public key for VANTA builds', 'GitHub → vitalacoustica/vanta_vitalacoustica (formerly sankyrajeev/vanta_vitalacoustica) → Settings → Secrets and variables → Actions → New repository secret, name VANTA_LICENCE_PUBLIC_KEY, paste this. (It isn’t secret, but that’s where VANTA’s builds read it.)', keys.publicKey)}
      <div className="admin__keybox">
        <p className="label">3 · Backup</p>
        <p className="admin__sub">The private key in VANTA’s own format. Keep it offline (a USB stick, a password manager). Never email it, paste it into a chat, or commit it.</p>
        <button className="cta cta--primary" type="button" onClick={download}>
          <span>Download vanta-private_key.json</span>
        </button>
      </div>
    </div>
  )
}

const when = (t: number) => new Date(t * 1000).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** One answer to teach (or edit): the question as people ask it, and what the assistant should say. */
function TeachForm({ question, answer = '', onSave, onCancel }: { question: string; answer?: string; onSave: (q: string, a: string) => Promise<void>; onCancel?: () => void }) {
  const [q, setQ] = useState(question)
  const [a, setA] = useState(answer)
  const [busy, setBusy] = useState(false)
  return (
    <div className="admin__teach">
      <label className="field">
        <span>Question</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={300} />
      </label>
      <label className="field">
        <span>The answer it should give</span>
        <textarea value={a} onChange={(e) => setA(e.target.value)} rows={3} maxLength={2000} placeholder="Write it as you’d tell a customer. It uses these facts from the next question on." />
      </label>
      <div className="admin__teach-actions">
        <button
          className="cta cta--primary"
          type="button"
          disabled={busy || !q.trim() || !a.trim()}
          onClick={async () => {
            setBusy(true)
            await onSave(q, a)
            setBusy(false)
          }}
        >
          <span>{busy ? 'Saving…' : 'Teach it'}</span>
        </button>
        {onCancel && (
          <button className="text-link text-link--quiet" type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

function Assistant() {
  const [o, setO] = useState<ChatOverview | null>(null)
  const [teaching, setTeaching] = useState<number | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [showRecent, setShowRecent] = useState(false)
  const load = () => api.admin.chat().then((r) => r.ok && setO(r.data))
  useEffect(() => {
    void load()
  }, [])
  if (!o) return <p className="muted">Loading…</p>
  return (
    <>
      <p className="muted">
        This week: {o.week.asked} {o.week.asked === 1 ? 'question' : 'questions'}, {o.week.unsure} it couldn’t answer. It knows everything published on
        the site (products, equipment, services, the blog) and the answers you teach it here. Chats are kept for 90 days.
      </p>

      <h3 className="admin__h3">Couldn’t answer</h3>
      {o.open.length === 0 ? (
        <p className="muted">Nothing waiting.</p>
      ) : (
        <ul className="admin__chat">
          {o.open.map((r) => (
            <li key={r.id}>
              <p>
                <strong>“{r.question}”</strong> <span className="muted admin__sub">{when(r.asked_at)}{r.page ? ` · ${r.page}` : ''}</span>
              </p>
              <p className="muted admin__sub">It said: {r.answer}</p>
              {teaching === r.id ? (
                <TeachForm
                  question={r.question}
                  onCancel={() => setTeaching(null)}
                  onSave={async (q, a) => {
                    await api.admin.teach({ question: q, answer: a, logId: r.id })
                    setTeaching(null)
                    void load()
                  }}
                />
              ) : (
                <span className="admin__actions">
                  <button className="text-link" type="button" onClick={() => setTeaching(r.id)}>
                    Teach the answer
                  </button>
                  <button
                    className="text-link text-link--quiet"
                    type="button"
                    onClick={async () => {
                      await api.admin.dismiss(r.id)
                      void load()
                    }}
                  >
                    Dismiss
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <h3 className="admin__h3">What you’ve taught it</h3>
      {o.taught.length === 0 && !adding && <p className="muted">Nothing yet.</p>}
      <ul className="admin__chat">
        {o.taught.map((t) => (
          <li key={t.id}>
            {editing === t.id ? (
              <TeachForm
                question={t.question}
                answer={t.answer}
                onCancel={() => setEditing(null)}
                onSave={async (q, a) => {
                  await api.admin.teach({ id: t.id, question: q, answer: a })
                  setEditing(null)
                  void load()
                }}
              />
            ) : (
              <>
                <p>
                  <strong>{t.question}</strong>
                </p>
                <p className="muted admin__sub">{t.answer}</p>
                <span className="admin__actions">
                  <button className="text-link" type="button" onClick={() => setEditing(t.id)}>
                    Edit
                  </button>
                  <button
                    className="text-link text-link--quiet"
                    type="button"
                    onClick={async () => {
                      if (!window.confirm('Forget this answer?')) return
                      await api.admin.forget(t.id)
                      void load()
                    }}
                  >
                    Forget
                  </button>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
      {adding ? (
        <TeachForm
          question=""
          onCancel={() => setAdding(false)}
          onSave={async (q, a) => {
            await api.admin.teach({ question: q, answer: a })
            setAdding(false)
            void load()
          }}
        />
      ) : (
        <button className="cta" type="button" onClick={() => setAdding(true)}>
          <span>Teach it something new</span>
        </button>
      )}

      <h3 className="admin__h3">
        <button className="text-link" type="button" onClick={() => setShowRecent((s) => !s)} aria-expanded={showRecent}>
          {showRecent ? 'Hide' : 'Show'} recent conversations ({o.recent.length})
        </button>
      </h3>
      {showRecent && (
        <ul className="admin__chat">
          {o.recent.map((r) => (
            <li key={r.id}>
              <p>
                <strong>“{r.question}”</strong> <span className="muted admin__sub">{when(r.asked_at)}{r.unsure ? ' · couldn’t answer' : ''}</span>
              </p>
              <p className="muted admin__sub">{r.answer}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

const EDITION_STATUS = { sending: 'Sending', sent: 'Sent', empty: 'Skipped (no new posts)' } as const

function Newsletter() {
  const [o, setO] = useState<NewsletterOverview | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  useEffect(() => {
    void api.admin.newsletter().then((r) => r.ok && setO(r.data))
  }, [])
  async function test() {
    setBusy(true)
    const r = await api.admin.testEdition()
    setBusy(false)
    setMsg(r.ok ? `Sent to ${r.data.sent}, with ${r.data.posts} ${r.data.posts === 1 ? 'post' : 'posts'}.` : 'Couldn’t send it. Check Resend’s Emails page for the error.')
  }
  if (!o) return <p className="muted">Loading…</p>
  const { active, pending, unsubscribed } = o.subscribers
  return (
    <>
      <p className="muted">
        {active} {active === 1 ? 'subscriber' : 'subscribers'}
        {pending ? `, ${pending} not confirmed yet` : ''}
        {unsubscribed ? `, ${unsubscribed} left` : ''}. Each Monday morning the week’s edition goes out by itself, up to {o.dailyLimit} emails a
        day; a longer list is finished on the following days.
      </p>
      <div className="admin__test">
        <button className="cta" type="button" onClick={test} disabled={busy}>
          <span>{busy ? 'Sending…' : 'Send me this week’s edition'}</span>
        </button>
        {msg && <p className="muted admin__sub">{msg}</p>}
      </div>
      {o.editions.length > 0 && (
        <div className="admin__scroll">
          <table className="admin__table">
            <thead>
              <tr>
                <th>Edition</th>
                <th>Posts</th>
                <th>Sent to</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {o.editions.map((e) => (
                <tr key={e.id}>
                  <td>{e.subject.replace(/^The Acoustica Edit: /, '')}</td>
                  <td>{e.posts}</td>
                  <td>{e.sent}</td>
                  <td>{EDITION_STATUS[e.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function LaunchAlerts() {
  const [rows, setRows] = useState<{ product: string; name: string; waiting: number; told: number }[] | null>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState('')
  const load = () => api.admin.launchAlerts().then((r) => setRows(r.ok ? r.data.alerts : []))
  useEffect(() => {
    void load()
  }, [])

  async function send(product: string, name: string, waiting: number) {
    if (!window.confirm(`Email ${waiting} ${waiting === 1 ? 'person' : 'people'} that ${name} is out? Do this once it's on sale.`)) return
    setBusy(product)
    const r = await api.admin.sendLaunch(product)
    setBusy('')
    setMsg(r.ok ? `${name}: ${r.data.sent} emailed${r.data.left ? `, ${r.data.left} could not be sent (press again to retry)` : ''}.` : explain(r.data.error))
    void load()
  }

  if (rows === null) return <p className="muted">Loading…</p>
  if (!rows.length) return <p className="muted">No one has signed up yet.</p>
  return (
    <>
      {msg && (
        <p className="notice account__notice" role="status">
          {msg}
        </p>
      )}
      <div className="admin__scroll">
        <table className="admin__table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Waiting</th>
              <th>Already told</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.product}>
                <td>{r.name}</td>
                <td>{r.waiting}</td>
                <td>{r.told}</td>
                <td>
                  {r.waiting > 0 && (
                    <button className="text-link" type="button" disabled={busy === r.product} onClick={() => send(r.product, r.name, r.waiting)}>
                      {busy === r.product ? 'Sending…' : 'Tell them it’s out'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function Testers({ testers, onChange }: { testers: Tester[]; onChange: () => void }) {
  const [sending, setSending] = useState('')
  const [msg, setMsg] = useState('')
  // the tester whose invitation is about to go again, and the note to go with it
  const [resending, setResending] = useState<Tester | null>(null)
  const [note, setNote] = useState('')
  async function resend(t: Tester) {
    setSending(t.key)
    const r = await api.admin.resendInvite(t.key, note)
    setSending('')
    setResending(null)
    setNote('')
    setMsg(r.ok ? `Invitation sent again to ${r.data.sent}.` : 'Couldn’t send it. Check Resend’s Emails page for the error.')
  }
  async function revoke(t: Tester) {
    if (!window.confirm(`Revoke ${t.key} (${t.email})? VANTA stops working on their computer, and they get an email saying their key has been turned off.`)) return
    const r = await api.admin.revoke(t.key)
    setMsg(r.ok ? (r.data.emailed ? `Revoked. ${t.email} has been told by email.` : `Revoked, but the email to ${t.email} couldn’t be sent.`) : 'Couldn’t revoke it. Please try again.')
    onChange()
  }
  if (!testers.length) return <p className="muted">No beta keys yet.</p>
  return (
    <>
      {msg && (
        <p className="notice account__notice" role="status">
          {msg}
        </p>
      )}
      {resending && (
        <div className="admin__resend" role="group" aria-label={`Send ${resending.email} their invitation again`}>
          <p>
            Send <strong>{resending.email}</strong> their invitation again, with their key and the download link.
          </p>
          <PersonalNote value={note} onChange={setNote} />
          <div className="admin__actions">
            <button className="cta cta--primary" type="button" disabled={sending === resending.key} onClick={() => resend(resending)}>
              <span>{sending === resending.key ? 'Sending…' : 'Send it'}</span>
            </button>
            <button className="text-link text-link--quiet" type="button" onClick={() => setResending(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      <div className="admin__scroll">
        <table className="admin__table">
          <thead>
            <tr>
              <th>Tester</th>
              <th>Key</th>
              <th>Ends</th>
              <th>Computer</th>
              <th>Terms</th>
              <th>Last seen</th>
              <th>Version</th>
              <th>Sessions</th>
              <th>Reports</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {testers.map((t) => (
              <tr key={t.key} className={t.revoked ? 'is-revoked' : ''}>
                <td>
                  {t.email}
                  {t.note && <span className="muted admin__sub">{t.note}</span>}
                </td>
                <td>
                  <code>{t.key}</code>
                  {t.revoked && <span className="admin__flag">Revoked</span>}
                </td>
                <td>{t.expires ?? '—'}</td>
                <td>{t.devices ? 'Active' : <span className="muted">Not yet</span>}</td>
                <td>{t.termsAccepted ? `${t.termsAccepted.slice(0, 10)}${t.termsVersion ? ` (${t.termsVersion})` : ''}` : '—'}</td>
                <td>{day(t.lastSeen)}</td>
                <td>{t.version ?? '—'}</td>
                <td>{t.sessions}</td>
                <td>
                  {t.feedback}
                  {t.crashes > 0 && <span className="admin__flag">{t.crashes} crash</span>}
                </td>
                <td>
                  {!t.revoked && (
                    <span className="admin__actions">
                      <button className="text-link" type="button" disabled={sending === t.key} onClick={() => (setResending(t), setNote(''))}>
                        {sending === t.key ? 'Sending…' : 'Send invitation again'}
                      </button>
                      <button className="text-link text-link--quiet" type="button" onClick={() => revoke(t)}>
                        Revoke
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function ReportItem({ r }: { r: Report }) {
  const [logs, setLogs] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function showLogs() {
    if (logs === null) {
      const res = await api.admin.report(r.id)
      setLogs(res.ok ? (res.data.item.logs ?? '') : 'Could not load the logs.')
    }
    setOpen((o) => !o)
  }

  return (
    <article className={`admin__report ${r.crash ? 'is-crash' : ''}`}>
      <header>
        <span className="label">
          {r.crash ? 'Crash · ' : ''}
          {r.type || 'Feedback'}
        </span>
        <span className="muted">
          {time(r.received_at)} · {r.email || 'no email'} · {r.key || 'no key'}
        </span>
      </header>
      <p className="admin__msg">{r.message}</p>
      {r.system && <p className="muted admin__sys">{r.system}</p>}
      {(r.log_size ?? 0) > 0 && (
        <button className="text-link text-link--quiet" type="button" onClick={showLogs}>
          {open ? 'Hide logs' : `Show logs (${Math.ceil((r.log_size ?? 0) / 1024)} KB)`}
        </button>
      )}
      {open && logs !== null && <pre className="admin__logs">{logs}</pre>}
    </article>
  )
}

export function AdminPage() {
  const [state, setState] = useState<'loading' | 'ok' | 'no'>('loading')
  const [testers, setTesters] = useState<Tester[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [crashOnly, setCrashOnly] = useState(false)

  const loadTesters = () =>
    api.admin.testers().then((r) => {
      if (r.ok) {
        setTesters(r.data.testers)
        setState('ok')
      } else setState('no')
    })
  useEffect(() => {
    void loadTesters()
  }, [])
  useEffect(() => {
    void api.admin.feedback(crashOnly).then((r) => r.ok && setReports(r.data.feedback))
  }, [crashOnly])

  return (
    <>
      <PageHead label="Admin" title="Beta and launch">
        Who’s asked to test VANTA, who’s testing, and what the beta builds report. Testing is free.
      </PageHead>
      <div className="wrap account admin">
        {state === 'loading' && <p className="muted">Loading…</p>}
        {state === 'no' && (
          <p>
            This page is for Vital Acoustica’s team. <Link to="/account">Back to your account</Link>
          </p>
        )}
        {state === 'ok' && (
          <>
            <section className="account__section">
              <h2 className="account__h">Setup</h2>
              <Setup />
            </section>
            <section className="account__section">
              <h2 className="account__h">Test emails</h2>
              <p className="muted">Sends a sample of any customer email to you, with made-up details. Nothing else happens.</p>
              <TestEmails />
            </section>
            <section className="account__section">
              <h2 className="account__h">Signing keys</h2>
              <SigningKeys />
            </section>
            <section className="account__section">
              <h2 className="account__h">Requests to join</h2>
              <Requests onChange={loadTesters} />
            </section>
            <section className="account__section">
              <h2 className="account__h">Invite someone yourself</h2>
              <IssueBeta onIssued={loadTesters} />
            </section>
            <section className="account__section">
              <h2 className="account__h">Testers</h2>
              <Testers testers={testers} onChange={loadTesters} />
            </section>
            <section className="account__section">
              <h2 className="account__h">Chat assistant</h2>
              <Assistant />
            </section>
            <section className="account__section">
              <h2 className="account__h">Newsletter</h2>
              <Newsletter />
            </section>
            <section className="account__section">
              <h2 className="account__h">Waiting for launch</h2>
              <p className="muted">People who asked to hear when a product is out. Press “Tell them it’s out” once it’s on sale: they get one email.</p>
              <LaunchAlerts />
            </section>
            <section className="account__section">
              <div className="account__bar">
                <h2 className="account__h">Feedback</h2>
                <div className="account__tabs">
                  <button className="chip" type="button" aria-pressed={!crashOnly} onClick={() => setCrashOnly(false)}>
                    All
                  </button>
                  <button className="chip" type="button" aria-pressed={crashOnly} onClick={() => setCrashOnly(true)}>
                    Crashes
                  </button>
                </div>
              </div>
              {reports.length ? reports.map((r) => <ReportItem key={r.id} r={r} />) : <p className="muted">Nothing yet.</p>}
            </section>
          </>
        )}
      </div>
    </>
  )
}
