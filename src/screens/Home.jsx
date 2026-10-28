// Screen 6, Home / daily dashboard (TRD Section 6, 13.2)
// Calendar view, current phase, today's tip card, one-tap check-in CTA, recent activity.
// The background + card accents tint to the current predicted phase (13.2.3);
// BC users get a neutral pink/berry tint (no phase prediction).
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { addDays, dateKeyLocal, diffDays, phaseForDateWithObservations, predictPeriod, isInPeriodWindow, PHASE_META, periodStartKeys } from '../engine/cyclePredictor.js'
import { maisieMessage, selectDailyTips } from '../engine/tipEngine.js'
import { deriveBodySignals } from '../engine/bodySignals.js'
import { buildRouteSummary } from '../engine/routeSummary.js'
import { moodSafetyStatus } from '../engine/moodPms.js'
import { features } from '../config/features.js'
import { Card, Button } from '../components/ui.jsx'
import MetabolicCard from '../components/MetabolicCard.jsx'
import ProgressiveCheckin from './ProgressiveCheckin.jsx'
import MaisieLogo from '../components/MaisieLogo.jsx'
import FoodSupportCard from '../components/FoodSupportCard.jsx'
import MoodSafetyCard from '../components/MoodSafetyCard.jsx'
import { foodSensitiveModeIsActive } from '../lib/trackingPreferences.js'
import { ArrowRight, CalendarBlank, CheckCircle, ClipboardText, Gear, MapPin } from '@phosphor-icons/react'

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
  const [periodPromptChoice, setPeriodPromptChoice] = useState(null)
  const [periodPromptSaved, setPeriodPromptSaved] = useState(false)
  const now = new Date()
  const todayKey = dateKeyLocal(now)
  const todayLog = state.dailyLogs[todayKey] || {}
  const todayPeriodLog = state.periodLogs[todayKey] || {}
  const periodStartedToday = todayPeriodLog.period === true
  const checkedInToday = todayLog.checkinCompleted === true

  const periodStarts = periodStartKeys(state.periodLogs)
  const predictionsReady = state.result?.authoritative === true && state.result.patternsReady === true
  const supportPhaseInfo = phaseForDateWithObservations(cycleModel, state.periodLogs, now)
  const supportPhase = supportPhaseInfo.phase
  const supportCycleDay = supportPhaseInfo.dayOfCycle === null || supportPhaseInfo.dayOfCycle === undefined
    ? 1
    : supportPhaseInfo.dayOfCycle + 1
  const phaseInfo = predictionsReady || periodStartedToday
    ? phaseForDateWithObservations(cycleModel, state.periodLogs, now)
    : { phase: null, dayOfCycle: null }
  const { phase, dayOfCycle } = phaseInfo
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
  const phaseSubtitle = phaseInfo.observed
    ? `Day ${phaseInfo.dayOfPeriod || 1}`
    : meta?.mood

  const tipSelection = useMemo(() => selectDailyTips({
    phase: supportPhase,
    phaseTips: state.notifyPrefs.phaseTips,
    profile: state.profile,
    dailyLogs: state.dailyLogs,
    periodLogs: state.periodLogs,
    tipHistory: state.tipHistory,
    date: now,
  }), [supportPhase, state.notifyPrefs.phaseTips, state.profile, state.dailyLogs, state.periodLogs, state.tipHistory, todayKey])
  const tip = tipSelection.primary
  const foodSensitive = useMemo(
    () => foodSensitiveModeIsActive(state.profile, state.dailyLogs),
    [state.profile, state.dailyLogs],
  )
  useEffect(() => {
    if (tipSelection.ids.some((id) => state.tipHistory?.[id] !== todayKey)) {
      dispatch({ type: 'RECORD_TIPS', dateKey: todayKey, ids: tipSelection.ids })
    }
  }, [dispatch, state.tipHistory, tipSelection.ids, todayKey])
  const todayMaisieMsg = useMemo(
    () => (state.notifyPrefs.phaseTips && supportPhase
      ? maisieMessage(supportPhase, supportCycleDay, state.profile)
      : 'Your recent check-ins can help you notice what supports you day to day.'),
    [state.notifyPrefs.phaseTips, supportPhase, supportCycleDay, state.profile]
  )
  const signals = useMemo(
    () => deriveBodySignals(state.dailyLogs, state.profile, { days: 8, today: now }),
    [state.dailyLogs, state.profile, todayKey],
  )
  const routeSummary = useMemo(
    () => buildRouteSummary({ dailyLogs: state.dailyLogs, periodLogs: state.periodLogs, result: state.result }),
    [state.dailyLogs, state.periodLogs, state.result],
  )
  const moodSafety = useMemo(() => moodSafetyStatus(state.dailyLogs, now), [state.dailyLogs, todayKey])



  // Phase tint variables for the screen (13.2.3)
  const tintStyle = meta
    ? { '--phase-accent': meta.accent, '--phase-soft': meta.soft }
    : { '--phase-accent': 'var(--plum-700)', '--phase-soft': 'var(--lavender-100)' }

  const firstName = state.identity.name?.split(' ')[0] || 'there'
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const recentLogs = recentCheckInCount(state.dailyLogs, now)

  function savePeriodPrompt() {
    if (periodPromptChoice === null) return
    dispatch({
      type: 'UPDATE_PERIOD_STATUS',
      dateKey: todayKey,
      period: periodPromptChoice,
      periodPromptAnswered: true,
    })
    setPeriodPromptSaved(true)
  }

  return (
    <div className="screen screen--pad-bottom" style={tintStyle}>
      {/* Header */}
      <div className="row row--between" style={{ marginBottom: 4 }}>
        <div>
          <MaisieLogo variant="wordmark" width={150} style={{ marginBottom: 12 }} />
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
        <div>
          <div className="card__label">Right now</div>
          {meta ? (
            <>
              <h2 style={{ margin: '2px 0 2px', color: 'var(--phase-accent)' }}>
                {phase === 'menstrual' ? 'Your period' : `${meta.label} phase`}
              </h2>
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
        {periodStartedToday ? (
          <p className="muted" style={{ margin: '10px 0 0', fontSize: 13 }}>
            Periods can vary in length. Notice how your energy and comfort feel today.
          </p>
        ) : prediction && (
          <p className="muted" style={{ margin: '10px 0 0', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
            {inWindow ? (
              <>
                <MapPin size={16} weight="regular" aria-hidden="true" />
                <span>You're in your predicted period window.</span>
              </>
            ) : (
              <>
                <CalendarBlank size={16} weight="regular" aria-hidden="true" />
                <span>Next period in about {Math.max(0, prediction.daysUntil)} day{prediction.daysUntil === 1 ? '' : 's'}.</span>
              </>
            )}
          </p>
        )}
      </Card>

      {moodSafety.active && <div style={{ marginTop: 14 }}><MoodSafetyCard /></div>}

      {tip && (
        <div style={{ marginTop: 14 }}>
          <Card>
            <div className="card__label" style={{ color: 'var(--phase-accent)' }}>Today's Tip</div>
            <h2 style={{
              margin: '4px 0 10px',
              color: 'var(--text-primary)',
              fontFamily: "'Fraunces', serif",
              fontSize: 21,
              lineHeight: 1.2,
            }}>
              {tip.headline}
            </h2>
            {tip.actions[0] && (
              <p style={{
                margin: '0 0 8px',
                color: '#3F0824',
                fontSize: 14.5,
                fontWeight: 600,
                lineHeight: 1.45,
              }}>
                {tip.actions[0]}
              </p>
            )}
            <p style={{
              margin: 0,
              color: '#5E3A55',
              fontSize: 13.5,
              lineHeight: 1.5,
            }}>
              {tip.why}
            </p>
          </Card>
        </div>
      )}

      {tipSelection.fuel && (
        <Card style={{ marginTop: 10 }}>
          <div className="card__label">Fuel note</div>
          <h3 style={{ margin: '4px 0 6px' }}>{tipSelection.fuel.headline}</h3>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5 }}>{tipSelection.fuel.actions[0]}</p>
        </Card>
      )}

      {tipSelection.nudge && (
        <Card style={{ marginTop: 10 }}>
          <div className="card__label">Worth reviewing</div>
          <h3 style={{ margin: '4px 0 6px' }}>{tipSelection.nudge.headline}</h3>
          <p style={{ margin: '0 0 10px', fontSize: 13.5, lineHeight: 1.5 }}>{tipSelection.nudge.why}</p>
          <Button variant="secondary" onClick={() => navigate('/route')}>Open Route</Button>
        </Card>
      )}

      {foodSensitive && <div style={{ marginTop: 10 }}><FoodSupportCard /></div>}

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
                  background: 'var(--sage-100)',
                  color: 'var(--sage-700)',
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
      {features.routeSummary && routeSummary.loggedDays >= 7 && (
        <button type="button" className="home-route-entry" onClick={() => navigate('/route/summary')}>
          <span className="home-route-entry__icon"><ClipboardText size={22} weight="duotone" /></span>
          <span><strong>Your pattern so far</strong><small>{routeSummary.stage === 'flags' && routeSummary.flags.length ? `${routeSummary.flags.length} ${routeSummary.flags.length === 1 ? 'item' : 'items'} worth discussing` : `${routeSummary.loggedDays} logged days ready to review`}</small></span>
          <ArrowRight size={19} aria-hidden="true" />
        </button>
      )}

      {(shouldShowPeriodStartCard || periodPromptSaved) && (
        <Card style={{ marginTop: 14, background: 'var(--lavender-100)', borderColor: 'var(--border-strong)' }}>
          {periodPromptSaved ? (
            <div role="status">
              <p style={{ margin: '0 0 4px', color: '#3F0824', fontSize: 15, fontWeight: 700 }}>
                {periodPromptChoice ? 'Your period is logged for today.' : 'Saved for today.'}
              </p>
              <p style={{ margin: 0, color: '#5E3A55', fontSize: 13.5, lineHeight: 1.45 }}>
                {periodPromptChoice
                  ? 'The first marked day of this period is used as its start.'
                  : 'You can change this later from your calendar.'}
              </p>
            </div>
          ) : periodStartedToday ? (
            <>
              <p style={{ margin: '0 0 4px', color: '#3F0824', fontSize: 15, fontWeight: 700 }}>
                Your period is logged for today.
              </p>
              <p style={{ margin: 0, color: '#5E3A55', fontSize: 13.5, lineHeight: 1.45 }}>
                The first marked day of this period is used as its start.
              </p>
            </>
          ) : (
            <>
              <p style={{ margin: '0 0 10px', color: '#3F0824', fontSize: 15, fontWeight: 700 }}>
                {possiblePeriodToday
                  ? 'Still on your period today?'
                  : predictionsReady
                    ? 'Did your period start today?'
                    : 'Are you on your period today?'}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  className="chip"
                  aria-pressed={periodPromptChoice === true}
                  onClick={() => setPeriodPromptChoice(true)}
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                  }}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className="chip"
                  aria-pressed={periodPromptChoice === false}
                  onClick={() => setPeriodPromptChoice(false)}
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                  }}
                >
                  Not today
                </button>
              </div>
              <Button block disabled={periodPromptChoice === null} onClick={savePeriodPrompt} style={{ marginTop: 10 }}>
                Save answer
              </Button>
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
              color: '#5E3A55',
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
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13.5, lineHeight: 1.5 }}>
        {text}
      </p>
    </div>
  )
}
