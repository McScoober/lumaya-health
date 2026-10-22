// Messages — the in-app SMS channel (TRD Section 9)
// In production these are Twilio text messages; here they render as an inbox so
// the non-uniform cadence (6.2) is visible and testable. Shows persisted events
// (advisor/parent/confirmation) plus the upcoming scheduled cadence.
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { buildSchedule } from '../engine/notifications.js'
import { Card } from '../components/ui.jsx'
import MaisieLogo from '../components/MaisieLogo.jsx'
import { BellSimple, Drop, EnvelopeSimple } from '@phosphor-icons/react'

function fmtDay(d) {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function MessageIcon({ type, size = 20 }) {
  if (type === 'period_checkin') return <Drop size={size} aria-hidden="true" />
  if (type === 'phase_checkin' || type === 'luteal_nudge') {
    return <BellSimple size={size} aria-hidden="true" />
  }
  return <EnvelopeSimple size={size} aria-hidden="true" />
}

export default function Messages() {
  const navigate = useNavigate()
  const { state, dispatch, cycleModel } = useStore()

  useEffect(() => {
    if (state.messages.some((m) => !m.read)) dispatch({ type: 'MARK_MESSAGES_READ' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const schedule = useMemo(
    () => buildSchedule(cycleModel, state.profile, { days: 21 }),
    [cycleModel, state.profile],
  )

  return (
    <div className="screen screen--pad-bottom">
      <div className="row row--between" style={{ marginBottom: 6 }}>
        <h1 style={{ margin: 0 }}>Messages</h1>
        <span className="pill-tag">via SMS</span>
      </div>
      <p className="muted" style={{ fontSize: 13 }}>
        Maisie texts you — daily during your period, about weekly the rest of the month.
      </p>

      {state.messages.length > 0 && (
        <>
          <div className="card__label" style={{ marginTop: 12 }}>Recent</div>
          <div className="stack-12">
            {state.messages.map((m) => (
              <Card key={m.id} onClick={() => m.cta && navigate(m.cta)} role={m.cta ? 'button' : undefined}
                style={m.cta ? { cursor: 'pointer' } : undefined}>
                <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                  <MessageIcon type={m.channel} />
                  <div className="grow">
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14.5 }}>{m.title}</p>
                    <p className="muted" style={{ margin: '3px 0 0', fontSize: 13.5 }}>{m.body}</p>
                    {m.cta && <p style={{ margin: '8px 0 0', color: 'var(--accent-ink)', fontWeight: 600, fontSize: 13 }}>Tap to open →</p>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <div className="card__label" style={{ marginTop: 18 }}>Coming up</div>
      {schedule.length === 0 ? (
        <Card className="center">
          <MaisieLogo size={56} style={{ margin: '0 auto', opacity: 0.72 }} />
          <p className="muted" style={{ margin: '8px 0 0', fontSize: 13.5 }}>
            Log a daily check-in and your personalized cadence will appear here.
          </p>
        </Card>
      ) : (
        <div className="stack-12">
          {schedule.slice(0, 8).map((m, i) => (
            <div key={i} className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
              <div className="center" style={{ minWidth: 52 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 600 }}>{fmtDay(m.date)}</div>
              </div>
              <div className="sms grow">
                {m.body}
                <div className="sms__meta" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MessageIcon type={m.type} size={13} />
                  {m.title}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="muted center" style={{ fontSize: 11, marginTop: 18 }}>
        Reply STOP anytime to opt out (CTIA/CASL compliant).
      </p>
    </div>
  )
}
