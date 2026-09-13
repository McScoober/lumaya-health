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
import {
  buildCycleModel,
  phaseForDate,
  PHASE_META,
  dateKeyLocal,
  addDays,
  diffDays,
  startOfDay,
} from '../engine/cyclePredictor.js'

// Mock Signal Trends for 30-Day Metabolic View
const FULL_MOCK_SIGNALS = {
  energy: {
    val: 'Trending up',
    desc: 'Higher energy on 18 of the last 30 days. Peaks during days 6 to 14.',
    trend: Array.from({ length: 30 }, (_, i) => [3, 3, 2, 3, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4, 4, 3, 3, 3, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3][i]),
    color: '#E8C86A',
  },
  skin: {
    val: '2 flare-ups',
    desc: 'Skin changes showed up most around days 20 to 25 (luteal phase).',
    trend: Array.from({ length: 30 }, (_, i) => [4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4, 4, 3, 3, 3, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5][i]),
    color: '#E8A0B0',
  },
  sleep: {
    val: 'Solid',
    desc: 'Consistent 8-hour sleep pattern holding for 21 days straight.',
    trend: Array.from({ length: 30 }, (_, i) => [3, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 3, 3, 3, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4][i]),
    color: '#C4A8E0',
  },
  mood: {
    val: 'Steadier',
    desc: 'Steadier than last cycle. Wind-down week shows mild sensitivity.',
    trend: Array.from({ length: 30 }, (_, i) => [2, 2, 3, 3, 4, 5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 3, 3, 3, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 5, 5][i]),
    color: '#A0C4A4',
  },
}

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

