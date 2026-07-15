// Screen 10 — Parent / Support Dashboard, user-side controls (TRD Section 10)
// Under 18: opt-in dashboard tied to consent, with transparency modes (10.1.1).
// 18+: optional "support contact" invite, revocable (10.2).
// Individual answers are NEVER shared, at either age (10.3) — the trust boundary.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { Button, Card, PillTag } from '../components/ui.jsx'

const MODES = [
  { id: 'full', label: 'Full visibility', desc: 'Sees every check-in, every result-level update, and full history as it happens.' },
  { id: 'flags', label: 'Flags only', desc: 'Notified only when a result reaches Moderate or Urgent. Routine check-ins stay private.' },
  { id: 'digest', label: 'Monthly digest', desc: 'One rolled-up summary a month — overall trend, any flags, advisor status.' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { state, dispatch } = useStore()
  const isMinor = state.identity.isMinor

  return isMinor ? (
    <MinorDashboard state={state} dispatch={dispatch} navigate={navigate} />
  ) : (
    <AdultSupport state={state} dispatch={dispatch} navigate={navigate} />
  )
}

function TrustNote() {
  return (
    <Card style={{ marginTop: 14, background: 'var(--sage-soft)', borderColor: 'transparent' }}>
      <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
        <span aria-hidden="true" style={{ fontSize: 20 }}>🔒</span>
        <p style={{ margin: 0, fontSize: 13 }}>
          They only ever see your <strong>result level, advisor status, and check-in dates</strong> —
          never your individual answers, pain scores, or any condition detail. That’s true in every mode.
        </p>
      </div>
    </Card>
  )
}

function MinorDashboard({ state, dispatch, navigate }) {
  const active = state.identity.dashboardActive
  const [email, setEmail] = useState(state.identity.parentEmail)
  const mode = state.identity.transparencyMode

  return (
    <div className="screen screen--pad-bottom">
      <h1>Parent dashboard</h1>
      <p className="muted" style={{ fontSize: 13.5 }}>
        Your parent consented so you could use Lumaya — but whether they get an ongoing view is
        entirely your choice. You can turn it on or off any time.
      </p>

      {!active ? (
        <Card style={{ marginTop: 8 }}>
          <div className="card__label">Parent email</div>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="parent@example.com" style={{ marginBottom: 12 }} />
          <Button block disabled={!/.+@.+\..+/.test(email)} onClick={() => dispatch({ type: 'ACTIVATE_DASHBOARD', email })}>
            Turn on parent dashboard
          </Button>
          <p className="muted" style={{ fontSize: 12, marginTop: 10, marginBottom: 0 }}>
            You can skip this and turn it on later — even after a concerning result.
          </p>
        </Card>
      ) : (
        <>
          <Card accent style={{ marginTop: 8 }}>
            <div className="row row--between">
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>Dashboard is on</p>
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>{state.identity.parentEmail}</p>
              </div>
              <PillTag>Active</PillTag>
            </div>
          </Card>

          <div className="card__label" style={{ marginTop: 18 }}>How much they see</div>
          <div className="stack-12">
            {MODES.map((m) => (
              <Card
                key={m.id}
                onClick={() => dispatch({ type: 'SET_TRANSPARENCY', mode: m.id })}
                role="button"
                tabIndex={0}
                style={{
                  cursor: 'pointer',
                  borderColor: mode === m.id ? 'var(--accent)' : 'var(--line)',
                  borderWidth: mode === m.id ? 2 : 1,
                }}
              >
                <div className="row row--between">
                  <strong>{m.label}</strong>
                  {mode === m.id && <span style={{ color: 'var(--accent)' }}>✓</span>}
                </div>
                <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>{m.desc}</p>
              </Card>
            ))}
          </div>

          <Card style={{ marginTop: 14, background: 'var(--red-soft)', borderColor: 'transparent' }}>
            <p style={{ margin: 0, fontSize: 13 }}>
              <strong>Safety net:</strong> an Urgent result always notifies your parent right away,
              in every mode. That one never turns off.
            </p>
          </Card>

          <TrustNote />

          <Button variant="soft" block style={{ marginTop: 16 }} onClick={() => navigate('/parent')}>
            Preview what your parent sees
          </Button>
        </>
      )}
    </div>
  )
}

function AdultSupport({ state, dispatch, navigate }) {
  const contact = state.identity.supportContact
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  return (
    <div className="screen screen--pad-bottom">
      <h1>Support contact</h1>
      <p className="muted" style={{ fontSize: 13.5 }}>
        Totally optional. You can loop in someone you trust — a parent, partner, roommate, or no one
        at all. You’re in control, and you can revoke access whenever you want.
      </p>

      {!contact ? (
        <Card style={{ marginTop: 8 }}>
          <div className="field">
            <label>Their name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sam" />
          </div>
          <div className="field">
            <label>Their email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="them@example.com" />
          </div>
          <Button block disabled={!name.trim() || !/.+@.+\..+/.test(email)}
            onClick={() => dispatch({ type: 'INVITE_SUPPORT', contact: { name: name.trim(), email: email.trim() } })}>
            Invite {name.trim() || 'them'}
          </Button>
        </Card>
      ) : (
        <>
          <Card accent style={{ marginTop: 8 }}>
            <div className="row row--between">
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>{contact.name}</p>
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>{contact.email}</p>
              </div>
              <PillTag>Invited</PillTag>
            </div>
          </Card>
          <TrustNote />
          <Button variant="soft" block style={{ marginTop: 14 }} onClick={() => navigate('/parent')}>
            Preview what {contact.name} sees
          </Button>
          <Button variant="ghost" block style={{ marginTop: 6, color: 'var(--red)' }}
            onClick={() => dispatch({ type: 'REVOKE_SUPPORT' })}>
            Revoke access
          </Button>
        </>
      )}
    </div>
  )
}
