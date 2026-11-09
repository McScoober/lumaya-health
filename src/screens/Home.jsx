// Screen 6, Home / daily dashboard (TRD Section 6, 13.2)
// Calendar view, current phase, today's tip card, one-tap check-in CTA, recent activity.
// The background + card accents tint to the current predicted phase (13.2.3);
// BC users get a neutral pink/berry tint (no phase prediction).
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { addDays, dateKeyLocal, diffDays, phaseForDateWithObservations, predictPeriod, PHASE_META, periodStartKeys } from '../engine/cyclePredictor.js'
import { selectDailyTips } from '../engine/tipEngine.js'
import { deriveBodySignals, groupBodySignals } from '../engine/bodySignals.js'
import { buildPatternEvidence } from '../engine/patternInsights.js'
import { buildRouteSummary } from '../engine/routeSummary.js'
import { evaluateSafetyRules, ruleValue } from '../engine/rules/index.js'
import { features } from '../config/features.js'
import { Card, Button } from '../components/ui.jsx'
import ProgressiveCheckin from './ProgressiveCheckin.jsx'
import MaisieLogo from '../components/MaisieLogo.jsx'
import FoodSupportCard from '../components/FoodSupportCard.jsx'
import MoodSafetyCard from '../components/MoodSafetyCard.jsx'
import { foodSensitiveModeIsActive } from '../lib/trackingPreferences.js'
import { ArrowRight, CalendarBlank, CheckCircle, ClipboardText, SlidersHorizontal } from '@phosphor-icons/react'