// Realistic 30-day preview logs for new users (< 3 real logs)
function buildPreviewLogs(today = new Date(), cycleModel) {
  const logs = {}
  for (let i = 0; i < 30; i++) {
    const d = addDays(today, -i)
    const key = dateKeyLocal(d)
    const { phase, dayOfCycle } = phaseForDate(cycleModel, d)

    if (phase === 'menstrual' && dayOfCycle !== null && dayOfCycle < 4) {
      const pain = dayOfCycle === 0 ? 7 : dayOfCycle === 1 ? 5 : 3
      logs[key] = {
        checkinCompleted: true,
        mood: dayOfCycle === 0 ? 'Rough' : 'Okay',
        pain,
        symptoms: ['Cramps', dayOfCycle === 0 ? 'Fatigue' : 'Backache'],
        impact: dayOfCycle === 0 ? ['Sports'] : [],
        period: true,
      }
    } else if (phase === 'luteal' && dayOfCycle === 22) {
      logs[key] = {
        checkinCompleted: true,
        mood: 'Okay',
        pain: 3,
        symptoms: ['Bloating', 'Mood Swings'],
        impact: ['School'],
      }
    }
  }
  return logs
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
    return buildCycleModel({
      lastStart: state.answers.lastStart || state.answers.periodStart,
      cycleLength: state.answers.cycleLen ? parseInt(state.answers.cycleLen, 10) : 28,
      onBirthControl: state.profile.onBirthControl,
    })
  }, [state.answers, state.profile])

  // Current Phase Info for Signals View
  const now = new Date()
  const phaseInfo = phaseForDate(cycleModel, now)
  const currentPhase = phaseInfo.phase || 'follicular'
  const cycleDay = phaseInfo.dayOfCycle === null || phaseInfo.dayOfCycle === undefined ? 14 : phaseInfo.dayOfCycle + 1
  const phaseMeta = PHASE_META[currentPhase] || PHASE_META.follicular
  const phaseLabel = PHASE_LABELS[currentPhase] || phaseMeta.label || 'Building Up'

  // Count real logs & check if today is logged
  const todayKey = dateKeyLocal(now)
  const isTodayLogged = !!state.dailyLogs[todayKey]
  const realLogCount = Object.keys(state.dailyLogs || {}).length
  const isPreviewMode = realLogCount < 3

  // Active logs (real or preview)
  const activeLogs = useMemo(() => {
    if (!isPreviewMode) return state.dailyLogs
    return buildPreviewLogs(now, cycleModel)
  }, [isPreviewMode, state.dailyLogs, cycleModel])

  // Calendar cells for last 35 days
  const today = startOfDay(now)
  const calendarDays = useMemo(() => {
    const cells = []
    for (let i = 34; i >= 0; i--) {
      const date = addDays(today, -i)
      const key = dateKeyLocal(date)
      const log = activeLogs[key]
      const { phase, dayOfCycle } = phaseForDate(cycleModel, date)
      const isToday = diffDays(date, today) === 0

      // Pain score
      const pain = log?.pain ?? (log?.vibe !== undefined ? 10 - log.vibe : 0)
      const hasImpact = actualImpacts(log).length > 0
      const isPeriodDay = log?.period || (phase === 'menstrual' && dayOfCycle !== null && dayOfCycle < 5)

      cells.push({
        date,
        dayNum: date.getDate(),
        key,
        phase,
        dayOfCycle,
        pain,
        hasImpact,
        isPeriodDay,
        isToday,
        log,
      })
    }
    return cells
  }, [today, activeLogs, cycleModel])

  // Selected Day Details
  const selectedCell = calendarDays.find((c) => c.key === selectedDateKey) || calendarDays[calendarDays.length - 1]

  // Dynamic Pattern Highlights
  const patternInsights = useMemo(() => {
    const insights = []
    const logEntries = Object.entries(activeLogs)

    // 1. Severe Pain in Menstrual Phase
    const severeMenstrual = logEntries.filter(([k, log]) => {
      const d = new Date(`${k}T00:00:00`)
      const { phase } = phaseForDate(cycleModel, d)
      return phase === 'menstrual' && log.pain >= 6
    })

    if (severeMenstrual.length >= 1) {
      insights.push({
        id: 'severe-cramps',
        icon: '🩸',
        title: 'Recurrent Period Cramps (Pain ≥ 6)',
        body: `Severe cramps logged on ${severeMenstrual.length} menstrual day(s). Pain at this level is worth tracking for a doctor.`,
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
        body: 'Log your symptoms for 1 full cycle to unlock automatic symptom-phase pattern detection.',
        actionText: isTodayLogged ? null : 'Log Today < 10s ⏱️',
        onAction: () => navigate('/log'),
        badge: 'Clear',
      })
    }

    return insights
  }, [activeLogs, cycleModel, navigate, isTodayLogged])

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
          {/* Preview Banner */}
          {isPreviewMode && (
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
              <span>✨ <strong>Sample Pattern Preview</strong> — Track daily for custom insights</span>
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
                } else if (cell.pain >= 6) {
                  cellBg = 'var(--pink-accent)'
                  textColor = '#FFF'
                } else if (cell.pain >= 1) {
                  cellBg = '#FCE7F3'
                  textColor = '#9D174D'
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
                      fontWeight: cell.isToday || isSelected || cell.isPeriodDay ? 700 : 500,
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
                  {selectedCell.phase || 'General'} Phase
                </span>
              </div>

              {selectedCell.log ? (
                <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <span><strong>Mood:</strong> {selectedCell.log.mood || 'Normal'}</span>
                    <span><strong>Pain:</strong> {selectedCell.pain > 0 ? `${selectedCell.pain}/10` : '0/10'}</span>
                  </div>
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
                value={FULL_MOCK_SIGNALS.energy.val}
                color={FULL_MOCK_SIGNALS.energy.color}
                description={FULL_MOCK_SIGNALS.energy.desc}
                trendPoints={FULL_MOCK_SIGNALS.energy.trend}
              />
              <MetabolicCard
                title="Skin"
                value={FULL_MOCK_SIGNALS.skin.val}
                color={FULL_MOCK_SIGNALS.skin.color}
                description={FULL_MOCK_SIGNALS.skin.desc}
                trendPoints={FULL_MOCK_SIGNALS.skin.trend}
              />
              <MetabolicCard
                title="Sleep"
                value={FULL_MOCK_SIGNALS.sleep.val}
                color={FULL_MOCK_SIGNALS.sleep.color}
                description={FULL_MOCK_SIGNALS.sleep.desc}
                trendPoints={FULL_MOCK_SIGNALS.sleep.trend}
              />
              <MetabolicCard
                title="Mood"
                value={FULL_MOCK_SIGNALS.mood.val}
                color={FULL_MOCK_SIGNALS.mood.color}
                description={FULL_MOCK_SIGNALS.mood.desc}
                trendPoints={FULL_MOCK_SIGNALS.mood.trend}
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
