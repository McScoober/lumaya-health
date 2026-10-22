// Patterns.jsx — 30-Day Cycle, Symptom Patterns & Body Signals
// Integrated view combining:
//   1. 30-Day Cycle & Symptom Calendar (interactive day inspector & clinical highlights)
//   2. Body Signals & Metabolic Trends (Energy, Sleep, Skin, Mood + Cycle Overlay Chart)
//   3. 1-Tap Doctor Summary Export

import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { TopBar, Card, Button, Badge } from '../components/ui.jsx'
import CycleOverlayChart from '../components/CycleOverlayChart.jsx'
import { summarizeDoctorLogs } from '../engine/doctorSummary.js'
import { buildPatternEvidence, buildRouteSignals } from '../engine/patternInsights.js'
import { groupLoggedSymptoms } from '../content/symptomClusters.js'
import { monthCacheKey } from '../lib/historyWindow.js'
import { ArrowRight, CalendarBlank, ChartLineUp, FileText, FirstAidKit, PencilSimple, X } from '@phosphor-icons/react'
import {
  buildCycleModel,
  phaseForDate,
  phaseForDateWithObservations,
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

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

export default function Patterns({ initialTab }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { state, dispatch, historyStatus, loadHistoryMonth } = useStore()

  // Tab State: 'calendar' | 'signals'
  const tabFromUrl = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(tabFromUrl || initialTab || 'calendar')
  const [showDoctorModal, setShowDoctorModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [selectedDateKey, setSelectedDateKey] = useState(dateKeyLocal(new Date()))
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()))

  useEffect(() => {
    if (activeTab === 'calendar' && state.accountId) loadHistoryMonth(visibleMonth)
  }, [activeTab, state.accountId, visibleMonth, loadHistoryMonth])

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
    const summarizedStart = state.cycles?.at(-1)?.start_date
    return buildCycleModel({
      lastStart: starts[starts.length - 1] || summarizedStart || state.answers.lastStart || state.answers.periodStart,
      cycleLength: state.result?.cycleLength,
      predictionsReady: state.result?.patternsReady === true,
      onBirthControl: state.profile.onBirthControl,
    })
  }, [state.answers, state.profile, state.periodLogs, state.cycles, state.result])

  // Current Phase Info for Signals View
  const now = new Date()
  const predictionsReady = state.result?.authoritative === true && state.result.patternsReady === true
  const phaseInfo = phaseForDateWithObservations(cycleModel, state.periodLogs, now)
  const currentPhase = phaseInfo.phase || 'follicular'
  const cycleDay = phaseInfo.dayOfCycle === null || phaseInfo.dayOfCycle === undefined ? 14 : phaseInfo.dayOfCycle + 1
  const phaseMeta = PHASE_META[currentPhase] || PHASE_META.follicular
  const phaseLabel = PHASE_LABELS[currentPhase] || phaseMeta.label || 'Building Up'

  // Count real logs & check if today is logged
  const todayKey = dateKeyLocal(now)
  const isTodayLogged = !!state.dailyLogs[todayKey]
  // Only show entries the user actually logged. Predicted phase/period shading
  // can appear on the calendar, but symptoms, pain, and impacts must be real.
  const activeLogs = state.dailyLogs || {}

  // Calendar cells for the selected month.
  const today = startOfDay(now)
  const currentMonth = startOfMonth(today)
  const canGoNextMonth = visibleMonth < currentMonth
  const monthLabel = visibleMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const visibleMonthKey = state.accountId ? monthCacheKey(state.accountId, visibleMonth) : null
  const isLoadingVisibleMonth = historyStatus.key === visibleMonthKey
  const calendarDays = useMemo(() => {
    const cells = []
    const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate()

    for (let day = 1; day <= daysInMonth; day++) {
      const date = startOfDay(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day))
      const key = dateKeyLocal(date)
      const log = activeLogs[key]
      const periodLog = state.periodLogs[key]
      const phaseResult = predictionsReady ? phaseForDate(cycleModel, date) : { phase: null, dayOfCycle: null }
      const { phase, dayOfCycle } = phaseResult
      const isToday = diffDays(date, today) === 0

      // Pain and impact stay in the day detail; the calendar grid only marks
      // whether something was logged.
      const pain = typeof log?.pain === 'number' ? log.pain : null
      const hasImpact = actualImpacts(log).length > 0
      const isLogged = !!log?.checkinCompleted ||
        log?.vibe !== undefined ||
        log?.mood !== undefined ||
        log?.symptoms !== undefined ||
        log?.pain !== undefined ||
        log?.impact !== undefined
      const isPeriodDay = periodLog?.period === true || log?.period === true
      const isPossiblePeriodDay = !isPeriodDay && periodLog?.status === 'possible'
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
        isPossiblePeriodDay,
        isPredictedPeriodDay,
        isToday,
        log,
        periodLog,
      })
    }
    return cells
  }, [visibleMonth, today, activeLogs, state.periodLogs, cycleModel, predictionsReady])

  const calendarGridCells = useMemo(() => {
    const leadingBlanks = calendarDays[0]?.date.getDay() || 0
    return [
      ...Array.from({ length: leadingBlanks }, (_, index) => ({ type: 'blank', key: `blank-${index}` })),
      ...calendarDays.map((cell) => ({ type: 'day', ...cell })),
    ]
  }, [calendarDays])

  // Selected Day Details
  const selectedCell = calendarDays.find((c) => c.key === selectedDateKey) ||
    calendarDays.find((c) => c.isToday) ||
    calendarDays[0]

  const patternEvidence = useMemo(
    () => buildPatternEvidence(state.dailyLogs, state.periodLogs, now, 90),
    [state.dailyLogs, state.periodLogs, todayKey],
  )
  const routeSignals = useMemo(
    () => buildRouteSignals(state.result, patternEvidence),
    [state.result, patternEvidence],
  )

  // Doctor Summary Report Text
  const doctorReportText = useMemo(() => {
    const name = state.identity.name || 'Maisie User'
    const summary = summarizeDoctorLogs(activeLogs, now)
    const reportStart = addDays(now, -29)

    const symptomSections = summary.symptomClusters.length
      ? summary.symptomClusters
          .map((cluster) => `${cluster.label}: ${cluster.symptoms.map((symptom) => `${symptom.name} (${symptom.count} ${symptom.count === 1 ? 'day' : 'days'})`).join(', ')}`)
          .join('\n')
      : 'No symptoms logged.'

    return `MAISIE HEALTH — 30-DAY PATTERN REPORT
--------------------------------------------------
Patient / User: ${name}
Date Range: ${reportStart.toLocaleDateString()} – ${now.toLocaleDateString()}
Tracked Days: ${summary.totalLogs}

METRICS:
• High-Pain Days (≥7): ${summary.highPainDays} days
• Activity Impact Days: ${summary.impactCount} days
• Observed Cycle Length: ${state.result?.cycleLength ? `${state.result.cycleLength} days` : 'Not available'}

SYMPTOMS BY AREA:
${symptomSections}

PATTERNS DETECTED:
${routeSignals.length ? routeSignals.map((p) => `• ${p.category}: ${p.note}`).join('\n') : '• No clinician discussion signals are ready from the available information.'}

Maisie does not diagnose. This summary reflects reported information, not a medical assessment.`
  }, [state.identity.name, activeLogs, state.result?.cycleLength, routeSignals, todayKey])

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
            <FileText size={15} weight="bold" aria-hidden="true" />
            Visit summary
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
          <CalendarBlank size={17} weight="bold" aria-hidden="true" />
          History
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
          <ChartLineUp size={17} weight="bold" aria-hidden="true" />
          Patterns
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
                background: 'linear-gradient(135deg, #F3EDF7 0%, #E9F1EA 100%)',
                border: '1px solid var(--border-light)',
                fontSize: 12,
                color: '#713666',
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
                    background: 'var(--sage-100)',
                    color: 'var(--sage-700)',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() => {
                    const nextMonth = addMonths(visibleMonth, -1)
                    setVisibleMonth(nextMonth)
                    setSelectedDateKey(dateKeyLocal(nextMonth))
                  }}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    border: '1px solid rgba(0,0,0,0.08)',
                    background: '#fff',
                    color: 'var(--text-primary)',
                    fontSize: 18,
                    fontWeight: 800,
                    lineHeight: 1,
                    cursor: 'pointer',
                  }}
                >
                  ‹
                </button>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', minWidth: 128 }}>
                  {monthLabel}
                </span>
                <button
                  type="button"
                  aria-label="Next month"
                  disabled={!canGoNextMonth}
                  onClick={() => {
                    if (!canGoNextMonth) return
                    const nextMonth = addMonths(visibleMonth, 1)
                    setVisibleMonth(nextMonth)
                    setSelectedDateKey(dateKeyLocal(nextMonth < currentMonth ? nextMonth : today))
                  }}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    border: '1px solid rgba(0,0,0,0.08)',
                    background: canGoNextMonth ? '#fff' : 'var(--lavender-100)',
                    color: canGoNextMonth ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontSize: 18,
                    fontWeight: 800,
                    lineHeight: 1,
                    cursor: canGoNextMonth ? 'pointer' : 'not-allowed',
                    opacity: canGoNextMonth ? 1 : 0.45,
                  }}
                >
                  ›
                </button>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Tap day to view</span>
            </div>

            {(isLoadingVisibleMonth || historyStatus.error) && (
              <p
                role={historyStatus.error ? 'alert' : 'status'}
                style={{ margin: '-6px 0 10px', fontSize: 11, color: historyStatus.error ? 'var(--danger)' : 'var(--text-secondary)' }}
              >
                {historyStatus.error || 'Loading saved days...'}
              </p>
            )}

            <div className="cal">
              {DOW.map((d, i) => (
                <div key={i} className="cal__dow" style={{ fontSize: 11, fontWeight: 700, color: '#6B4C63' }}>
                  {d}
                </div>
              ))}

              {calendarGridCells.map((cell) => {
                if (cell.type === 'blank') {
                  return <div key={cell.key} aria-hidden="true" />
                }

                const isSelected = cell.key === selectedDateKey

                let cellBg = '#FAF7FB'
                let textColor = '#6B4C63'
                let borderStyle = '1px solid rgba(0,0,0,0.06)'

                if (cell.isPeriodDay) {
                  cellBg = '#F4A5B8'
                  textColor = '#3F0824'
                } else if (cell.isPossiblePeriodDay) {
                  cellBg = '#F3EDF7'
                  textColor = '#713666'
                  borderStyle = '1.5px dashed #EB587B'
                } else if (cell.isLogged) {
                  cellBg = '#E9F1EA'
                  textColor = '#4E7554'
                }

                if (isSelected) {
                  borderStyle = '2.5px solid #3F0824'
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

                    {cell.isLogged && !cell.isPeriodDay && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 4,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          background: '#4E7554',
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
                <i style={{ width: 8, height: 8, borderRadius: '50%', background: '#F4A5B8', border: '1px solid #EB587B' }} /> Period
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <i style={{ width: 8, height: 8, borderRadius: '50%', background: '#F3EDF7', border: '1px dashed #EB587B' }} /> Possible period
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <i style={{ width: 8, height: 8, borderRadius: '50%', background: '#E9F1EA', border: '1px solid #4E7554' }} /> Logged
              </span>
            </div>
          </Card>

          {/* Day Inspector Card */}
          {selectedCell && (
            <Card style={{ marginTop: 14, background: '#FAF7FB' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedCell.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  {selectedCell.isToday && <span style={{ marginLeft: 6, color: 'var(--pink-accent)', fontSize: 12 }}>(Today)</span>}
                </p>
                {(selectedCell.isLogged || selectedCell.isPeriodDay) ? (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {selectedCell.isLogged && (
                      <button
                        type="button"
                        aria-label="Edit daily check-in"
                        title="Edit daily check-in"
                        onClick={() => navigate(`/log?date=${selectedCell.key}&from=patterns`)}
                        style={{ minHeight: 30, borderRadius: 999, border: '1px solid #DECFE0', background: '#F3EDF7', color: '#5E2954', padding: '4px 9px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <PencilSimple size={14} weight="bold" aria-hidden="true" /> Edit
                      </button>
                    )}
                    {selectedCell.isPeriodDay && (
                      <button
                        type="button"
                        aria-label="Remove period from this day"
                        title="Remove period from this day"
                        onClick={() => dispatch({
                          type: 'UPDATE_PERIOD_STATUS',
                          dateKey: selectedCell.key,
                          period: false,
                          periodPromptAnswered: true,
                        })}
                        style={{ minHeight: 30, borderRadius: 999, border: '1px solid #F1C5CF', background: '#fff', color: '#8F3651', padding: '4px 9px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Remove period
                      </button>
                    )}
                  </div>
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                    {selectedCell.isPossiblePeriodDay
                      ? 'Possible period'
                      : predictionsReady && selectedCell.phase
                        ? `${selectedCell.phase} phase`
                        : 'No log'}
                  </span>
                )}
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
                  {selectedCell.isPossiblePeriodDay && (
                    <div>
                      <strong style={{ fontSize: 12 }}>Period:</strong>{' '}
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Possible day based on your recent period start</span>
                    </div>
                  )}
                  {selectedCell.log.symptoms && selectedCell.log.symptoms.length > 0 && (
                    <div style={{ display: 'grid', gap: 7 }}>
                      {groupLoggedSymptoms([selectedCell.log]).map((cluster) => (
                        <div key={cluster.id} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <strong style={{ fontSize: 12 }}>{cluster.label}:</strong>
                          {cluster.symptoms.map((symptom) => (
                            <span
                              key={symptom.name}
                              style={{
                                padding: '2px 8px',
                                borderRadius: 10,
                                background: 'rgba(224,76,122,0.1)',
                                color: 'var(--pink-accent)',
                                fontSize: 11,
                                fontWeight: 600,
                              }}
                            >
                              {symptom.name}
                            </span>
                          ))}
                        </div>
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
                            color: '#713666',
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
              ) : selectedCell.isPossiblePeriodDay ? (
                <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                  This is marked as a possible period day until you confirm it.
                </p>
              ) : (
                <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                  No check-in recorded for this day.
                </p>
              )}

              {selectedCell.isPossiblePeriodDay ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => dispatch({
                      type: 'UPDATE_PERIOD_STATUS',
                      dateKey: selectedCell.key,
                      period: true,
                      periodPromptAnswered: true,
                    })}
                    style={{
                      minHeight: 38,
                      borderRadius: 999,
                      border: '1.5px solid #EB587B',
                      background: '#F4A5B8',
                      color: '#3F0824',
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Confirm period
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch({
                      type: 'UPDATE_PERIOD_STATUS',
                      dateKey: selectedCell.key,
                      period: false,
                      periodPromptAnswered: true,
                    })}
                    style={{
                      minHeight: 38,
                      borderRadius: 999,
                      border: '1px solid rgba(0,0,0,0.1)',
                      background: '#fff',
                      color: '#5E3A55',
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Not today
                  </button>
                </div>
              ) : !selectedCell.isPeriodDay ? (
                <button
                  type="button"
                  onClick={() => dispatch({
                    type: 'UPDATE_PERIOD_STATUS',
                    dateKey: selectedCell.key,
                    period: true,
                    periodPromptAnswered: true,
                  })}
                  style={{
                    marginTop: 12,
                    minHeight: 38,
                    width: '100%',
                    borderRadius: 999,
                    border: '1.5px solid #EB587B',
                    background: '#F4A5B8',
                    color: '#3F0824',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Mark as period day
                </button>
              ) : null}
            </Card>
          )}

          {/* Shortcut to the interpretation view */}
          <button
            type="button"
            onClick={() => handleTabChange('signals')}
            style={{
              width: '100%',
              marginTop: 16,
              borderRadius: 16,
              padding: '14px 16px',
              background: '#E9F1EA',
              border: '1.5px solid #A9C7AB',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ChartLineUp size={23} weight="duotone" color="#4E7554" aria-hidden="true" />
              <div>
                <strong style={{ fontSize: 13.5, color: '#713666', display: 'block' }}>
                  See your patterns
                </strong>
                <span style={{ fontSize: 12, color: '#713666' }}>
                  Review repeating observations and what may be worth discussing.
                </span>
              </div>
            </div>
            <ArrowRight size={18} weight="bold" color="#713666" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BODY SIGNALS & METABOLIC CHARTS                                    */}
      {/* ========================================================================= */}
      {activeTab === 'signals' && (
        <div style={{ animation: 'fadeIn 0.2s ease' }}>
          {/* Cycle context */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              Through your cycle
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: phaseMeta?.accent || '#713666',
                background: phaseMeta?.soft || '#F3EDF7',
                padding: '4px 9px',
                borderRadius: 99,
              }}
            >
              {phaseInfo.observed
                ? `Period day ${phaseInfo.dayOfPeriod} logged`
                : predictionsReady
                  ? `Day ${cycleDay} · ${phaseLabel}`
                  : 'Early cycle view'}
            </span>
          </div>

          <Card style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}>
                Cycle context
              </h3>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>General guide</span>
            </div>

            <div style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
              <CycleOverlayChart
                cycleDay={predictionsReady ? cycleDay : null}
                cycleLength={cycleModel.cycleLength}
              />
            </div>

            <p style={{ margin: '14px 0 0', color: '#5E3A55', fontSize: 13, lineHeight: 1.5 }}>
              {predictionsReady
                ? 'This is general cycle education, not a measurement or prediction of your symptoms.'
                : 'Keep logging to build your personal cycle history.'}
            </p>
          </Card>

          <section style={{ marginTop: 22 }} aria-labelledby="recurring-patterns-title">
            <div style={{ marginBottom: 10 }}>
              <p className="eyebrow" style={{ margin: '0 0 4px' }}>Your observations</p>
              <h2 id="recurring-patterns-title" style={{ margin: 0, fontSize: 20 }}>Recurring patterns</h2>
              <p style={{ margin: '5px 0 0', color: 'var(--text-secondary)', fontSize: 12.5 }}>
                Based on {patternEvidence.checkInCount} check-in{patternEvidence.checkInCount === 1 ? '' : 's'} from the last {patternEvidence.days} days.
              </p>
            </div>

            {patternEvidence.recurring.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {patternEvidence.recurring.map((item) => (
                  <Card key={item.id} style={{ padding: '14px 16px' }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{item.title}</p>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.45 }}>{item.body}</p>
                  </Card>
                ))}
              </div>
            ) : (
              <Card style={{ padding: '14px 16px', background: '#FAF7FB' }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>Not enough repeated observations yet</p>
                <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.45 }}>
                  A pattern appears here only after the same observation is logged on at least two days.
                </p>
              </Card>
            )}
          </section>

          <section style={{ marginTop: 22 }} aria-labelledby="route-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
              <span style={{ width: 36, height: 36, borderRadius: 8, background: '#E9F1EA', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <FirstAidKit size={21} weight="duotone" color="#4E7554" aria-hidden="true" />
              </span>
              <div>
                <p className="eyebrow" style={{ margin: '0 0 2px', color: '#4E7554' }}>Route</p>
                <h2 id="route-title" style={{ margin: 0, fontSize: 20 }}>Worth discussing</h2>
              </div>
            </div>

            {routeSignals.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {routeSignals.map((signal) => (
                  <Card key={signal.id} style={{ padding: '16px', borderColor: signal.early ? '#E1D7DE' : '#A9C7AB' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ margin: 0, color: signal.early ? '#713666' : '#4E7554', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
                          {signal.label}
                        </p>
                        <h3 style={{ margin: '5px 0 0', fontSize: 17 }}>{signal.category}</h3>
                      </div>
                      {!signal.early && (
                        <Badge level={signal.displaySeverity === 'URGENT' ? 'Urgent' : 'Moderate'} />
                      )}
                    </div>
                    <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.45 }}>{signal.note}</p>
                    <p style={{ margin: '8px 0 0', color: '#6B4C63', fontSize: 11.5, fontWeight: 600 }}>{signal.basis}</p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 13 }}>
                      {!signal.early && (
                        <button
                          type="button"
                          onClick={() => navigate('/advisor')}
                          style={{ border: 'none', background: 'transparent', padding: 0, color: 'var(--pink-accent)', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                        >
                          Prepare for a visit <ArrowRight size={15} weight="bold" aria-hidden="true" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => navigate('/checkin?from=patterns')}
                        style={{ border: 'none', background: 'transparent', padding: 0, color: '#6B4C63', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      >
                        <PencilSimple size={15} weight="bold" aria-hidden="true" /> This isn't right
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card style={{ padding: '14px 16px', background: '#F4F8F4', borderColor: '#C7DAC9' }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>Nothing to prepare right now</p>
                <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.45 }}>
                  {state.result?.authoritative
                    ? patternEvidence.checkInCount < 7
                      ? `Log ${7 - patternEvidence.checkInCount} more ${7 - patternEvidence.checkInCount === 1 ? 'day' : 'days'} to start a useful Route summary.`
                      : patternEvidence.fullCycleCount < 2
                        ? 'Your observations are ready. Maisie waits for two completed cycles before showing discussion signals.'
                        : 'No discussion signal was identified from your available answers. This is not a medical assessment.'
                    : state.accountId
                      ? 'This section will update after your saved answers are checked.'
                      : 'Save your tracker to keep your information across devices and receive updated results.'}
                </p>
                {!state.accountId && (
                  <button
                    type="button"
                    onClick={() => navigate('/auth?next=/patterns&source=post-onboarding')}
                    style={{ border: 'none', background: 'transparent', padding: 0, marginTop: 10, color: 'var(--pink-accent)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Save tracker
                  </button>
                )}
              </Card>
            )}
          </section>

          <button
            type="button"
            onClick={() => handleTabChange('calendar')}
            style={{ width: '100%', marginTop: 18, minHeight: 48, borderRadius: 8, border: '1px solid #E1D7DE', background: '#fff', color: 'var(--text-primary)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px' }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <CalendarBlank size={19} weight="duotone" aria-hidden="true" /> Review and edit your history
            </span>
            <ArrowRight size={17} weight="bold" aria-hidden="true" />
          </button>
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
              <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <FileText size={19} weight="duotone" aria-hidden="true" /> Visit summary
              </h3>
              <button
                type="button"
                aria-label="Close visit summary"
                onClick={() => setShowDoctorModal(false)}
                style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: '#F3EDF7', color: '#713666', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
              >
                <X size={18} weight="bold" aria-hidden="true" />
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
                {copied ? 'Copied' : 'Copy visit summary'}
              </Button>
              <Button
                variant="secondary"
                block
                onClick={() => {
                  setShowDoctorModal(false)
                  navigate('/advisor')
                }}
              >
                Show me what to say
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
