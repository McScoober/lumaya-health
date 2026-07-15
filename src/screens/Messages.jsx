// Messages — the in-app SMS channel (TRD Section 9)
// In production these are Twilio text messages; here they render as an inbox so
// the non-uniform cadence (6.2) is visible and testable. Shows persisted events
// (advisor/parent/confirmation) plus the upcoming scheduled cadence.
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { buildSchedule } from '../engine/notifications.js'
import { Card } from '../components/ui.jsx'
import Mascot from '../components/Mascot.jsx'

function fmtDay(d) {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}
const TYPE_ICON = { period_checkin: '🩸', phase_checkin: '🌙', luteal_nudge: '🌙', system: '✉️' }

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
        Lumaya texts you — daily during your period, about weekly the rest of the month.
      </p>

      {state.messages.length > 0 && (
        <>
          <div className="card__label" style={{ marginTop: 12 }}>Recent</div>
          <div className="stack-12">
            {state.messages.map((m) => (
              <Card key={m.id} onClick={() => m.cta && navigate(m.cta)} role={m.cta ? 'button' : undefined}
                style={m.cta ? { cursor: 'pointer' } : undefined}>
                <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                  <span aria-hidden="true" style={{ fontSize: 20 }}>{TYPE_ICON[m.channel] || '✉️'}</span>
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
          <Mascot size={72} />
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
                <div className="sms__meta">{TYPE_ICON[m.type]} {m.title}</div>
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
