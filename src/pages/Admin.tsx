import { useEffect, useState, type FormEvent } from 'react'
import { api, explain, type BetaRequest, type Report, type Tester } from '../account/api'
import { Link } from '../components/Link'
import { PageHead } from '../components/PageHead'
import { Arrow } from '../components/ui'

// The owner's admin page: beta keys, testers and what beta builds report. The server only answers
// accounts listed in ADMIN_EMAILS (server/accounts/admin.ts); for anyone else this page is empty.

const day = (s: number | null) => (s ? new Date(s * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const time = (s: number) => new Date(s * 1000).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const inDays = (n: number) => new Date(Date.now() + n * 86400e3).toISOString().slice(0, 10)

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

  const load = (s = status) => api.admin.requests(s).then((r) => setRows(r.ok ? r.data.requests : []))
  useEffect(() => {
    void load(status)
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  async function approve(r: BetaRequest) {
    setBusy(r.id)
    const res = await api.admin.approve(r.id, expires)
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
              <div className="admin__actions">
                <button className="cta cta--primary" type="button" disabled={busy === r.id} onClick={() => approve(r)}>
                  <span>{busy === r.id ? 'Approving…' : 'Approve and send key'}</span>
                </button>
                <button className="text-link text-link--quiet" type="button" disabled={busy === r.id} onClick={() => decline(r)}>
                  Decline
                </button>
              </div>
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

function Testers({ testers, onChange }: { testers: Tester[]; onChange: () => void }) {
  async function revoke(t: Tester) {
    if (!window.confirm(`Revoke ${t.key} (${t.email})? VANTA stops working on their computer.`)) return
    await api.admin.revoke(t.key)
    onChange()
  }
  if (!testers.length) return <p className="muted">No beta keys yet.</p>
  return (
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
                  <button className="text-link text-link--quiet" type="button" onClick={() => revoke(t)}>
                    Revoke
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
      <PageHead label="Admin" title="Beta testing">
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
