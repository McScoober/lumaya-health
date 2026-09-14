// Parent / Support summary view (TRD Section 10.1–10.3)
// The authorized, summary-level lookup a parent or support contact sees.
// Result level + advisor status + check-in dates/levels only — never answers.
// Honors the active transparency mode (10.1.1) and the urgent safety override.
import { useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { Badge, Card, Button } from '../components/ui.jsx'
import Mascot from '../components/Mascot.jsx'

const CONVO_STARTERS = [
  '“I saw your Maisie check-in flagged something — want to talk about it, or would you rather I just know an advisor’s involved?”',
  '“No pressure at all, but I’m here if your cycle’s been rough lately. Anything you want me to pick up for you?”',
  '“Would it help to book time with a doctor together, or do you want to handle it your way first?”',
]

const EDU_LIBRARY = [
  { t: 'What actually counts as a “normal” cycle?', d: 'Ranges are wide and change with age. Here’s what’s typical — and what isn’t worth panicking over.' },
  { t: 'When is period pain worth seeing someone about?', d: 'Some cramping is expected. These are the signs that it’s more than everyday discomfort.' },
  { t: 'How to ask without making her feel watched', d: 'Short, low-pressure openers that keep the door open instead of shutting it.' },
]

export default function ParentView() {
  const navigate = useNavigate()
  const { state, dispatch } = useStore()
  const { identity, result, checkinHistory, advisorRequests } = state
  const mode = identity.transparencyMode
  const name = identity.name?.split(' ')[0] || 'her'

  // Flags-only: hide routine Clear/Mild from the visible level + history (10.1.1).
  const level = result?.level
  const isRoutine = level === 'Clear' || level === 'Mild'
  const showLevel = mode === 'flags' ? (isRoutine ? null : level) : level
  const visibleHistory =
    mode === 'flags'
      ? checkinHistory.filter((h) => h.level === 'Moderate' || h.level === 'Urgent')
      : checkinHistory
  const advisorStatus = advisorRequests.length > 0 ? 'An advisor is involved' : 'No advisor needed right now'
  const lastCheckin = checkinHistory[checkinHistory.length - 1]?.date

  return (
    <div className="screen screen--pad-bottom">
      <div className="row row--between" style={{ marginBottom: 4 }}>
        <div>
          <p className="eyebrow">Support view</p>
          <h1 style={{ margin: 0 }}>{name}’s Maisie</h1>
        </div>
        <Mascot size={56} />
      </div>

      <div className="seg" style={{ marginTop: 10 }}>
        {['full', 'flags', 'digest'].map((m) => (
          <button 
            key={m} 
            aria-pressed={mode === m}
            onClick={() => dispatch({ type: 'SET_TRANSPARENCY', mode: m })}
          >
            {m === 'full' ? 'Full' : m === 'flags' ? 'Flags only' : 'Digest'}
          </button>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
        {name} controls this. Current mode: <strong>{mode}</strong> — she can see it too, so it’s never a surprise.
      </p>

      {mode === 'digest' ? (
        <Card accent style={{ marginTop: 12 }}>
          <div className="card__label">This month at a glance</div>
          <h3 style={{ margin: '2px 0 6px' }}>Overall: steady</h3>
          <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
            {visibleHistory.some((h) => h.level === 'Moderate' || h.level === 'Urgent')
              ? 'One or more flags were raised this month.'
              : 'No flags raised this month.'}{' '}
            {advisorStatus}.
          </p>
        </Card>
      ) : (
        <Card style={{ marginTop: 12 }}>
          <div className="row row--between">
            <div>
              <div className="card__label">Current status</div>
              {showLevel ? <Badge level={showLevel} /> : <span className="muted">Private — no flag raised</span>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="card__label">Last check-in</div>
              <strong style={{ fontSize: 13 }}>{lastCheckin || '—'}</strong>
            </div>
          </div>
          <hr className="divider" />
          <div className="card__label">Advisor</div>
          <p style={{ margin: 0, fontSize: 14 }}>{advisorStatus}</p>
        </Card>
      )}

      {level === 'Urgent' && (
        <Card style={{ marginTop: 14, background: 'var(--red-soft)', borderColor: 'transparent' }}>
          <p style={{ margin: 0, fontSize: 13.5 }}>
            <strong>Heads up:</strong> an urgent result was raised. You’re being notified in full
            because an urgent flag overrides every visibility mode.
          </p>
        </Card>
      )}

      {mode !== 'digest' && visibleHistory.length > 0 && (
        <>
          <div className="card__label" style={{ marginTop: 18 }}>Check-in history</div>
          <Card>
            {visibleHistory.slice().reverse().map((h, i) => (
              <div key={i} className="row row--between" style={{ padding: '8px 0', borderBottom: i < visibleHistory.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <span className="muted" style={{ fontSize: 13.5 }}>{h.date}</span>
                <Badge level={h.level} />
              </div>
            ))}
          </Card>
        </>
      )}

      <div className="card__label" style={{ marginTop: 18 }}>Ways to start the conversation</div>
      <div className="stack-12">
        {CONVO_STARTERS.map((c, i) => (
          <Card key={i}><p style={{ margin: 0, fontSize: 14 }}>{c}</p></Card>
        ))}
      </div>

      <div className="card__label" style={{ marginTop: 18 }}>For you — a short library</div>
      <div className="stack-12">
        {EDU_LIBRARY.map((a, i) => (
          <Card key={i}>
            <strong>{a.t}</strong>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>{a.d}</p>
          </Card>
        ))}
      </div>

      <Card style={{ marginTop: 14, background: 'var(--sage-soft)', borderColor: 'transparent' }}>
        <p style={{ margin: 0, fontSize: 12.5 }}>
          🔒 You’ll never see {name}’s individual answers, pain scores, or private health details. That
          boundary is what keeps her answering honestly.
        </p>
      </Card>

      <Button variant="ghost" block style={{ marginTop: 14 }} onClick={() => navigate(-1)}>
        Close preview
      </Button>
    </div>
  )
}
