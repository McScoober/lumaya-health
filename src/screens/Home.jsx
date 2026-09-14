// Screen 6, Home / daily dashboard (TRD Section 6, 13.2)
// Calendar view, current phase, today's tip card, one-tap check-in CTA, recent activity.
// The background + card accents tint to the current predicted phase (13.2.3);
// BC users get a neutral pink/berry tint (no phase prediction).
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { addDays, dateKeyLocal, diffDays, phaseForDate, predictPeriod, isInPeriodWindow, PHASE_META, periodStartKeys, hasThreeFullCycles } from '../engine/cyclePredictor.js'
import { buildTip, maisieMessage } from '../engine/tipEngine.js'
import { deriveBodySignals } from '../engine/bodySignals.js'
import { Card, Button } from '../components/ui.jsx'
import Mascot from '../components/Mascot.jsx'
import MetabolicCard from '../components/MetabolicCard.jsx'
import ProgressiveCheckin from './ProgressiveCheckin.jsx'
import { CheckCircle, Gear } from '@phosphor-icons/react'

function recentCheckInCount(dailyLogs = {}, today = new Date(), days = 5) {
  let count = 0
  for (let i = 0; i < days; i++) {
    const key = dateKeyLocal(addDays(today, -i))
    const log = dailyLogs[key]
    if (log?.checkinCompleted || log?.mood || log?.vibe !== undefined || log?.symptoms?.length || log?.pain !== undefined || log?.impact !== undefined) {
      count += 1
    }
  }
  return count
}

