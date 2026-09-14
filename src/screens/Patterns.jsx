// Patterns.jsx — 30-Day Cycle, Symptom Patterns & Body Signals
// Integrated view combining:
//   1. 30-Day Cycle & Symptom Calendar (interactive day inspector & clinical highlights)
//   2. Body Signals & Metabolic Trends (Energy, Sleep, Skin, Mood + Cycle Overlay Chart)
//   3. 1-Tap Doctor Summary Export

import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { TopBar, Card, Button, Badge } from '../components/ui.jsx'
import MetabolicCard from '../components/MetabolicCard.jsx'
import CycleOverlayChart from '../components/CycleOverlayChart.jsx'
import { deriveBodySignals } from '../engine/bodySignals.js'
import {
  buildCycleModel,
  phaseForDate,
  PHASE_META,
  dateKeyLocal,
  addDays,
  diffDays,
  startOfDay,
  periodStartKeys,
} from '../engine/cyclePredictor.js'

const PHASE_LABELS = {
  menstrual: 'Period',
  follicular: 'Building Up',
  ovulation: 'Peak',
  luteal: 'Wind Down',
  bc_active: 'Steady Week',
  bc_break: 'Break Week',
  bc_generic: 'This Week',
}

function actualImpacts(log) {
  return (log?.impact || []).filter((impact) => impact !== 'fine')
}

