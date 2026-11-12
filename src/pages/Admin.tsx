import { useEffect, useState, type FormEvent } from 'react'
import { api, explain, type Report, type Tester } from '../account/api'
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
        VANTA beta keys, who’s testing, and what the beta builds report.
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
              <h2 className="account__h">Invite a tester</h2>
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