export default function Home() {
  const navigate = useNavigate()
  const { state, dispatch, cycleModel } = useStore()
  const [selectedSignal, setSelectedSignal] = useState(null)
  const now = new Date()
  const todayKey = dateKeyLocal(now)
  const todayLog = state.dailyLogs[todayKey] || {}
  const todayPeriodLog = state.periodLogs[todayKey] || {}
  const checkedInToday = todayLog.checkinCompleted === true

  const periodStarts = periodStartKeys(state.periodLogs)
  const predictionsReady = hasThreeFullCycles(state.periodLogs)
  const supportPhaseInfo = phaseForDate(cycleModel, now)
  const supportPhase = supportPhaseInfo.phase
  const supportCycleDay = supportPhaseInfo.dayOfCycle === null || supportPhaseInfo.dayOfCycle === undefined
    ? 1
    : supportPhaseInfo.dayOfCycle + 1
  const { phase, dayOfCycle } = predictionsReady
    ? phaseForDate(cycleModel, now)
    : { phase: null, dayOfCycle: null }
  const meta = phase ? PHASE_META[phase] : null
  const prediction = predictionsReady ? predictPeriod(cycleModel, now) : null
  const inWindow = predictionsReady ? isInPeriodWindow(cycleModel, now) : false
  const latestPeriodStartKey = periodStarts[periodStarts.length - 1]
  const daysSinceLatestPeriod = latestPeriodStartKey
    ? diffDays(now, new Date(`${latestPeriodStartKey}T00:00:00`))
    : null
  const isPeriodAskWindow = predictionsReady && prediction
    ? diffDays(now, addDays(prediction.windowStart, -3)) >= 0 && diffDays(now, prediction.windowEnd) <= 0
    : false
  const isEarlyPeriodAskWindow = !predictionsReady &&
    daysSinceLatestPeriod !== null &&
    daysSinceLatestPeriod >= 21 &&
    daysSinceLatestPeriod <= 38
  const periodStartedToday = todayPeriodLog.period === true
  const possiblePeriodToday = todayPeriodLog.status === 'possible' && todayPeriodLog.period !== true
  const shouldShowPeriodStartCard = (possiblePeriodToday || isPeriodAskWindow || isEarlyPeriodAskWindow) &&
    (!todayPeriodLog.periodPromptAnswered || periodStartedToday || possiblePeriodToday)
  const baselineTitle = periodStartedToday
    ? 'Period logged today'
    : checkedInToday
      ? 'Today is logged'
      : latestPeriodStartKey
        ? 'Building your baseline'
        : 'Ready when you are'
  const baselineBody = latestPeriodStartKey
    ? `Last period start: ${new Date(`${latestPeriodStartKey}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${daysSinceLatestPeriod !== null ? ` (${Math.max(0, daysSinceLatestPeriod)} day${daysSinceLatestPeriod === 1 ? '' : 's'} ago)` : ''}. Keep logging to make Maisie more accurate.`
    : 'Log your period start and quick daily check-ins. Maisie gets more accurate as it learns your rhythm.'
  const phaseSubtitle = meta?.mood

  const tip = useMemo(
    () => (supportPhase
      ? buildTip(supportPhase, { ...state.profile })
      : {
        headline: 'A tiny reset counts.',
        why: 'Maisie needs more cycle history before timing-based predictions, but you can still support your body today.',
        actions: ['Drink some water, eat something steady, and log what you notice.'],
      }),
    [supportPhase, state.profile],
  )
  const todayMaisieMsg = useMemo(
    () => (supportPhase ? maisieMessage(supportPhase, supportCycleDay, state.profile) : 'Your body is telling you something every day. Maisie helps you hear it.'),
    [supportPhase, supportCycleDay, state.profile]
  )
  const signals = useMemo(
    () => deriveBodySignals(state.dailyLogs, state.profile, { days: 8, today: now }),
    [state.dailyLogs, state.profile, todayKey],
  )



  // Phase tint variables for the screen (13.2.3)
  const tintStyle = meta
    ? { '--phase-accent': meta.accent, '--phase-soft': meta.soft }
    : { '--phase-accent': 'var(--pink)', '--phase-soft': 'var(--pink-soft)' }

  const firstName = state.identity.name?.split(' ')[0] || 'there'
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const recentLogs = recentCheckInCount(state.dailyLogs, now)

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
            {recentLogs}
          </div>
          <div className="muted" style={{ fontSize: 11 }}>days logged this week</div>
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
                <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>{phaseSubtitle}</p>
              </>
            ) : (
              <>
                <h2 style={{ margin: '2px 0 2px' }}>{baselineTitle}</h2>
                <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
                  {baselineBody}
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

      {/* Daily check-in CTA */}
      <Card style={{ marginTop: 14 }}>
        {checkedInToday ? (
          <>
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
                  See you tomorrow.
                </p>
              </div>
            </div>

          </>
        ) : (
          <>
            <p style={{ margin: '0 0 4px', fontWeight: 600 }}>
              How are you feeling today?
            </p>
            <p className="muted" style={{ margin: '0 0 12px', fontSize: 13 }}>
              A quick tap helps Maisie learn your real patterns.
            </p>
            <Button block onClick={() => navigate('/daily')}>Daily check-in</Button>
          </>
        )}
      </Card>

      {/* Progressive onboarding mini-cards (fast-start users only) */}
      <ProgressiveCheckin />

      {shouldShowPeriodStartCard && (
        <Card style={{ marginTop: 14, background: '#FDEEF4', borderColor: 'rgba(224,82,138,0.35)' }}>
          {periodStartedToday ? (
            <>
              <p style={{ margin: '0 0 4px', color: '#2C1810', fontSize: 15, fontWeight: 700 }}>
                Got it, your period started today.
              </p>
              <p style={{ margin: 0, color: '#5C3D2E', fontSize: 13.5, lineHeight: 1.45 }}>
                I’ll use today as your new cycle start.
              </p>
            </>
          ) : (
            <>
              <p style={{ margin: '0 0 10px', color: '#2C1810', fontSize: 15, fontWeight: 700 }}>
                {possiblePeriodToday
                  ? 'Still on your period today?'
                  : predictionsReady
                    ? 'Did your period start today?'
                    : 'Any period or spotting today?'}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => dispatch({
                    type: 'UPDATE_PERIOD_STATUS',
                    dateKey: todayKey,
                    period: true,
                    periodPromptAnswered: true,
                  })}
                  style={{
                    minHeight: 42,
                    border: '1.5px solid #E0528A',
                    borderRadius: 999,
                    background: '#E0528A',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({
                    type: 'UPDATE_PERIOD_STATUS',
                    dateKey: todayKey,
                    period: false,
                    periodPromptAnswered: true,
                  })}
                  style={{
                    minHeight: 42,
                    border: '1px solid rgba(44,24,16,0.08)',
                    borderRadius: 999,
                    background: '#fff',
                    color: '#2C1810',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  Not today
                </button>
              </div>
            </>
          )}
        </Card>
      )}



      <div style={{ marginTop: 24 }} className="stack-16">
        <MetabolicCard title="Energy" value={signals.energy.val} color="var(--signal-energy)" description={signals.energy.desc} trendPoints={signals.energy.trend} onClick={() => setSelectedSignal('energy')} />
        <MetabolicCard title="Skin" value={signals.skin.val} color="var(--signal-skin)" description={signals.skin.desc} trendPoints={signals.skin.trend} onClick={() => setSelectedSignal('skin')} />
        <MetabolicCard title="Sleep" value={signals.sleep.val} color="var(--signal-sleep)" description={signals.sleep.desc} trendPoints={signals.sleep.trend} onClick={() => setSelectedSignal('sleep')} />
        <MetabolicCard title="Mood" value={signals.mood.val} color="var(--signal-mood)" description={signals.mood.desc} trendPoints={signals.mood.trend} onClick={() => setSelectedSignal('mood')} />
      </div>

      <div style={{ marginTop: 24 }}>
        <Card accent>
          <div className="card__label" style={{ color: 'var(--phase-accent)' }}>From Maisie Today</div>
          <p style={{ margin: '4px 0 0', fontWeight: 500, fontSize: 14.5, lineHeight: 1.5 }}>
            {todayMaisieMsg}
          </p>
        </Card>
      </div>

      {selectedSignal && (
          <SignalDetailSheet
          signal={signals[selectedSignal].detail}
          logCount={signals[selectedSignal].logCount}
          onClose={() => setSelectedSignal(null)}
        />
      )}
    </div>
  )
}

function SignalDetailSheet({ signal, logCount, onClose }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${signal.title} details`}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(44,24,16,0.28)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '12px 12px calc(86px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 560,
          background: '#fff',
          borderRadius: '18px 18px 14px 14px',
          padding: 18,
          boxShadow: '0 -10px 30px rgba(44,24,16,0.16)',
          maxHeight: 'calc(100vh - 130px)',
          overflowY: 'auto',
        }}
      >
        <div className="row row--between" style={{ alignItems: 'flex-start', gap: 12 }}>
          <div>
            <p className="eyebrow" style={{ margin: '0 0 4px', color: 'var(--pink-accent)' }}>
              Body signal
            </p>
            <h2 style={{ margin: 0, fontSize: 22 }}>{signal.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: '1px solid rgba(44,24,16,0.08)',
              background: '#fff',
              borderRadius: 999,
              padding: '7px 12px',
              color: '#5C3D2E',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>

        <div className="stack-12" style={{ marginTop: 14 }}>
          <DetailBlock label="What it means" text={signal.means} />
          <DetailBlock label="How Maisie got this" text={signal.derived} />
          <DetailBlock label="Inputs used" text={signal.uses} />
          <DetailBlock label="What helps next" text={signal.next} />
        </div>

        <p className="muted" style={{ margin: '14px 0 0', fontSize: 12.5, lineHeight: 1.45 }}>
          {logCount < 3
            ? `Early estimate: you have ${logCount} daily log${logCount === 1 ? '' : 's'} so far.`
            : `Based on ${logCount} daily logs so far.`}
        </p>
      </div>
    </div>
  )
}

function DetailBlock({ label, text }) {
  return (
    <div>
      <div className="card__label" style={{ marginBottom: 3 }}>{label}</div>
      <p style={{ margin: 0, color: '#3A2A24', fontSize: 13.5, lineHeight: 1.5 }}>
        {text}
      </p>
    </div>
  )
}
