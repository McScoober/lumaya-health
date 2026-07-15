// Screen 1 — Welcome (TRD Section 4): logo, one-line description, privacy statement.
import { useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { Button } from '../components/ui.jsx'
import Mascot from '../components/Mascot.jsx'

export default function Welcome() {
  const navigate = useNavigate()
  const { state } = useStore()

  return (
    <div className="screen center" style={{ justifyContent: 'center' }}>
      <div className="spacer" />
      <div style={{ display: 'grid', placeItems: 'center', gap: 6 }}>
        <Mascot size={132} />
        <h1 style={{ fontSize: 40, margin: '10px 0 0', color: 'var(--accent-ink)' }}>Lumaya</h1>
        <p className="muted" style={{ fontSize: 17, maxWidth: 300 }}>
          A warm companion for your cycle — daily self-care tips, and a gentle heads-up when
          something’s worth a conversation.
        </p>
      </div>
      <div className="spacer" />

      <div className="card" style={{ textAlign: 'left', marginBottom: 18 }}>
        <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
          <span aria-hidden="true" style={{ fontSize: 22 }}>🔒</span>
          <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
            Your answers stay private and encrypted. Lumaya spots patterns — it never diagnoses,
            and it never sells your data.
          </p>
        </div>
      </div>

      <Button block onClick={() => navigate('/age')}>
        Get started
      </Button>
      {state.onboarded && (
        <Button variant="ghost" block onClick={() => navigate('/home')} style={{ marginTop: 8 }}>
          Continue to my dashboard →
        </Button>
      )}
      <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>For ages 13 and up.</p>
    </div>
  )
}
