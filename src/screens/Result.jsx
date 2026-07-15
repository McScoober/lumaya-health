// Screen 5 — First result (TRD Section 8.3 + 13.1)
// Clear / Mild / Moderate / Urgent badge. Pattern-dependent (Tier 2) flags are
// capped at a soft message on this first pass. Condition names are never shown —
// only the urgency level and the advisor pathway.
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { LEVEL, LEVEL_COPY } from '../engine/scoring.js'
import { Button, Badge, Card } from '../components/ui.jsx'
import Mascot from '../components/Mascot.jsx'

export default function Result() {
  const navigate = useNavigate()
  const { state, dispatch } = useStore()
  const result = state.result

  // Simulate parent/advisor notifications on first result (Section 10.1 safety net).
  useEffect(() => {
    if (!result) return
    if (state.identity.isMinor && result.level === LEVEL.URGENT && state.identity.dashboardActive) {
      dispatch({
        type: 'ADD_MESSAGE',
        message: {
          id: 'r-' + Date.now(),
          at: new Date().toISOString(),
          channel: 'system',
          title: 'Support contact notified',
          body: 'Because this result is urgent, your parent/guardian was notified right away — that safety net stays on in every mode.',
          read: false,
        },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!result) {
    return (
      <div className="screen center" style={{ justifyContent: 'center' }}>
        <p className="muted">No result yet.</p>
        <Button onClick={() => navigate('/checkin')}>Take the check-in</Button>
      </div>
    )
  }

  const copy = LEVEL_COPY[result.level]
  const mascotMood = result.level === LEVEL.URGENT ? 'sad' : result.level === LEVEL.CLEAR ? 'happy' : 'happy'
  const softFlags = result.flags.filter((f) => f.tier === 2 && !f.confirmed)

  return (
    <div className="screen center">
      <div style={{ marginTop: 10 }}>
        <Mascot size={104} mood={mascotMood} />
      </div>

      <div style={{ marginTop: 6 }}>
        <Badge level={result.level} />
      </div>

      <h1 style={{ marginTop: 16, fontSize: 27 }}>{copy.title}</h1>
      <p className="muted" style={{ maxWidth: 320 }}>{copy.body}</p>

      {softFlags.length > 0 && result.level !== LEVEL.URGENT && (
        <Card className="card--accent" style={{ textAlign: 'left', marginTop: 8 }}>
          <div className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
            <span aria-hidden="true" style={{ fontSize: 20 }}>🌱</span>
            <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
              We spotted a small pattern worth watching. Nothing to do right now — Lumaya will
              quietly check for it again over your next cycle before saying more.
            </p>
          </div>
        </Card>
      )}

      {result.needsAdvisor && (
        <Card style={{ textAlign: 'left', marginTop: 14, borderColor: 'var(--berry)', borderWidth: 1.5 }}>
          <p style={{ fontWeight: 600, margin: '0 0 6px', color: 'var(--berry)' }}>
            Talk to a Lumaya advisor
          </p>
          <p className="muted" style={{ margin: '0 0 14px', fontSize: 13.5 }}>
            A real person can review your results and reach out within 48 hours. No booking, no
            referral needed.
          </p>
          <Button block onClick={() => navigate('/advisor')}>
            Connect with an advisor
          </Button>
        </Card>
      )}

      <div className="spacer" />
      <Button variant={result.needsAdvisor ? 'soft' : 'primary'} block onClick={() => navigate('/home')} style={{ marginTop: 20 }}>
        {result.needsAdvisor ? 'Maybe later — go to my home' : 'Go to my home'}
      </Button>
      <p className="muted center" style={{ fontSize: 12, marginTop: 12, maxWidth: 300 }}>
        Lumaya spots patterns, it doesn’t diagnose. An advisor explains any specifics.
      </p>
    </div>
  )
}
