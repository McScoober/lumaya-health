// Screen 6, Home / daily dashboard (TRD Section 6, 13.2)
// Calendar view, current phase, today's tip card, one-tap check-in CTA, streak.
// The background + card accents tint to the current predicted phase (13.2.3);
// BC users get a neutral pink/berry tint (no phase prediction).
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { phaseForDate, predictPeriod, monthMatrix, isInPeriodWindow, PHASE_META } from '../engine/cyclePredictor.js'
import { buildTip, maisieMessage } from '../engine/tipEngine.js'
import { Card, Button, Badge } from '../components/ui.jsx'
import Mascot from '../components/Mascot.jsx'
import MetabolicCard from '../components/MetabolicCard.jsx'
import { CheckCircle, SmileyWink, Smiley, SmileyMeh, SmileySad, SmileyBlank } from '@phosphor-icons/react'

const VIBE_ICONS = [
  { key: 'great', Icon: SmileyWink, color: '#A0C4A4' },
  { key: 'good', Icon: Smiley, color: '#E8C86A' },
  { key: 'okay', Icon: SmileyMeh, color: '#C4A8E0' },
  { key: 'bad', Icon: SmileySad, color: '#E8A0B0' },
  { key: 'awful', Icon: SmileyBlank, color: '#E0528A' },
]

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

/* Mock data for placeholders since engine isn't connected yet */
const MOCK_SIGNALS = {
  energy: { val: 'Normal', desc: 'Energy is steady.', trend: [3, 3, 2, 3, 4, 3, 3, 3] },
  skin: { val: 'Clear', desc: 'No flares this cycle.', trend: [5, 4, 5, 5, 5, 5] },
  sleep: { val: 'Solid', desc: 'Consistent 8 hours.', trend: [4, 4, 3, 4, 4, 3, 5] },
  mood: { val: 'Steadier', desc: 'Steadier than last cycle.', trend: [3, 4, 3, 3, 4, 4] }
}
export default function Home() {
  const navigate = useNavigate()
  const { state, cycleModel } = useStore()
  const now = new Date()
  const todayKey = now.toISOString().slice(0, 10)
  const loggedToday = state.dailyLogs[todayKey]

  const { phase, dayOfCycle } = phaseForDate(cycleModel, now)
  const cycleDay = dayOfCycle === null || dayOfCycle === undefined ? 1 : dayOfCycle + 1
  const meta = phase ? PHASE_META[phase] : null
  const prediction = predictPeriod(cycleModel, now)
  const inWindow = isInPeriodWindow(cycleModel, now)

  const tip = useMemo(
    () => (phase ? buildTip(phase, { ...state.profile }) : null),
    [phase, state.profile],
  )
  const todayMaisieMsg = useMemo(
    () => (phase ? maisieMessage(phase, cycleDay, state.profile) : 'Your body is telling you something every day. Maisie helps you hear it.'),
    [phase, cycleDay, state.profile]
  )

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
                  Log a couple of daily check-ins and we'll start predicting your phases.
                </p>
              </>
            )}
          </div>
          <Mascot size={64} mood={phase === 'luteal' || phase === 'menstrual' ? 'sleepy' : 'happy'} />
        </div>
        {prediction && (
          <p className="muted" style={{ margin: '10px 0 0', fontSize: 13 }}>
            {inWindow
              ? "📍 You're in your predicted period window."
              : `📅 Next period in about ${Math.max(0, prediction.daysUntil)} day${prediction.daysUntil === 1 ? '' : 's'}.`}
          </p>
        )}
      </Card>

      {/* Daily check-in CTA */}
      <Card style={{ marginTop: 14 }}>
        {loggedToday ? (
          <div className="row" style={{ gap: 12, alignItems: 'center' }}>
            <span
              aria-hidden="true"
              style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                background: '#F0F5F0',
                color: '#A0C4A4',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CheckCircle size={24} weight="fill" />
            </span>
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>You're checked in for today</p>
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

      {/* Phase header is currently just using the app-frame tint.
          TRD says: "The header tints to match the current cycle phase!"
          This is handled by `--phase-accent` applied to `.app-frame` via tintStyle. 
          The text itself for the phase is already in meta.label.
      */}

      <div style={{ marginTop: 24 }} className="stack-16">
        <MetabolicCard title="Energy" value={MOCK_SIGNALS.energy.val} color="var(--signal-energy)" description={MOCK_SIGNALS.energy.desc} trendPoints={MOCK_SIGNALS.energy.trend} />
        <MetabolicCard title="Skin" value={MOCK_SIGNALS.skin.val} color="var(--signal-skin)" description={MOCK_SIGNALS.skin.desc} trendPoints={MOCK_SIGNALS.skin.trend} />
        <MetabolicCard title="Sleep" value={MOCK_SIGNALS.sleep.val} color="var(--signal-sleep)" description={MOCK_SIGNALS.sleep.desc} trendPoints={MOCK_SIGNALS.sleep.trend} />
        <MetabolicCard title="Mood" value={MOCK_SIGNALS.mood.val} color="var(--signal-mood)" description={MOCK_SIGNALS.mood.desc} trendPoints={MOCK_SIGNALS.mood.trend} />
      </div>

      <div style={{ marginTop: 24 }}>
        <Card accent>
          <div className="card__label" style={{ color: 'var(--phase-accent)' }}>From Maisie Today</div>
          <p style={{ margin: '4px 0 0', fontWeight: 500, fontSize: 14.5, lineHeight: 1.5 }}>
            {todayMaisieMsg}
          </p>
        </Card>
      </div>

      {tip && (
        <div style={{ marginTop: 14 }}>
          <Card>
            <div className="card__label" style={{ color: 'var(--phase-accent)' }}>Today's Tip</div>
            <h2 style={{
              margin: '4px 0 10px',
              color: '#2C1810',
              fontFamily: "'Fraunces', serif",
              fontSize: 21,
              lineHeight: 1.2,
            }}>
              {tip.headline}
            </h2>
            {tip.actions[0] && (
              <p style={{
                margin: '0 0 8px',
                color: '#2C1810',
                fontSize: 14.5,
                fontWeight: 600,
                lineHeight: 1.45,
              }}>
                {tip.actions[0]}
              </p>
            )}
            <p style={{
              margin: 0,
              color: '#5C3D2E',
              fontSize: 13.5,
              lineHeight: 1.5,
            }}>
              {tip.why}
            </p>
          </Card>
        </div>
      )}

      {/* Quick Vibe Check (TRD 6.6) */}
      <Card style={{ marginTop: 14 }}>
        <p className="eyebrow">Quick Vibe Check</p>
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 12, gap: 8 }}>
          {VIBE_ICONS.map(({ key, Icon, color }) => (
            <button
              key={key}
              onClick={() => navigate('/log/0')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 0',
                background: `color-mix(in srgb, ${color} 14%, transparent)`,
                border: `1.5px solid color-mix(in srgb, ${color} 30%, transparent)`,
                borderRadius: '16px',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, background 0.15s ease',
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <Icon size={28} weight="duotone" color={color} />
            </button>
          ))}
        </div>
      </Card>

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
