// Screen 8 — Phase tip detail (TRD Section 6.4)
// Opens from a phase-tip notification. Headline, plain-language "why", and the
// self-care action list. No clinical terminology (13.1).
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { buildTip } from '../engine/tipEngine.js'
import { PHASE_META } from '../engine/cyclePredictor.js'
import { Card, TopBar, PillTag } from '../components/ui.jsx'
import Mascot from '../components/Mascot.jsx'

export default function PhaseTip() {
  const { phase } = useParams()
  const navigate = useNavigate()
  const { state } = useStore()
  const tip = buildTip(phase, state.profile)
  const meta = PHASE_META[phase] || PHASE_META.luteal

  const tint = { '--phase-accent': meta.accent, '--phase-soft': meta.soft }

  return (
    <div className="screen" style={tint}>
      <TopBar title={`${meta.label} phase`} onBack={() => navigate('/home')} />

      <Card accent style={{ marginTop: 8, textAlign: 'center' }}>
        <Mascot size={80} mood={phase === 'luteal' || phase === 'menstrual' ? 'sleepy' : 'happy'} />
        <h1 style={{ margin: '8px 0 0', fontSize: 23 }}>{tip.headline}</h1>
      </Card>

      <Card style={{ marginTop: 14 }}>
        <div className="card__label">Why this happens</div>
        <p style={{ margin: 0, fontSize: 15 }}>{tip.why}</p>
      </Card>

      <Card style={{ marginTop: 14 }}>
        <div className="card__label">A few things that help</div>
        <ul className="list-check">
          {tip.actions.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      </Card>

      {tip.tags.length > 0 && (
        <div className="row" style={{ gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <span className="muted" style={{ fontSize: 12 }}>Tuned for:</span>
          {tip.tags.map((t) => (
            <PillTag key={t}>{labelForTag(t)}</PillTag>
          ))}
        </div>
      )}

      <p className="muted center" style={{ fontSize: 12, marginTop: 20 }}>
        General self-care, not medical advice.
      </p>
    </div>
  )
}

function labelForTag(t) {
  return {
    student: 'Student',
    athlete: 'Athlete',
    nightOwl: 'Night owl',
    earlyBird: 'Early riser',
    onBirthControl: 'On birth control',
  }[t] || t
}
