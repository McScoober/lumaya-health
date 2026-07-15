// Screen 6 — Home / daily dashboard (TRD Section 6, 13.2)
// Calendar view, current phase, today's tip card, one-tap check-in CTA, streak.
// The background + card accents tint to the current predicted phase (13.2.3);
// BC users get a neutral pink/berry tint (no phase prediction).
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { phaseForDate, predictPeriod, monthMatrix, isInPeriodWindow, PHASE_META } from '../engine/cyclePredictor.js'
import { buildTip } from '../engine/tipEngine.js'
import { todaysMessages } from '../engine/notifications.js'
import { Card, Button, Badge } from '../components/ui.jsx'
import Mascot from '../components/Mascot.jsx'

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function Home() {
  const navigate = useNavigate()
  const { state, cycleModel } = useStore()
  const now = new Date()
  const todayKey = now.toISOString().slice(0, 10)
  const loggedToday = state.dailyLogs[todayKey]

  const { phase } = phaseForDate(cycleModel, now)
  const meta = phase ? PHASE_META[phase] : null
  const prediction = predictPeriod(cycleModel, now)
  const inWindow = isInPeriodWindow(cycleModel, now)

  const tip = useMemo(
    () => (phase ? buildTip(phase, { ...state.profile }) : null),
    [phase, state.profile],
  )
  const messages = useMemo(() => todaysMessages(cycleModel, state.profile, now), [cycleModel, state.profile])

  const [calMonth, setCalMonth] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const cells = useMemo(
    () => monthMatrix(cycleModel, calMonth.y, calMonth.m, state.dailyLogs),
    [cycleModel, calMonth, state.dailyLogs],
  )

  // Phase tint variables for the screen (13.2.3)
  const tintStyle = meta
    ? { '--phase-accent': meta.accent, '--phase-soft': meta.soft }
    : { '--phase-accent': 'var(--pink)', '--phase-soft': 'var(--pink-soft)' }

  const firstName = state.identity.name?.split(' ')[0] || 'there'
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="screen screen--pad-bottom" style={tintStyle}>
      {/* Header */}
      <div className="row row--between" style={{ marginBottom: 4 }}>
        <div>
          <p className="eyebrow" style={{ color: 'var(--phase-accent)' }}>{greeting}</p>
          <h1 style={{ margin: 0, fontSize: 26 }}>{firstName}</h1>
        </div>
        <div className="center">
          <div className="big-num" style={{ fontSize: 26, color: 'var(--phase-accent)' }}>
            {state.streak}🔥
          </div>
          <div className="muted" style={{ fontSize: 11 }}>day streak</div>
        </div>
      </div>

      {/* Phase card */}
      <Card accent style={{ marginTop: 12 }}>
        <div className="row row--between">
          <div>
            <div className="card__label">Right now</div>
            {meta ? (
              <>
                <h2 style={{ margin: '2px 0 2px', color: 'var(--phase-accent)' }}>{meta.label} phase</h2>
                <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>{meta.mood}</p>
              </>
            ) : (
              <>
                <h2 style={{ margin: '2px 0 2px' }}>Getting to know you</h2>
                <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
                  Log a couple of daily check-ins and we’ll start predicting your phases.
                </p>
              </>
            )}
          </div>
          <Mascot size={64} mood={phase === 'luteal' || phase === 'menstrual' ? 'sleepy' : 'happy'} />
        </div>
        {prediction && (
          <p className="muted" style={{ margin: '10px 0 0', fontSize: 13 }}>
            {inWindow
              ? '📍 You’re in your predicted period window.'
              : `📅 Next period in about ${Math.max(0, prediction.daysUntil)} day${prediction.daysUntil === 1 ? '' : 's'}.`}
          </p>
        )}
      </Card>

      {/* Daily check-in CTA */}
      <Card style={{ marginTop: 14 }}>
        {loggedToday ? (
          <div className="row" style={{ gap: 12 }}>
            <span aria-hidden="true" style={{ fontSize: 26 }}>{loggedToday.mood || '✅'}</span>
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>You’re checked in for today</p>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                {loggedToday.period ? 'Logged as a period day.' : 'See you tomorrow.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <p style={{ margin: '0 0 4px', fontWeight: 600 }}>
              {inWindow ? 'Did you get your period today?' : 'How are you feeling today?'}
            </p>
            <p className="muted" style={{ margin: '0 0 12px', fontSize: 13 }}>
              A quick tap keeps your predictions sharp.
            </p>
            <Button block onClick={() => navigate('/daily')}>Daily check-in</Button>
          </>
        )}
      </Card>

      {/* Today's tip card (13.2.5 card-stack feel) */}
      {tip && (
        <Card style={{ marginTop: 14 }} onClick={() => navigate(`/tip/${phase}`)} role="button" tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate(`/tip/${phase}`)}
          className="card">
          <div className="card__label">Today’s tip</div>
          <h3 style={{ margin: '2px 0 6px' }}>{tip.headline}</h3>
          <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>{tip.actions[0]}</p>
          <p style={{ margin: '10px 0 0', color: 'var(--phase-accent)', fontWeight: 600, fontSize: 13.5 }}>
            Tap to see how to take care of yourself →
          </p>
        </Card>
      )}

      {/* Messages preview */}
      {messages.length > 0 && (
        <Card style={{ marginTop: 14 }} onClick={() => navigate('/messages')} role="button" tabIndex={0}>
          <div className="row row--between">
            <div className="card__label" style={{ margin: 0 }}>💬 From Lumaya today</div>
            <span className="muted" style={{ fontSize: 12 }}>View all</span>
          </div>
          <p className="muted" style={{ margin: '8px 0 0', fontSize: 13.5 }}>{messages[0].body}</p>
        </Card>
      )}

      {/* Calendar */}
      <Card style={{ marginTop: 14 }}>
        <div className="row row--between" style={{ marginBottom: 10 }}>
          <button className="topbar__back" style={{ width: 34, height: 34 }} aria-label="Previous month"
            onClick={() => setCalMonth((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))}>‹</button>
          <strong style={{ fontFamily: 'var(--font-head)' }}>{MONTHS[calMonth.m]} {calMonth.y}</strong>
          <button className="topbar__back" style={{ width: 34, height: 34 }} aria-label="Next month"
            onClick={() => setCalMonth((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))}>›</button>
        </div>
        <div className="cal">
          {DOW.map((d, i) => <div key={i} className="cal__dow">{d}</div>)}
          {cells.map((cell, i) =>
            cell === null ? (
              <div key={i} />
            ) : (
              <div
                key={i}
                className={[
                  'cal__day',
                  cell.isToday ? 'cal__day--today' : '',
                  cell.actualPeriod ? 'cal__day--period' : cell.predictedPeriod ? 'cal__day--predicted' : '',
                  state.dailyLogs[cell.key] ? 'cal__day--logged' : '',
                ].join(' ')}
              >
                {cell.day}
              </div>
            ),
          )}
        </div>
        <div className="row" style={{ marginTop: 12, gap: 16, flexWrap: 'wrap', fontSize: 11 }}>
          <span className="row" style={{ gap: 6 }}><i style={{ width: 12, height: 12, borderRadius: 4, background: 'var(--phase-soft)', display: 'inline-block' }} /> Period</span>
          <span className="row" style={{ gap: 6 }}><i style={{ width: 12, height: 12, borderRadius: 4, border: '1px solid var(--phase-accent)', display: 'inline-block' }} /> Predicted</span>
          <span className="row" style={{ gap: 6 }}><i style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--phase-accent)', display: 'inline-block' }} /> Checked in</span>
        </div>
      </Card>

      {/* Last result reminder */}
      {state.result && (
        <Card style={{ marginTop: 14 }}>
          <div className="row row--between">
            <div className="card__label" style={{ margin: 0 }}>Your latest check-in</div>
            <Badge level={state.result.level} />
          </div>
        </Card>
      )}
    </div>
  )
}
