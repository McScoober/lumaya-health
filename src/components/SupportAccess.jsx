import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EnvelopeSimple, PaperPlaneTilt, ShieldCheck, UserPlus } from '@phosphor-icons/react'
import { useStore } from '../state/store.jsx'
import { createSupportInvite, listSupportAccess, manageSupportAccess, sendSupportInviteLink } from '../lib/sync.js'
import { Button, Card } from './ui.jsx'
import InlineDropdown from './InlineDropdown.jsx'

export const SHARING_MODES = [
  { id: 'flags', label: 'Support signals only', description: 'Signals that may need support, without check-in dates or individual answers.' },
  { id: 'digest', label: 'Summary counts', description: 'Check-in and signal totals from the last 30 days, without dates or urgency details.' },
  { id: 'full', label: 'Overview and check-ins', description: 'Overall signal level, latest check-in date, and check-in count. Individual answers stay private.' },
]

function sharingMode(mode) {
  return SHARING_MODES.find((item) => item.id === mode) || SHARING_MODES[0]
}

function currentRecords(records) {
  const priority = { active: 2, pending: 1 }
  const byEmail = new Map()
  for (const record of records.filter((item) => priority[item.status])) {
    const key = String(record.email || '').toLowerCase()
    const existing = byEmail.get(key)
    if (!existing || priority[record.status] > priority[existing.status]) byEmail.set(key, record)
  }
  return [...byEmail.values()].sort((a, b) => priority[b.status] - priority[a.status])
}

export default function SupportAccess() {
  const { state, authLoading } = useStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [mode, setMode] = useState('flags')
  const [records, setRecords] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const visibleRecords = useMemo(() => currentRecords(records), [records])

  async function refresh() { setRecords(await listSupportAccess()) }

  useEffect(() => {
    let active = true
    setRecords([])
    if (state.accountId && !authLoading) {
      listSupportAccess()
        .then((rows) => { if (active) setRecords(rows) })
        .catch(() => { if (active) setMessage('Sharing could not be loaded.') })
    }
    return () => { active = false }
  }, [state.accountId, authLoading])

  async function run(action) {
    setBusy(true)
    setMessage('')
    try {
      await action()
      await refresh()
    } catch (error) {
      setMessage(error.message || 'Sharing could not be updated.')
    } finally {
      setBusy(false)
    }
  }

  if (!state.accountId) {
    return (
      <Card className="support-save-card">
        <ShieldCheck size={26} weight="duotone" aria-hidden="true" />
        <h2>Invite someone you trust</h2>
        <p className="muted">Save your tracker before choosing who can see a support summary.</p>
        <Button onClick={() => navigate('/auth?next=/profile&source=post-onboarding')}>Save your tracker</Button>
      </Card>
    )
  }

  return (
    <section className="trusted-access">
      <header className="trusted-access__header">
        <p className="eyebrow">Private sharing</p>
        <h2>People you trust</h2>
        <p className="muted">You choose what each person can see. Your answers and daily pain ratings stay private.</p>
      </header>

      <Card className="support-invite-card">
        <div className="support-section-title">
          <span className="support-section-title__icon"><UserPlus size={19} weight="bold" aria-hidden="true" /></span>
          <div>
            <h3>Invite someone</h3>
            <p>They’ll receive a private sign-in link.</p>
          </div>
        </div>

        <form
          className="support-form"
          onSubmit={(event) => {
            event.preventDefault()
            run(async () => {
              const invitation = await createSupportInvite(email, mode)
              const sent = await sendSupportInviteLink(email, invitation.id)
              setMessage(sent.ok ? 'Invitation sent. It expires in 7 days.' : 'Invitation saved, but the email could not be sent. Try sending it again below.')
              setEmail('')
            })
          }}
        >
          <label htmlFor="support-email">Email address</label>
          <div className="support-input-wrap">
            <EnvelopeSimple size={20} aria-hidden="true" />
            <input
              id="support-email"
              className="support-input"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoComplete="email"
              maxLength={254}
              required
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <label htmlFor="support-mode">What they can see</label>
          <InlineDropdown id="support-mode" value={mode} options={SHARING_MODES.map((item) => ({ value: item.id, label: item.label }))} placeholder="Choose sharing level" onChange={setMode} />
          <p className="support-mode-description">{sharingMode(mode).description}</p>

          <Button disabled={busy || authLoading} block>
            <PaperPlaneTilt size={19} weight="fill" aria-hidden="true" />
            {busy ? 'Sending...' : 'Send invitation'}
          </Button>
        </form>
      </Card>

      {message && <p className="support-message" role="status">{message}</p>}

      <div className="support-list-heading">
        <h3>Shared with</h3>
        <span>{visibleRecords.length}</span>
      </div>

      {visibleRecords.length === 0 ? (
        <div className="support-empty">
          <ShieldCheck size={25} weight="duotone" aria-hidden="true" />
          <div>
            <strong>No one has access yet</strong>
            <p>Invitations and active connections will appear here.</p>
          </div>
        </div>
      ) : (
        <div className="support-people">
          {visibleRecords.map((record) => {
            const selectedMode = sharingMode(record.access_level)
            const isActive = record.status === 'active'
            return (
              <article className="support-person" key={record.id}>
                <div className="support-person__header">
                  <span className="support-avatar" aria-hidden="true">{record.email?.charAt(0).toUpperCase() || '?'}</span>
                  <div className="support-person__identity">
                    <strong>{record.email}</strong>
                    <span className={`support-status support-status--${record.status}`}>
                      {isActive ? 'Active' : 'Invitation pending'}
                    </span>
                  </div>
                </div>

                {isActive ? (
                  <div className="support-person__controls">
                    <label htmlFor={`sharing-${record.id}`}>Sharing level</label>
                    <InlineDropdown
                      id={`sharing-${record.id}`}
                      value={record.access_level}
                      options={SHARING_MODES.map((item) => ({ value: item.id, label: item.label }))}
                      placeholder="Choose sharing level"
                      disabled={busy}
                      onChange={(nextMode) => run(() => manageSupportAccess(record.id, record.kind, nextMode))}
                    />
                    <p className="support-mode-description">{selectedMode.description}</p>
                  </div>
                ) : (
                  <p className="support-mode-description">Waiting for them to accept the email invitation.</p>
                )}

                <div className="support-person__actions">
                  {!isActive && (
                    <Button variant="ghost" disabled={busy} onClick={() => run(async () => {
                      const sent = await sendSupportInviteLink(record.email, record.id)
                      if (!sent.ok) throw new Error('The email could not be sent. Try again later.')
                      setMessage('Invitation email sent again.')
                    })}>
                      Send again
                    </Button>
                  )}
                  <Button variant="ghost" disabled={busy} onClick={() => run(() => manageSupportAccess(record.id, record.kind))}>
                    {isActive ? 'Remove access' : 'Cancel invitation'}
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
