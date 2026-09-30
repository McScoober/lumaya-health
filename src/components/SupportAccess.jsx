import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { createSupportInvite, listSupportAccess, manageSupportAccess, sendSupportInviteLink } from '../lib/sync.js'
import { Button } from './ui.jsx'

export const SHARING_MODES = [
  { id: 'flags', label: 'Support signals only', description: 'Current signals that may need support. No check-in dates or individual answers.' },
  { id: 'digest', label: 'Summary counts', description: 'Check-in count for the last 30 days and number of active support signals. No dates or urgency details.' },
  { id: 'full', label: 'Overview and check-ins', description: 'Overall signal level, last check-in date, and check-in count. Individual answers stay private.' },
]

export default function SupportAccess() {
  const { state, authLoading } = useStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [mode, setMode] = useState('flags')
  const [records, setRecords] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function refresh() { setRecords(await listSupportAccess()) }
  useEffect(() => {
    let active = true
    setRecords([])
    if (state.accountId && !authLoading) listSupportAccess().then((rows) => { if (active) setRecords(rows) }).catch(() => { if (active) setMessage('Sharing could not be loaded.') })
    return () => { active = false }
  }, [state.accountId, authLoading])
  async function run(action) {
    setBusy(true); setMessage('')
    try { await action(); await refresh() }
    catch (error) { setMessage(error.message || 'Sharing could not be updated.') }
    finally { setBusy(false) }
  }
  if (!state.accountId) return <section className="stack-16">
    <h2>Invite someone you trust</h2>
    <p>Your choice. Sharing is separate from permission to use Maisie.</p>
    <Button onClick={() => navigate('/auth?next=/profile&source=post-onboarding')}>Save your tracker first</Button>
  </section>
  return <section className="stack-16">
    <h2 style={{ marginBottom: 0 }}>People you trust</h2>
    <p className="muted">Choose what each person can see. Private answers and daily pain ratings are never included.</p>
    <form onSubmit={(event) => {
      event.preventDefault()
      run(async () => {
        const invitation = await createSupportInvite(email, mode)
        const sent = await sendSupportInviteLink(email, invitation.id)
        setMessage(sent.ok ? 'Invitation sent. It expires in 7 days.' : 'Invitation created, but the email was not sent. Use Send email below to try again.')
        setEmail('')
      })
    }} className="stack-12">
      <label>Email address<input className="input" type="email" autoCapitalize="none" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label>What they can see<select className="input" value={mode} onChange={(event) => setMode(event.target.value)}>
        {SHARING_MODES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select></label>
      <p className="muted" style={{ fontSize: 13 }}>{SHARING_MODES.find((item) => item.id === mode).description}</p>
      <Button disabled={busy || authLoading} block>{busy ? 'Please wait...' : 'Send invitation'}</Button>
    </form>
    {message && <p role="status">{message}</p>}
    {records.map((record) => <article key={record.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 16, overflowWrap: 'anywhere' }}>
      <strong>{record.email}</strong><p className="muted">{record.status}</p>
      {record.kind === 'relationship' && record.status === 'active' && <label>Sharing level
        <select className="input" value={record.access_level} disabled={busy} onChange={(event) => run(() => manageSupportAccess(record.id, record.kind, event.target.value))}>
          {SHARING_MODES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <p className="muted" style={{ fontSize: 13 }}>{SHARING_MODES.find((item) => item.id === record.access_level)?.description}</p>
      </label>}
      {record.status === 'pending' && <Button variant="ghost" disabled={busy} onClick={() => run(async () => {
        const sent = await sendSupportInviteLink(record.email, record.id)
        if (!sent.ok) throw new Error('The email could not be sent. Try again later.')
        setMessage('Invitation email sent.')
      })}>Send email</Button>}
      {['active', 'pending'].includes(record.status) && <Button variant="ghost" disabled={busy} onClick={() => run(() => manageSupportAccess(record.id, record.kind))}>
        {record.status === 'pending' ? 'Cancel invitation' : 'Revoke access'}
      </Button>}
    </article>)}
  </section>
}