function recentCheckInCount(dailyLogs = {}, today = new Date(), days = ruleValue('home.recentLoggingWindowDays')) {
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
  const phaseInfo = predictionsReady || periodStartedToday
    ? phaseForDateWithObservations(cycleModel, state.periodLogs, now)
    : { phase: null, dayOfCycle: null }
  const { phase, dayOfCycle } = phaseInfo
  const meta = phase ? PHASE_META[phase] : null
  const prediction = predictionsReady ? predictPeriod(cycleModel, now) : null
  const latestPeriodStartKey = periodStarts[periodStarts.length - 1]
  const daysSinceLatestPeriod = latestPeriodStartKey
    ? diffDays(now, new Date(`${latestPeriodStartKey}T00:00:00`))
    : null
  const isPeriodAskWindow = predictionsReady && prediction
    ? diffDays(now, addDays(prediction.windowStart, -ruleValue('cycle.periodPromptLeadDays'))) >= 0 && diffDays(now, prediction.windowEnd) <= 0
    : false
  const isEarlyPeriodAskWindow = !predictionsReady &&
    daysSinceLatestPeriod !== null &&
    daysSinceLatestPeriod >= ruleValue('cycle.earlyPromptMinimumDays') &&
    daysSinceLatestPeriod <= ruleValue('cycle.earlyPromptMaximumDays')
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
  const phaseSubtitle = phaseInfo.observed
    ? `Period day ${phaseInfo.dayOfPeriod || 1} · Logged today`
    : meta
      ? `${meta.label.charAt(0).toUpperCase()}${meta.label.slice(1)}${dayOfCycle === null ? '' : ` · Cycle day ${dayOfCycle + 1}`}`
      : baselineTitle
  const phaseDetail = phaseInfo.observed
    ? 'View or edit period details'
    : prediction
      ? `Next period in about ${Math.max(0, prediction.daysUntil)} day${prediction.daysUntil === 1 ? '' : 's'}`
      : 'Keep logging to build your cycle context'

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
    const visibleIds = tip ? [tip.id] : []
    if (visibleIds.some((id) => state.tipHistory?.[id] !== todayKey)) {
      dispatch({ type: 'RECORD_TIPS', dateKey: todayKey, ids: visibleIds })
    }
  }, [dispatch, state.tipHistory, tip, todayKey])
  const signals = useMemo(
    () => deriveBodySignals(state.dailyLogs, state.profile, { today: now }),
    [state.dailyLogs, state.profile, todayKey],
  )
  const signalGroups = useMemo(() => groupBodySignals(signals, state.profile), [signals, state.profile])
  const patternEvidence = useMemo(
    () => buildPatternEvidence(state.dailyLogs, state.periodLogs, now, ruleValue('observations.homeWindowDays')),
    [state.dailyLogs, state.periodLogs, todayKey],
  )
  const attentionItems = useMemo(() => {
    const bodyItems = signalGroups.changed.map((signal) => ({
      id: signal.id,
      title: signal.id === 'energy' ? 'Your energy has been lower recently' : `${signal.title} changed recently`,
      body: signal.desc,
    }))
    const extraItems = patternEvidence.recurring
      .filter((item) => !['fatigue', 'mood-timing'].includes(item.id))
    const seen = new Set()
    return [...bodyItems, ...extraItems].filter((item) => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    }).slice(0, 2)
  }, [signalGroups.changed, patternEvidence.recurring])
  const routeSummary = useMemo(
    () => buildRouteSummary({ dailyLogs: state.dailyLogs, periodLogs: state.periodLogs, result: state.result }),
    [state.dailyLogs, state.periodLogs, state.result],
  )
  const safety = useMemo(() => evaluateSafetyRules({ dailyLogs: state.dailyLogs, now }), [state.dailyLogs, todayKey])
  const moodSafety = safety.mood



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

      <button type="button" className={`home-quick-checkin${checkedInToday ? ' home-quick-checkin--complete' : ''}`} onClick={() => navigate('/log')}>
        <span className="home-quick-checkin__icon" aria-hidden="true">
          {checkedInToday ? <CheckCircle size={25} weight="fill" /> : <SlidersHorizontal size={24} weight="duotone" />}
        </span>
        <span className="home-quick-checkin__copy">
          <strong>{checkedInToday ? "Today's check-in is complete" : 'Quick check-in'}</strong>
          <small>{checkedInToday ? 'Review or change today’s answers' : 'Mood, energy, sleep, pain, and more'}</small>
        </span>
        <span className="home-quick-checkin__meta">
          <small>{checkedInToday ? 'Edit' : 'About 1 min'}</small>
          <ArrowRight size={19} weight="bold" aria-hidden="true" />
        </span>
      </button>

      {moodSafety.active && <div style={{ marginTop: 14 }}><MoodSafetyCard /></div>}

      {tip && (
        <section className="home-section" aria-labelledby="home-tip-title">
          <h2 id="home-tip-title" className="home-section__title">For you today</h2>
          <Card accent className="home-tip-card">
            <div className="card__label" style={{ color: 'var(--phase-accent)' }}>Today's tip</div>
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
              margin: '12px 0 0',
              paddingTop: 12,
              borderTop: '1px solid color-mix(in srgb, var(--phase-accent) 28%, transparent)',
              color: '#5E3A55',
              fontSize: 12.5,
              lineHeight: 1.5,
            }}>
              {tip.why}
            </p>
            {signalGroups.changed[0] && (
              <button type="button" className="home-tip-card__link" onClick={() => navigate(`/patterns?tab=signals&signal=${signalGroups.changed[0].id}`)}>
                See the pattern <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </button>
            )}
          </Card>
        </section>
      )}

      {foodSensitive && <div style={{ marginTop: 10 }}><FoodSupportCard /></div>}

      {attentionItems.length > 0 && (
        <section className="home-section" aria-labelledby="home-attention-title">
          <div className="home-section__heading">
            <h2 id="home-attention-title" className="home-section__title">Worth a closer look</h2>
            {attentionItems.length > 1 && <button type="button" onClick={() => navigate('/patterns?tab=signals')}>View all</button>}
          </div>
          <div className="home-attention-list">
            {attentionItems.map((item) => (
              <button key={item.id} type="button" className="home-attention-row" onClick={() => navigate(`/patterns?tab=signals&signal=${item.id}`)}>
                <span><strong>{item.title}</strong><small>{item.body}</small></span>
                <ArrowRight size={18} weight="bold" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="home-section" aria-labelledby="home-keep-going-title">
        <h2 id="home-keep-going-title" className="home-section__title">Keep going</h2>
        <div className="home-task-list">
          <ProgressiveCheckin />
          {features.routeSummary && (
            <button type="button" className="home-route-entry" onClick={() => navigate(routeSummary.loggedDays >= ruleValue('gates.defaultCheckIns') ? '/route/summary' : '/route')}>
              <span className="home-route-entry__icon"><ClipboardText size={22} weight="duotone" /></span>
              <span><strong>Prepare for a health conversation</strong><small>{routeSummary.loggedDays >= ruleValue('gates.defaultCheckIns') ? (routeSummary.stage === 'flags' && routeSummary.flags.length ? `${routeSummary.flags.length} ${routeSummary.flags.length === 1 ? 'item' : 'items'} worth discussing` : `${routeSummary.loggedDays} logged days ready to review`) : 'Use your saved check-ins to get ready'}</small></span>
              <ArrowRight size={19} aria-hidden="true" />
            </button>
          )}
        </div>
      </section>

      <button type="button" className="home-cycle-row" onClick={() => navigate('/patterns?tab=calendar')}>
        <CalendarBlank size={21} weight="duotone" aria-hidden="true" />
        <span><strong>{phaseSubtitle}</strong><small>{phaseDetail}</small></span>
        <ArrowRight size={18} weight="bold" aria-hidden="true" />
      </button>

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



    </div>
  )
}