export default function Patterns({ initialTab }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { state } = useStore()

  // Tab State: 'calendar' | 'signals'
  const tabFromUrl = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(tabFromUrl || initialTab || 'calendar')
  const [signalsSubView, setSignalsSubView] = useState('cycle') // 'cycle' | 'trends'

  const [showDoctorModal, setShowDoctorModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [selectedDateKey, setSelectedDateKey] = useState(dateKeyLocal(new Date()))

  // Sync tab with URL
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl)
    }
  }, [tabFromUrl])

  const handleTabChange = (newTab) => {
    setActiveTab(newTab)
    setSearchParams({ tab: newTab }, { replace: true })
  }

  // Compute Cycle Model
  const cycleModel = useMemo(() => {
    const starts = periodStartKeys(state.periodLogs)
    return buildCycleModel({
      lastStart: starts[starts.length - 1] || state.answers.lastStart || state.answers.periodStart,
      cycleLength: state.answers.cycleLen ? parseInt(state.answers.cycleLen, 10) : 28,
      onBirthControl: state.profile.onBirthControl,
    })
  }, [state.answers, state.profile, state.periodLogs])

  // Current Phase Info for Signals View
  const now = new Date()
  const phaseInfo = phaseForDate(cycleModel, now)
  const observedCycleCount = periodStartKeys(state.periodLogs).length
  const predictionsReady = observedCycleCount >= 3
  const currentPhase = predictionsReady ? (phaseInfo.phase || 'follicular') : 'follicular'
  const cycleDay = phaseInfo.dayOfCycle === null || phaseInfo.dayOfCycle === undefined ? 14 : phaseInfo.dayOfCycle + 1
  const phaseMeta = PHASE_META[currentPhase] || PHASE_META.follicular
  const phaseLabel = PHASE_LABELS[currentPhase] || phaseMeta.label || 'Building Up'

  // Count real logs & check if today is logged
  const todayKey = dateKeyLocal(now)
  const isTodayLogged = !!state.dailyLogs[todayKey]
  const bodySignals = useMemo(
    () => deriveBodySignals(state.dailyLogs, state.profile, {
      days: 30,
      today: now,
      energyColor: '#E8C86A',
      skinColor: '#E8A0B0',
      sleepColor: '#C4A8E0',
      moodColor: '#A0C4A4',
    }),
    [state.dailyLogs, state.profile, todayKey],
  )

  // Only show entries the user actually logged. Predicted phase/period shading
  // can appear on the calendar, but symptoms, pain, and impacts must be real.
  const activeLogs = state.dailyLogs || {}

  // Calendar cells for last 35 days
  const today = startOfDay(now)
  const calendarDays = useMemo(() => {
    const cells = []
    for (let i = 34; i >= 0; i--) {
      const date = addDays(today, -i)
      const key = dateKeyLocal(date)
      const log = activeLogs[key]
      const periodLog = state.periodLogs[key]
      const phaseResult = predictionsReady ? phaseForDate(cycleModel, date) : { phase: null, dayOfCycle: null }
      const { phase, dayOfCycle } = phaseResult
      const isToday = diffDays(date, today) === 0

      // Pain is only shown when explicitly logged; mood/vibe is separate.
      const pain = typeof log?.pain === 'number' ? log.pain : null
      const hasImpact = actualImpacts(log).length > 0
      const isLogged = !!log?.checkinCompleted ||
        log?.vibe !== undefined ||
        log?.mood !== undefined ||
        log?.symptoms !== undefined ||
        log?.pain !== undefined ||
        log?.impact !== undefined
      const isPeriodDay = periodLog?.period === true || log?.period === true
      const isPredictedPeriodDay = predictionsReady && phase === 'menstrual' && dayOfCycle !== null && dayOfCycle < 5

      cells.push({
        date,
        dayNum: date.getDate(),
        key,
        phase,
        dayOfCycle,
        pain,
        hasImpact,
        isLogged,
        isPeriodDay,
        isPredictedPeriodDay,
        isToday,
        log,
        periodLog,
      })
    }
    return cells
  }, [today, activeLogs, state.periodLogs, cycleModel, predictionsReady])

  // Selected Day Details
  const selectedCell = calendarDays.find((c) => c.key === selectedDateKey) || calendarDays[calendarDays.length - 1]

  // Dynamic Pattern Highlights
  const patternInsights = useMemo(() => {
    const insights = []
    const logEntries = Object.entries(activeLogs)

    if (!predictionsReady) {
      insights.push({
        id: 'baseline-tracking',
        icon: '✨',
        title: 'Building Your Baseline',
        body: 'Keep logging period starts and daily check-ins to make Maisie more accurate. Obvious heavy bleeding, long gaps, or very high pain still get flagged right away.',
        actionText: isTodayLogged ? null : 'Log Today < 10s ⏱️',
        onAction: () => navigate('/log'),
        badge: 'Clear',
      })
      return insights
    }

    // 1. Pain in Menstrual Phase
    const severeMenstrual = logEntries.filter(([k, log]) => {
      const d = new Date(`${k}T00:00:00`)
      const { phase } = phaseForDate(cycleModel, d)
      return phase === 'menstrual' && log.pain >= 6
    })

    if (severeMenstrual.length >= 1) {
      insights.push({
        id: 'severe-cramps',
        icon: '🩸',
        title: 'Period Pain Signal (Pain ≥ 6)',
        body: `Pain at this level was logged on ${severeMenstrual.length} period day(s). This is worth tracking for a doctor.`,
        actionText: 'What to say to doctor 💬',
        onAction: () => navigate('/advisor'),
        badge: 'Moderate',
      })
    }

    // 2. Luteal Phase Activity Impact
    const lutealImpacts = logEntries.filter(([k, log]) => {
      const d = new Date(`${k}T00:00:00`)
      const { phase } = phaseForDate(cycleModel, d)
      return phase === 'luteal' && actualImpacts(log).length > 0
    })

    if (lutealImpacts.length >= 1) {
      insights.push({
        id: 'luteal-impact',
        icon: '🌙',
        title: 'Luteal Phase Activity Shifts',
        body: `School or sports were impacted during your winding-down phase. Rest & hydration during days 18–25 help ease tension.`,
        actionText: 'View Phase Tips ⚡',
        onAction: () => navigate('/home'),
        badge: 'Mild',
      })
    }

    if (insights.length === 0) {
      insights.push({
        id: 'steady-tracking',
        icon: '✨',
        title: 'Building Your Baseline',
        body: 'Keep logging symptoms to make automatic pattern highlights more accurate.',
        actionText: isTodayLogged ? null : 'Log Today < 10s ⏱️',
        onAction: () => navigate('/log'),
        badge: 'Clear',
      })
    }

    return insights
  }, [activeLogs, cycleModel, navigate, isTodayLogged, predictionsReady, observedCycleCount])

  // Doctor Summary Report Text
  const doctorReportText = useMemo(() => {
    const name = state.identity.name || 'Maisie User'
    const totalLogs = Object.keys(activeLogs).length
    const painDays = Object.values(activeLogs).filter((l) => l.pain >= 5).length
    const impactDays = Object.values(activeLogs).filter((l) => actualImpacts(l).length > 0).length

    return `MAISIE HEALTH — 30-DAY PATTERN REPORT
--------------------------------------------------
Patient / User: ${name}
Date Range: ${calendarDays[0]?.date.toLocaleDateString()} – ${calendarDays[calendarDays.length - 1]?.date.toLocaleDateString()}
Tracked Days: ${totalLogs}

METRICS:
• Pain Days (≥5): ${painDays} days
• Activity Impact Days: ${impactDays} days
• Target Cycle Length: ~${cycleModel.cycleLength} days

PATTERNS DETECTED:
${patternInsights.map((p) => `• ${p.title}: ${p.body}`).join('\n')}

Note: Pattern awareness summary for medical appointments.`
  }, [state.identity.name, activeLogs, cycleModel, patternInsights, calendarDays])

  const handleCopyReport = () => {
    navigator.clipboard?.writeText(doctorReportText)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  return (
    <div className="screen screen--pad-bottom">
      <TopBar
        onBack={false}
        title="Patterns & Signals"
        right={
          <button
            id="patterns-export-doctor"
            type="button"
            onClick={() => setShowDoctorModal(true)}
            style={{
              padding: '6px 12px',
              borderRadius: 20,
              border: '1.5px solid var(--pink-mid)',
              background: 'var(--card-bg)',
              color: 'var(--pink-accent)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            Doctor Report 📄
          </button>
        }
      />

      {/* Main Top Segmented Control — Easily switches between Calendar and Body Signals */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
          background: 'rgba(0,0,0,0.05)',
          padding: 4,
          borderRadius: 14,
          marginTop: 12,
          marginBottom: 12,
        }}
      >
        <button
          id="patterns-tab-calendar"
          type="button"
          onClick={() => handleTabChange('calendar')}
          style={{
            padding: '9px 12px',
            borderRadius: 10,
            border: 'none',
            background: activeTab === 'calendar' ? '#fff' : 'transparent',
            color: activeTab === 'calendar' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: 13,
            boxShadow: activeTab === 'calendar' ? '0 2px 5px rgba(0,0,0,0.08)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <span>📅</span> 30-Day Grid
        </button>
        <button
          id="patterns-tab-signals"
          type="button"
          onClick={() => handleTabChange('signals')}
          style={{
            padding: '9px 12px',
            borderRadius: 10,
            border: 'none',
            background: activeTab === 'signals' ? '#fff' : 'transparent',
            color: activeTab === 'signals' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: 13,
            boxShadow: activeTab === 'signals' ? '0 2px 5px rgba(0,0,0,0.08)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <span>⚡</span> Body Signals
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 30-DAY CALENDAR & PATTERN HIGHLIGHTS                               */}
      {/* ========================================================================= */}
      {activeTab === 'calendar' && (
        <div style={{ animation: 'fadeIn 0.2s ease' }}>
          {/* Empty-state nudge */}
          {Object.keys(activeLogs).length === 0 && (
            <div
              style={{
                marginBottom: 12,
                padding: '10px 14px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #FFF5F7 0%, #F5EBFB 100%)',
                border: '1px solid rgba(224, 76, 122, 0.2)',
                fontSize: 12,
                color: '#7B1B40',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <span>✨ <strong>No daily logs yet</strong> — log a day to see real symptoms and impacts here</span>
              {!isTodayLogged ? (
                <button
                  onClick={() => navigate('/log')}
                  style={{
                    border: 'none',
                    background: 'var(--pink-accent)',
                    color: '#fff',
                    padding: '5px 12px',
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Log Today
                </button>
              ) : (
                <span
                  style={{
                    background: 'rgba(75, 175, 107, 0.15)',
                    color: '#2B7A41',
                    padding: '4px 10px',
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  ✓ Logged Today
                </span>
              )}
            </div>
          )}

          {/* Calendar Grid Card */}
          <Card style={{ padding: '16px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {calendarDays[0]?.date.toLocaleDateString('en-US', { month: 'short' })} – {calendarDays[calendarDays.length - 1]?.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Tap day to view</span>
            </div>

            <div className="cal">
              {DOW.map((d, i) => (
                <div key={i} className="cal__dow" style={{ fontSize: 11, fontWeight: 700, color: '#888' }}>
                  {d}
                </div>
              ))}

              {calendarDays.map((cell) => {
                const isSelected = cell.key === selectedDateKey

                let cellBg = '#F9F8F6'
                let textColor = '#555'
                let borderStyle = '1px solid rgba(0,0,0,0.06)'

                if (cell.isPeriodDay) {
                  cellBg = '#FDE8ED'
                  textColor = '#991B1B'
                } else if (cell.isPredictedPeriodDay) {
                  cellBg = '#FFF1F2'
                  textColor = '#9F1239'
                } else if (cell.pain !== null && cell.pain >= 6) {
                  cellBg = 'var(--pink-accent)'
                  textColor = '#FFF'
                } else if (cell.pain !== null && cell.pain >= 1) {
                  cellBg = '#FCE7F3'
                  textColor = '#9D174D'
                } else if (cell.isLogged) {
                  cellBg = '#EFF8F0'
                  textColor = '#2B7A41'
                }

                if (isSelected) {
                  borderStyle = '2.5px solid #2B211E'
                } else if (cell.isToday) {
                  borderStyle = '2.5px solid var(--pink-accent)'
                }

                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => setSelectedDateKey(cell.key)}
                    style={{
                      aspectRatio: '1',
                      borderRadius: '50%',
                      background: cellBg,
                      border: borderStyle,
                      color: textColor,
                      fontSize: 11,
                      fontWeight: cell.isToday || isSelected || cell.isPeriodDay || cell.isLogged ? 700 : 500,
                      position: 'relative',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'transform 0.15s ease',
                      transform: isSelected ? 'scale(1.12)' : 'scale(1)',
                    }}
                  >
                    {cell.dayNum}

                    {cell.isLogged && !cell.isPeriodDay && cell.pain === null && !cell.hasImpact && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 4,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          background: '#2B7A41',
                        }}
                      />
                    )}

                    {cell.hasImpact && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 1,
                          right: 1,
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: '#D97706',
                          border: '1px solid #fff',
                        }}
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Grid Legend */}
            <div
              style={{
                marginTop: 16,
                paddingTop: 12,
                borderTop: '1px solid rgba(0,0,0,0.06)',
                display: 'flex',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: 16,
                fontSize: 11,
                color: 'var(--text-secondary)',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <i style={{ width: 8, height: 8, borderRadius: '50%', background: '#FDE8ED', border: '1px solid #F43F5E' }} /> Period
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <i style={{ width: 8, height: 8, borderRadius: '50%', background: '#FCE7F3', border: '1px solid #F472B6' }} /> Pain Logged
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <i style={{ width: 8, height: 8, borderRadius: '50%', background: '#EFF8F0', border: '1px solid #2B7A41' }} /> Logged
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <i style={{ width: 6, height: 6, borderRadius: '50%', background: '#D97706' }} /> Impact
              </span>
            </div>
          </Card>

          {/* Day Inspector Card */}
          {selectedCell && (
            <Card style={{ marginTop: 14, background: '#FAF9F6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedCell.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  {selectedCell.isToday && <span style={{ marginLeft: 6, color: 'var(--pink-accent)', fontSize: 12 }}>(Today)</span>}
                </p>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                  {selectedCell.isPeriodDay
                    ? 'Period logged'
                    : predictionsReady && selectedCell.phase
                      ? `${selectedCell.phase} phase`
                      : selectedCell.isLogged
                        ? 'Logged day'
                        : 'No log'}
                </span>
              </div>

              {selectedCell.log ? (
                <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <span><strong>Mood:</strong> {selectedCell.log.mood || selectedCell.log.vibe || 'Not logged'}</span>
                    <span>
                      <strong>Pain:</strong>{' '}
                      {selectedCell.pain !== null ? `${selectedCell.pain}/10` : 'Not logged'}
                    </span>
                  </div>
                  {selectedCell.isPeriodDay && (
                    <div>
                      <strong style={{ fontSize: 12 }}>Period:</strong>{' '}
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Logged for this day</span>
                    </div>
                  )}
                  {selectedCell.log.symptoms && selectedCell.log.symptoms.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <strong style={{ fontSize: 12 }}>Symptoms:</strong>
                      {selectedCell.log.symptoms.map((s) => (
                        <span
                          key={s}
                          style={{
                            padding: '2px 8px',
                            borderRadius: 10,
                            background: 'rgba(224,76,122,0.1)',
                            color: 'var(--pink-accent)',
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                  {actualImpacts(selectedCell.log).length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <strong style={{ fontSize: 12 }}>Impacted:</strong>
                      {actualImpacts(selectedCell.log).map((imp) => (
                        <span
                          key={imp}
                          style={{
                            padding: '2px 8px',
                            borderRadius: 10,
                            background: '#FEF3C7',
                            color: '#B45309',
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {imp}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : selectedCell.isPeriodDay ? (
                <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                  Period was logged for this day.
                </p>
              ) : (
                <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                  No check-in recorded for this day.
                </p>
              )}
            </Card>
          )}

          {/* Shortcut Card to Body Signals */}
          <div
            onClick={() => handleTabChange('signals')}
            style={{
              marginTop: 16,
              borderRadius: 16,
              padding: '14px 16px',
              background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
              border: '1.5px solid rgba(245, 158, 11, 0.25)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>⚡</span>
              <div>
                <strong style={{ fontSize: 13.5, color: '#92400E', display: 'block' }}>
                  Explore Body Signals
                </strong>
                <span style={{ fontSize: 12, color: '#B45309' }}>
                  Energy, sleep, skin & mood curves through your cycle
                </span>
              </div>
            </div>
            <span style={{ fontSize: 16, color: '#92400E', fontWeight: 800 }}>→</span>
          </div>

          {/* Pattern Highlights */}
          <div className="stack-16" style={{ marginTop: 20 }}>
            <p className="eyebrow" style={{ margin: 0 }}>Pattern Highlights</p>

            {patternInsights.map((insight) => (
              <Card key={insight.id} style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{insight.icon}</span>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                      {insight.title}
                    </p>
                  </div>
                  <Badge level={insight.badge} />
                </div>

                <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {insight.body}
                </p>

                {insight.actionText && (
                  <button
                    type="button"
                    onClick={insight.onAction}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      padding: 0,
                      color: 'var(--pink-accent)',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {insight.actionText} →
                  </button>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BODY SIGNALS & METABOLIC CHARTS                                    */}
      {/* ========================================================================= */}
      {activeTab === 'signals' && (
        <div style={{ animation: 'fadeIn 0.2s ease' }}>
          {/* Subview Toggle: Through Cycle vs Last 30 Days */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              How You're Feeling
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: phaseMeta?.accent || '#E0528A',
                background: phaseMeta?.soft || '#FDEEF4',
                padding: '4px 9px',
                borderRadius: 99,
              }}
            >
              Day {cycleDay} · {phaseLabel}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 6,
              marginBottom: 16,
            }}
          >
            <button
              type="button"
              onClick={() => setSignalsSubView('cycle')}
              style={{
                minHeight: 38,
                borderRadius: 999,
                border: signalsSubView === 'cycle' ? '1.5px solid var(--pink-accent)' : '1px solid rgba(0,0,0,0.08)',
                background: signalsSubView === 'cycle' ? '#FDEEF4' : '#fff',
                color: signalsSubView === 'cycle' ? 'var(--pink-accent)' : 'var(--text-primary)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Through Your Cycle
            </button>
            <button
              type="button"
              onClick={() => setSignalsSubView('trends')}
              style={{
                minHeight: 38,
                borderRadius: 999,
                border: signalsSubView === 'trends' ? '1.5px solid var(--pink-accent)' : '1px solid rgba(0,0,0,0.08)',
                background: signalsSubView === 'trends' ? '#FDEEF4' : '#fff',
                color: signalsSubView === 'trends' ? 'var(--pink-accent)' : 'var(--text-primary)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Last 30 Days Cards
            </button>
          </div>

          {/* SubView 1: Cycle Overlay Chart */}
          {signalsSubView === 'cycle' && (
            <Card style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}>
                  Cycle Wave Curves
                </h3>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Energy, Mood, Skin, Sleep</span>
              </div>

              <div style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
                <CycleOverlayChart cycleDay={cycleDay} dailyLogs={state.dailyLogs} />
              </div>

              <p style={{ margin: '14px 0 0', color: '#5C3D2E', fontSize: 13, lineHeight: 1.5 }}>
                <strong style={{ color: '#2C1810' }}>Maisie says:</strong> This view is here to spot timing. Notice how your energy naturally rises mid-cycle and softens in your wind-down phase.
              </p>
            </Card>
          )}

          {/* SubView 2: 4 Metabolic Cards */}
          {signalsSubView === 'trends' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <MetabolicCard
                title="Energy"
                value={bodySignals.energy.val}
                color={bodySignals.energy.color}
                description={bodySignals.energy.desc}
                trendPoints={bodySignals.energy.trend}
              />
              <MetabolicCard
                title="Skin"
                value={bodySignals.skin.val}
                color={bodySignals.skin.color}
                description={bodySignals.skin.desc}
                trendPoints={bodySignals.skin.trend}
              />
              <MetabolicCard
                title="Sleep"
                value={bodySignals.sleep.val}
                color={bodySignals.sleep.color}
                description={bodySignals.sleep.desc}
                trendPoints={bodySignals.sleep.trend}
              />
              <MetabolicCard
                title="Mood"
                value={bodySignals.mood.val}
                color={bodySignals.mood.color}
                description={bodySignals.mood.desc}
                trendPoints={bodySignals.mood.trend}
              />
            </div>
          )}
        </div>
      )}

      {/* Doctor Summary Modal */}
      {showDoctorModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 20,
              maxWidth: 440,
              width: '100%',
              padding: 20,
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}>Doctor & Parent Report 📄</h3>
              <button
                onClick={() => setShowDoctorModal(false)}
                style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-secondary)' }}>
              Share this formatted summary during medical appointments or with a trusted adult.
            </p>

            <pre
              style={{
                background: '#F9F6F0',
                border: '1px solid #EAE3D6',
                borderRadius: 12,
                padding: 14,
                fontSize: 11,
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.4,
                maxHeight: 240,
                overflowY: 'auto',
                margin: '0 0 16px',
              }}
            >
              {doctorReportText}
            </pre>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button variant="primary" block onClick={handleCopyReport}>
                {copied ? '✓ Copied to Clipboard!' : 'Copy Summary to Clipboard 📋'}
              </Button>
              <Button
                variant="secondary"
                block
                onClick={() => {
                  setShowDoctorModal(false)
                  navigate('/advisor')
                }}
              >
                Show me what to say in person 💬
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
