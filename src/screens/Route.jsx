import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDots,
  CaretDown,
  ChatCircleText,
  Check,
  ClipboardText,
  Copy,
  DownloadSimple,
  FirstAid,
  Heartbeat,
  Hospital,
  MagnifyingGlass,
  NotePencil,
  Phone,
  Plus,
  ShareNetwork,
  ShieldCheck,
  Stethoscope,
  WarningCircle,
  Users,
  X,
} from '@phosphor-icons/react'
import { Button, TopBar } from '../components/ui.jsx'
import MaisieLogo from '../components/MaisieLogo.jsx'
import NativeDateField from '../components/NativeDateField.jsx'
import { features } from '../config/features.js'
import { buildRouteSummary, ROUTE_WINDOWS } from '../engine/routeSummary.js'
import { buildPatternEvidence, PATTERN_OBSERVATION_META } from '../engine/patternInsights.js'
import { useStore } from '../state/store.jsx'
import { OHIP_NOTE, ONTARIO_CARE_OPTIONS, ROUTE_CARE_REVIEW, URGENT_CARE_OPTIONS } from '../content/route/care.js'
import { healthBackgroundProgress, healthBackgroundValues } from '../lib/healthBackground.js'

const CARE_GROUPS = [
  { id: 'care-soon', title: 'Care and advice', description: 'For a concern you want help with now.', ids: ['walk-in'] },
  { id: 'ongoing-care', title: 'Ongoing care', description: 'For follow-up, referrals, or finding a regular provider.', ids: ['primary-care', 'health-care-connect'] },
  { id: 'private-support', title: 'Confidential support', description: 'Youth-focused services you can contact directly.', ids: ['sexual-health', 'youth-mental-health'] },
]

const CARE_ICONS = {
  'primary-care': Stethoscope,
  'walk-in': Hospital,
  'health-care-connect': MagnifyingGlass,
  'sexual-health': ShieldCheck,
  'youth-mental-health': Heartbeat,
}

const TALK_TABS = [
  {
    id: 'before',
    label: 'Before',
    title: 'Get ready',
    intro: 'Bring the details that are hardest to remember in the moment.',
  },
  {
    id: 'room',
    label: 'In the room',
    title: 'Say what matters first',
    intro: 'Start with the change, how long it has been happening, and how it affects your day.',
  },
  {
    id: 'after',
    label: 'After',
    title: 'Leave with a clear next step',
    intro: 'It is okay to ask for instructions again or write them down.',
  },
]

const QUESTION_OPTIONS = [
  'What could help explain this pattern?',
  'What should I keep tracking?',
  'What options could help with the symptoms?',
  'When should I follow up?',
]

function useRoutePreferences() {
  const { state, dispatch } = useStore()
  const preferences = {
    ...state.routePreferences,
    checklist: state.checklists.talkToDoctor,
  }
  function update(change) {
    const next = typeof change === 'function' ? change(preferences) : change
    if (next.checklist) {
      dispatch({ type: 'SET_CHECKLISTS', payload: { talkToDoctor: next.checklist } })
    }
    const { checklist, ...routeChange } = next
    if (Object.keys(routeChange).length) dispatch({ type: 'SET_ROUTE_PREFERENCES', payload: routeChange })
  }
  return [preferences, update]
}

function RouteCard({ to, Icon, title, text, eyebrow, disabled = false }) {
  const content = (
    <>
      <span className="route-card__icon" aria-hidden="true"><Icon size={22} weight="duotone" /></span>
      <span className="route-card__copy">
        {eyebrow && <span className="route-card__eyebrow">{eyebrow}</span>}
        <strong>{title}</strong>
        <span>{text}</span>
      </span>
      {!disabled && <ArrowRight className="route-card__arrow" size={20} aria-hidden="true" />}
    </>
  )
  if (disabled) return <div className="route-card route-card--disabled">{content}</div>
  return <Link className="route-card" to={to}>{content}</Link>
}

export function RouteHome() {
  if (!features.routeSummary) return <Navigate to="/home" replace />
  const careReady = features.routeCare && features.routeWho
  const urgentReady = features.routeCareReviewed && ROUTE_CARE_REVIEW.clinicalReview === 'complete' && ROUTE_CARE_REVIEW.legalReview === 'complete'
  return (
    <div className="screen screen--pad-bottom route-screen">
      <TopBar title="Route" onBack={false} />
      <header className="route-intro">
        <MaisieLogo variant="wordmark" width={132} style={{ marginBottom: 14 }} />
        <p className="eyebrow">Your next step</p>
        <h1>Turn what you notice into a clearer conversation.</h1>
        <p>Review your pattern, prepare what to say, and understand your options for getting support.</p>
      </header>
      <div className="route-card-list">
        <RouteCard
          to="/route/summary"
          Icon={ClipboardText}
          eyebrow="Your information"
          title="Pattern summary"
          text="Bring a clear view of cycles, symptoms, pain, mood, and daily impact."
        />
        <RouteCard
          to="/route/talk"
          Icon={ChatCircleText}
          eyebrow="Visit prep"
          title="Talk to a clinician"
          text="Plan what to say, what to ask, and what to do after the visit."
        />
        {careReady && (
          <RouteCard
            to="/route/care"
            Icon={Stethoscope}
            eyebrow="Ontario care guide"
            title="Who to see and how it works"
            text="Find the type of care that fits your next step."
          />
        )}
      </div>
      {urgentReady && <Link className="route-urgent-link" to="/route/care/urgent"><FirstAid size={18} /> Need care now?</Link>}
      <p className="route-disclaimer">Maisie helps you organize what you have logged. It does not diagnose a condition or replace medical care.</p>
    </div>
  )
}

function SummarySection({ id, title, children }) {
  return (
    <section id={id} className="route-section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function Metric({ label, value, detail }) {
  return (
    <div className="route-metric">
      <div><strong>{label}</strong>{detail && <span>{detail}</span>}</div>
      <b>{value}</b>
    </div>
  )
}

function countBreakdown(items = [], noun = 'day') {
  return items.map((item) => `${item.name}: ${item.count} ${item.count === 1 ? noun : `${noun}s`}`).join(' · ')
}

function clotSummary(details) {
  if (details.largestClot === 'Large') return 'Large clots reported'
  if (details.largestClot === 'Small') return 'Small clots reported'
  if (details.largestClot === 'None') return 'None reported'
  if (details.clotCounts.some((item) => item.name === 'Not sure')) return 'Not sure'
  if (details.clotCounts.some((item) => item.name === 'Prefer not to say')) return 'Not shared'
  return 'Not logged'
}

function durationSummary(details) {
  if (details.longestDuration) return details.longestDuration
  if (details.durationCounts.some((item) => item.name === 'Not sure')) return 'Not sure'
  if (details.durationCounts.some((item) => item.name === 'Prefer not to say')) return 'Not shared'
  return 'Not logged'
}

function floodingSummary(details) {
  if (!details.floodingAnsweredDays) return 'Not logged'
  if (details.floodingDays) return `${details.floodingDays} ${details.floodingDays === 1 ? 'day' : 'days'}`
  if (details.floodingUnknownDays) return 'Not sure'
  if (details.floodingNotSharedDays) return 'Not shared'
  return 'None reported'
}

function BleedingMetrics({ details }) {
  const fullness = details.productFullness
  const fullnessBasis = details.productLoggedDays
    ? `Across ${details.productLoggedDays} ${details.productLoggedDays === 1 ? 'day' : 'days'} with protection fullness logged`
    : ''
  return (
    <>
      <Metric label="Flow" value={details.heaviestFlow ? `${details.heaviestFlow} at heaviest` : 'Not logged'} detail={countBreakdown(details.flowCounts)} />
      <Metric label="Lightly full changes" value={details.productLoggedDays ? fullness.light : 'Not logged'} detail={fullnessBasis} />
      <Metric label="About half full changes" value={details.productLoggedDays ? fullness.moderate : 'Not logged'} />
      <Metric label="Fully soaked changes" value={details.productLoggedDays ? fullness.full : 'Not logged'} detail={details.fullySoakedDays ? `Logged on ${details.fullySoakedDays} ${details.fullySoakedDays === 1 ? 'day' : 'days'}` : ''} />
      <Metric
        label="Sudden soak-through"
        value={floodingSummary(details)}
        detail={details.floodingAnsweredDays ? `Answered on ${details.floodingAnsweredDays} ${details.floodingAnsweredDays === 1 ? 'day' : 'days'}` : ''}
      />
      <Metric label="Clots" value={clotSummary(details)} detail={countBreakdown(details.clotCounts)} />
      <Metric label="Bleeding length" value={durationSummary(details)} detail={countBreakdown(details.durationCounts, 'entry')} />
    </>
  )
}

function SummaryAccordion({ id, title, summary, open, onToggle, children }) {
  return (
    <section id={id} className={`route-summary-accordion ${open ? 'is-open' : ''}`}>
      <button type="button" aria-expanded={open} aria-controls={`${id}-content`} onClick={onToggle}>
        <span>
          <strong>{title}</strong>
          <small>{summary}</small>
        </span>
        <CaretDown size={19} weight="bold" aria-hidden="true" />
      </button>
      {open && <div id={`${id}-content`} className="route-summary-accordion__content">{children}</div>}
    </section>
  )
}

export function RouteSummary() {
  if (!features.routeSummary) return <Navigate to="/home" replace />
  const { state, dispatch } = useStore()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const windowKey = ROUTE_WINDOWS[searchParams.get('range')] ? searchParams.get('range') : '90'
  const focusId = searchParams.get('focus')
  const focusMeta = PATTERN_OBSERVATION_META[focusId] || null
  const summary = useMemo(() => buildRouteSummary({
    dailyLogs: state.dailyLogs,
    periodLogs: state.periodLogs,
    result: state.result,
    window: windowKey,
  }), [state.dailyLogs, state.periodLogs, state.result, windowKey])
  const focusedEvidence = useMemo(() => {
    if (!focusMeta) return null
    const days = ROUTE_WINDOWS[windowKey].days || Math.max(ruleValue('observations.windowDays'), summary.windowDays)
    return buildPatternEvidence(state.dailyLogs, state.periodLogs, new Date(), days).recurring.find((item) => item.id === focusId) || null
  }, [focusId, focusMeta, state.dailyLogs, state.periodLogs, summary.windowDays, windowKey])
  const selectedObservationIds = state.routePreferences?.selectedObservations || []
  const selectedObservations = selectedObservationIds.map((id) => ({ id, ...PATTERN_OBSERVATION_META[id] })).filter((item) => item.title)
  const [openSections, setOpenSections] = useState(() => new Set(focusMeta?.focusSection ? [focusMeta.focusSection] : []))
  const visitItems = [
    ...summary.flags.map((flag) => ({
      id: `flag-${flag.id}`,
      label: 'Worth discussing',
      title: flag.title,
      note: flag.note,
      tone: 'flag',
    })),
    ...(focusMeta ? [{
      id: `focus-${focusId}`,
      observationId: focusId,
      label: selectedObservationIds.includes(focusId) ? 'Reviewing · Added by you' : 'Reviewing',
      title: focusMeta.title,
      note: focusedEvidence?.body || 'This observation is no longer repeated in this time range, but you can still review the related entries.',
      tone: 'focus',
      removable: selectedObservationIds.includes(focusId),
    }] : []),
    ...selectedObservations.filter((item) => item.id !== focusId).map((item) => ({
      id: `selected-${item.id}`,
      observationId: item.id,
      label: 'Added by you',
      title: item.title,
      note: 'Included in your visit preparation.',
      tone: 'selected',
      removable: true,
    })),
  ]

  useEffect(() => {
    if (!focusMeta) return
    setOpenSections((current) => new Set([...current, focusMeta.focusSection]))
    const timer = window.setTimeout(() => document.getElementById(`route-summary-${focusMeta.focusSection}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 180)
    return () => window.clearTimeout(timer)
  }, [focusMeta])

  function removeSelectedObservation(id) {
    dispatch({
      type: 'SET_ROUTE_PREFERENCES',
      payload: { selectedObservations: selectedObservationIds.filter((item) => item !== id) },
    })
  }

  function toggleSection(id) {
    setOpenSections((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="screen screen--pad-bottom route-screen">
      <TopBar title="Pattern summary" />
      <div className="route-segments" aria-label="Summary time range">
        {Object.entries(ROUTE_WINDOWS).map(([key, item]) => (
          <button key={key} type="button" aria-pressed={windowKey === key} onClick={() => {
            const next = new URLSearchParams(searchParams)
            next.set('range', key)
            setSearchParams(next)
          }}>{item.label}</button>
        ))}
      </div>
      <p className="route-summary-basis">
        <CalendarDots size={17} weight="duotone" aria-hidden="true" />
        <span>Based on <strong>{summary.loggedDays} logged {summary.loggedDays === 1 ? 'day' : 'days'} in this view</strong> · {summary.completedCycles} completed {summary.completedCycles === 1 ? 'cycle' : 'cycles'} recorded</span>
      </p>

      {summary.stage === 'building' ? (
        <section className="route-progress-state">
          <span className="route-progress-state__icon"><NotePencil size={24} weight="duotone" /></span>
          <h1>Building your picture</h1>
          <p>Log {summary.daysUntilMetrics} more {summary.daysUntilMetrics === 1 ? 'day' : 'days'} to start seeing a useful summary.</p>
          <div className="route-progress"><span style={{ width: `${Math.min(100, (summary.loggedDays / 7) * 100)}%` }} /></div>
          <Button block onClick={() => navigate('/log')}>Add a check-in</Button>
        </section>
      ) : (
        <>
          <section className={`route-visit-overview ${visitItems.length ? '' : 'route-visit-overview--empty'}`} aria-labelledby="route-visit-overview-title">
            <p className="eyebrow">For your visit</p>
            <h2 id="route-visit-overview-title">{visitItems.length ? 'What to review' : 'Bring what matters to you'}</h2>
            {visitItems.length ? (
              <div className="route-visit-overview__items">
                {visitItems.map((item) => (
                  <div key={item.id} className={`route-visit-item route-visit-item--${item.tone}`}>
                    <span>
                      <small>{item.label}</small>
                      <strong>{item.title}</strong>
                      <p>{item.note}</p>
                    </span>
                    {item.removable && (
                      <button type="button" onClick={() => removeSelectedObservation(item.observationId)} aria-label={`Remove ${item.title} from visit preparation`}>
                        <X size={16} weight="bold" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : <p>No discussion item has been identified from this view. You can still prepare anything that concerns you.</p>}
            {summary.stage === 'descriptive' && (
              <p className="route-visit-overview__status"><ShieldCheck size={17} weight="duotone" /> Pattern checks begin after two completed cycles.</p>
            )}
            <Link className="route-visit-overview__action" to={focusId ? `/route/talk?focus=${encodeURIComponent(focusId)}` : '/route/talk'}>
              <ChatCircleText size={19} weight="duotone" />
              <span>Prepare what to say</span>
              <ArrowRight size={17} weight="bold" />
            </Link>
          </section>

          <section className="route-summary-snapshot" aria-labelledby="route-summary-snapshot-title">
            <div className="route-summary-snapshot__heading">
              <h2 id="route-summary-snapshot-title">{windowKey === 'all' ? 'All-time snapshot' : `${summary.windowLabel.replace(' days', '')}-day snapshot`}</h2>
              <span>{summary.loggedDays} days logged</span>
            </div>
            <div className="route-summary-snapshot__stats">
              <div><strong>{summary.metrics.bleedingDays || 'None'}</strong><span>Bleeding days</span></div>
              <div><strong>{summary.metrics.worstPain === null ? '—' : `${summary.metrics.worstPain}/10`}</strong><span>Highest pain</span></div>
              <div><strong>{summary.metrics.impactDays || 'None'}</strong><span>Days affected</span></div>
            </div>
          </section>

          <div className="route-summary-details__heading"><h2>Details</h2></div>
          <SummaryAccordion
            id="route-summary-cycles"
            title="Cycles"
            summary={summary.metrics.averageCycleDays ? `${summary.completedCycles} completed · ${summary.metrics.averageCycleDays}-day average` : `${summary.completedCycles} completed · Still collecting`}
            open={openSections.has('cycles')}
            onToggle={() => toggleSection('cycles')}
          >
            {summary.cycles.length ? summary.cycles.map((cycle) => (
              <Metric key={cycle.start} label={new Date(`${cycle.start}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} value={`${cycle.cycleDays} days`} detail={`${cycle.periodDays} bleeding ${cycle.periodDays === 1 ? 'day' : 'days'} logged`} />
            )) : <p className="route-empty">Not enough completed cycle dates in this view.</p>}
          </SummaryAccordion>
          <SummaryAccordion
            id="route-summary-bleeding"
            title="Bleeding details"
            summary={summary.metrics.bleedingDetails.loggedDays
              ? `${summary.metrics.bleedingDetails.loggedDays} ${summary.metrics.bleedingDetails.loggedDays === 1 ? 'day' : 'days'} with details · ${summary.metrics.bleedingDays} bleeding ${summary.metrics.bleedingDays === 1 ? 'day' : 'days'}`
              : summary.metrics.bleedingDays ? `${summary.metrics.bleedingDays} bleeding ${summary.metrics.bleedingDays === 1 ? 'day' : 'days'} · Details not logged` : 'No bleeding details logged'}
            open={openSections.has('bleeding')}
            onToggle={() => toggleSection('bleeding')}
          >
            <BleedingMetrics details={summary.metrics.bleedingDetails} />
          </SummaryAccordion>
          <SummaryAccordion
            id="route-summary-pain"
            title="Pain"
            summary={summary.metrics.worstPain === null ? 'No pain logged' : `Highest ${summary.metrics.worstPain}/10 · ${summary.metrics.painLogCount} ${summary.metrics.painLogCount === 1 ? 'entry' : 'entries'}`}
            open={openSections.has('pain')}
            onToggle={() => toggleSection('pain')}
          >
            <Metric label="Pain entries" value={summary.metrics.painLogCount || 'None logged'} />
            <Metric label="Highest logged" value={summary.metrics.worstPain === null ? 'Not logged' : `${summary.metrics.worstPain}/10`} />
            <Metric label="Severe pain days" value={summary.metrics.highPainDays || 'None logged'} />
          </SummaryAccordion>
          <SummaryAccordion
            id="route-summary-impact"
            title="Daily impact"
            summary={summary.metrics.impactDays ? `${summary.metrics.impactDays} ${summary.metrics.impactDays === 1 ? 'day' : 'days'} affected` : 'No impact logged'}
            open={openSections.has('impact')}
            onToggle={() => toggleSection('impact')}
          >
            {summary.metrics.impacts.length ? summary.metrics.impacts.map((item) => <Metric key={item.name} label={item.name} value={`${item.count} ${item.count === 1 ? 'day' : 'days'}`} />) : <p className="route-empty">No daily impact was logged in this view.</p>}
          </SummaryAccordion>
          <SummaryAccordion
            id="route-summary-mood"
            title="Mood"
            summary={summary.metrics.averageMood === null ? 'Still collecting' : `${summary.metrics.moodLogCount} ${summary.metrics.moodLogCount === 1 ? 'entry' : 'entries'} · ${summary.metrics.averageMood}/5 average`}
            open={openSections.has('mood')}
            onToggle={() => toggleSection('mood')}
          >
            <Metric label="Mood entries" value={summary.metrics.moodLogCount || 'None logged'} />
            <Metric label="Average" value={summary.metrics.averageMood === null ? 'Not enough data' : `${summary.metrics.averageMood}/5`} />
            <Metric label="Timing across cycles" value={summary.metrics.moodPattern.comparedCycles ? `${summary.metrics.moodPattern.comparedCycles} compared` : 'Still collecting'} detail={summary.metrics.moodPattern.summary} />
          </SummaryAccordion>
          <SummaryAccordion
            id="route-summary-symptoms"
            title="Symptoms by area"
            summary={summary.metrics.symptomClusters.length ? `${summary.metrics.symptomClusters.length} ${summary.metrics.symptomClusters.length === 1 ? 'area' : 'areas'} logged` : 'No symptoms logged'}
            open={openSections.has('symptoms')}
            onToggle={() => toggleSection('symptoms')}
          >
            {summary.metrics.symptomClusters.length ? summary.metrics.symptomClusters.map((cluster) => (
              <div className="route-cluster-summary" key={cluster.id}>
                <h3>{cluster.label}</h3>
                {cluster.symptoms.map((item) => <Metric key={item.name} label={item.name} value={`${item.count} ${item.count === 1 ? 'day' : 'days'}`} />)}
              </div>
            )) : <p className="route-empty">No symptoms were logged in this view.</p>}
          </SummaryAccordion>
          <Button block variant="secondary" className="route-summary-export" onClick={() => navigate(`/route/summary/export?range=${windowKey}`)}><DownloadSimple size={18} /> Export or share</Button>
        </>
      )}
      <p className="route-disclaimer">This summary reflects only what was entered in Maisie. Missing entries do not mean that a symptom was absent.</p>
    </div>
  )
}

function exportName(identity, mode) {
  if (mode === 'none') return ''
  const first = identity.name?.trim().split(/\s+/)[0] || 'Maisie user'
  return mode === 'initials' ? first.slice(0, 1).toUpperCase() : first
}

function summaryText(summary, identity, preferences) {
  const lines = [
    'Maisie Health pattern summary',
    exportName(identity, preferences.nameMode),
    `${summary.windowLabel}: ${summary.loggedDays} logged days out of ${summary.windowDays}`,
    `${summary.completedCycles} completed cycles`,
  ].filter(Boolean)
  if (preferences.exportSections.overview) lines.push(`Bleeding: ${summary.metrics.bleedingDays} days; daily impact: ${summary.metrics.impactDays} days`)
  if (preferences.exportSections.cycles) {
    if (summary.metrics.averageCycleDays) lines.push(`Average completed cycle: ${summary.metrics.averageCycleDays} days`)
    if (summary.metrics.averagePeriodDays) lines.push(`Average marked bleeding length: ${summary.metrics.averagePeriodDays} days`)
  }
  if (preferences.exportSections.bleeding) {
    const details = summary.metrics.bleedingDetails
    lines.push('Bleeding details:')
    lines.push(`- Flow: ${details.heaviestFlow ? `${details.heaviestFlow} at heaviest${details.flowCounts.length ? ` (${countBreakdown(details.flowCounts)})` : ''}` : 'not logged'}`)
    lines.push(`- Protection fullness: ${details.productLoggedDays ? `${details.totalProductChanges} changes logged; lightly full ${details.productFullness.light}, about half full ${details.productFullness.moderate}, fully soaked ${details.productFullness.full}` : 'not logged'}`)
    lines.push(`- Sudden soak-through: ${floodingSummary(details).toLowerCase()}`)
    lines.push(`- Clots: ${clotSummary(details).toLowerCase()}${details.clotCounts.length ? ` (${countBreakdown(details.clotCounts)})` : ''}`)
    lines.push(`- Bleeding length: ${durationSummary(details).toLowerCase()}${details.durationCounts.length ? ` (${countBreakdown(details.durationCounts, 'entry')})` : ''}`)
  }
  if (preferences.exportSections.pain) lines.push(`Highest logged pain: ${summary.metrics.worstPain === null ? 'not logged' : `${summary.metrics.worstPain}/10`}`)
  if (preferences.exportSections.impact) lines.push(`Days affected: ${summary.metrics.impactDays}`)
  if (preferences.exportSections.mood) {
    lines.push(`Mood entries: ${summary.metrics.moodLogCount}`)
    lines.push(`Mood timing: ${summary.metrics.moodPattern.summary}`)
  }
  if (preferences.exportSections.symptoms) {
    for (const cluster of summary.metrics.symptomClusters) {
      lines.push(`${cluster.label}: ${cluster.symptoms.map((item) => `${item.name} (${item.count})`).join(', ')}`)
    }
    if (!summary.metrics.symptomClusters.length) lines.push('Symptoms: none logged')
  }
  if (preferences.selectedObservations?.length) {
    lines.push('Selected for your visit:')
    for (const id of preferences.selectedObservations) {
      const item = PATTERN_OBSERVATION_META[id]
      if (item) lines.push(`- ${item.title}`)
    }
  }
  if (preferences.personalNote) lines.push(`Personal note: ${preferences.personalNote}`)
  lines.push('This summary is based on information entered by the user and is not a diagnosis.')
  return lines.join('\n')
}

export function RouteExport() {
  if (!features.routeSummary) return <Navigate to="/home" replace />
  const { state } = useStore()
  const [searchParams] = useSearchParams()
  const windowKey = ROUTE_WINDOWS[searchParams.get('range')] ? searchParams.get('range') : '90'
  const summary = useMemo(() => buildRouteSummary({ dailyLogs: state.dailyLogs, periodLogs: state.periodLogs, result: state.result, window: windowKey }), [state.dailyLogs, state.periodLogs, state.result, windowKey])
  const [preferences, updatePreferences] = useRoutePreferences()
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [copied, setCopied] = useState(false)
  const text = summaryText(summary, state.identity, preferences)

  function confirmExport(callback) {
    if (!preferences.privacyWarningSeen) {
      setShowPrivacy(true)
      return
    }
    callback()
  }
  function markExported() {
    updatePreferences({ lastExportedAt: new Date().toISOString() })
  }
  function printSummary() {
    markExported()
    window.print()
  }
  async function shareSummary() {
    markExported()
    if (navigator.share) await navigator.share({ title: 'Maisie Health pattern summary', text })
    else await copySummary()
  }
  async function copySummary() {
    await navigator.clipboard.writeText(text)
    markExported()
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="screen screen--pad-bottom route-screen route-export">
      <TopBar title="Export summary" />
      <div className="route-export-controls">
        <fieldset>
          <legend>Include</legend>
          {Object.entries({ overview: 'Overview', cycles: 'Cycles', bleeding: 'Bleeding details', pain: 'Pain', impact: 'Daily impact', mood: 'Mood', symptoms: 'Symptoms' }).map(([key, label]) => (
            <label key={key}><span>{label}</span><input type="checkbox" checked={preferences.exportSections[key]} onChange={(event) => updatePreferences({ exportSections: { ...preferences.exportSections, [key]: event.target.checked } })} /></label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Name on summary</legend>
          <div className="route-segments">
            {[['first', 'First name'], ['initials', 'Initial'], ['none', 'None']].map(([key, label]) => <button key={key} type="button" aria-pressed={preferences.nameMode === key} onClick={() => updatePreferences({ nameMode: key })}>{label}</button>)}
          </div>
        </fieldset>
        <label className="route-note"><span>Personal note <small>{preferences.personalNote.length}/280</small></span><textarea maxLength={280} value={preferences.personalNote} onChange={(event) => updatePreferences({ personalNote: event.target.value })} placeholder="Anything you want the clinician to know first" /></label>
      </div>

      <article className="route-print-sheet">
        <MaisieLogo variant="wordmark" width={170} style={{ marginBottom: 14 }} />
        <h1>Pattern summary</h1>
        {exportName(state.identity, preferences.nameMode) && <p className="route-print-name">Prepared for {exportName(state.identity, preferences.nameMode)}</p>}
        <p><strong>{summary.windowLabel}</strong> · {summary.loggedDays} logged days out of {summary.windowDays} · {summary.completedCycles} completed cycles</p>
        {preferences.exportSections.overview && <SummarySection title="Overview"><Metric label="Bleeding days" value={summary.metrics.bleedingDays} /><Metric label="Days affected" value={summary.metrics.impactDays} /></SummarySection>}
        {preferences.exportSections.cycles && <SummarySection title="Cycles"><Metric label="Completed cycles" value={summary.completedCycles} /><Metric label="Average cycle" value={summary.metrics.averageCycleDays ? `${summary.metrics.averageCycleDays} days` : 'Not enough data'} /><Metric label="Average marked bleeding length" value={summary.metrics.averagePeriodDays ? `${summary.metrics.averagePeriodDays} days` : 'Not enough data'} /></SummarySection>}
        {preferences.exportSections.bleeding && <SummarySection title="Bleeding details"><BleedingMetrics details={summary.metrics.bleedingDetails} /></SummarySection>}
        {preferences.exportSections.pain && <SummarySection title="Pain"><Metric label="Highest logged" value={summary.metrics.worstPain === null ? 'Not logged' : `${summary.metrics.worstPain}/10`} /><Metric label="Severe pain days" value={summary.metrics.highPainDays} /></SummarySection>}
        {preferences.exportSections.impact && <SummarySection title="Daily impact"><Metric label="Days affected" value={summary.metrics.impactDays} /></SummarySection>}
        {preferences.exportSections.mood && <SummarySection title="Mood"><Metric label="Mood entries" value={summary.metrics.moodLogCount} /><Metric label="Timing across cycles" value={summary.metrics.moodPattern.comparedCycles ? `${summary.metrics.moodPattern.comparedCycles} compared` : 'Still collecting'} detail={summary.metrics.moodPattern.summary} /></SummarySection>}
        {preferences.exportSections.symptoms && <SummarySection title="Symptoms by area">
          {summary.metrics.symptomClusters.length ? summary.metrics.symptomClusters.map((cluster) => (
            <div className="route-cluster-summary" key={cluster.id}>
              <h3>{cluster.label}</h3>
              {cluster.symptoms.map((item) => <Metric key={item.name} label={item.name} value={`${item.count} ${item.count === 1 ? 'day' : 'days'}`} />)}
            </div>
          )) : <p className="route-empty">No symptoms were logged in this view.</p>}
        </SummarySection>}
        {preferences.selectedObservations?.length > 0 && (
          <SummarySection title="Selected for your visit">
            <div className="route-print-observations">
              {preferences.selectedObservations.map((id) => PATTERN_OBSERVATION_META[id] && <p key={id}>{PATTERN_OBSERVATION_META[id].title}</p>)}
            </div>
          </SummarySection>
        )}
        {preferences.personalNote && <SummarySection title="Personal note"><p>{preferences.personalNote}</p></SummarySection>}
        <p className="route-disclaimer">This summary reflects information entered by the user. It is not medical advice or a diagnosis.</p>
      </article>

      <div className="route-export-actions">
        <Button onClick={() => confirmExport(printSummary)}><DownloadSimple size={18} /> Save PDF</Button>
        <Button variant="secondary" onClick={() => confirmExport(shareSummary)}><ShareNetwork size={18} /> Share</Button>
        <Button variant="secondary" onClick={() => confirmExport(copySummary)}>{copied ? <Check size={18} /> : <Copy size={18} />} {copied ? 'Copied' : 'Copy text'}</Button>
      </div>
      {preferences.lastExportedAt && <p className="route-last-export">Last exported {new Date(preferences.lastExportedAt).toLocaleDateString()}</p>}

      {showPrivacy && (
        <div className="route-modal-backdrop" role="presentation" onClick={() => setShowPrivacy(false)}>
          <div className="route-modal" role="dialog" aria-modal="true" aria-labelledby="privacy-title" onClick={(event) => event.stopPropagation()}>
            <ShieldCheck size={28} weight="duotone" />
            <h2 id="privacy-title">Before you share</h2>
            <p>This summary can include private health information. Check who can see it and where it will be saved.</p>
            <Button block onClick={() => { updatePreferences({ privacyWarningSeen: true }); setShowPrivacy(false) }}>I understand</Button>
            <button className="route-text-button" type="button" onClick={() => setShowPrivacy(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

function VisitPrepRow({ to, onClick, Icon, title, status, complete = false, expanded = false }) {
  const className = `route-prep-task ${complete ? 'is-complete' : ''}`
  const content = (
    <>
      <span className="route-prep-task__icon" aria-hidden="true"><Icon size={20} weight="duotone" /></span>
      <span className="route-prep-task__copy"><strong>{title}</strong><small>{status}</small></span>
      {onClick
        ? <CaretDown className={expanded ? 'is-expanded' : ''} size={18} weight="bold" aria-hidden="true" />
        : <ArrowRight size={18} weight="bold" aria-hidden="true" />}
    </>
  )
  if (to) return <Link className={className} to={to} state={to === '/me/health-background' ? { from: 'route' } : undefined}>{content}</Link>
  return <button className={className} type="button" onClick={onClick} aria-expanded={expanded}>{content}</button>
}

function VisitNotesField({ label, value, placeholder, onChange }) {
  return (
    <label className="route-visit-field">
      <span>{label}</span>
      <textarea maxLength={1000} value={value || ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

export function RouteTalk() {
  if (!features.routeSummary) return <Navigate to="/home" replace />
  const { state, dispatch } = useStore()
  const [preferences, updatePreferences] = useRoutePreferences()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState('before')
  const [copied, setCopied] = useState(false)
  const [questionsOpen, setQuestionsOpen] = useState(false)
  const [medicinesOpen, setMedicinesOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const [medicineDraft, setMedicineDraft] = useState(() => (state.history.medications || []).map((item) => typeof item === 'string' ? item : item?.name || '').filter(Boolean).join('\n'))
  const screenRef = useRef(null)
  const tab = TALK_TABS.find((item) => item.id === activeTab)
  const focusId = PATTERN_OBSERVATION_META[searchParams.get('focus')] ? searchParams.get('focus') : null
  const selectedObservationIds = preferences.selectedObservations || []
  const visitObservationIds = [...new Set([focusId, ...selectedObservationIds].filter(Boolean))]
  const focusedObservation = PATTERN_OBSERVATION_META[focusId || selectedObservationIds[0]]
  const script = focusedObservation?.visitScript || 'I have been tracking a change in my health. It has been happening for a while and it affects my day. I would like to understand what the next step should be.'
  const backgroundProgress = healthBackgroundProgress(healthBackgroundValues(state.answers, state.history))
  const routeSummary = useMemo(() => buildRouteSummary({
    dailyLogs: state.dailyLogs,
    periodLogs: state.periodLogs,
    result: state.result,
    window: '90',
  }), [state.dailyLogs, state.periodLogs, state.result])
  const medicines = (state.history.medications || []).map((item) => typeof item === 'string' ? item : item?.name || '').filter(Boolean)
  const supportLabels = { yes: 'Bringing someone', no: 'Going on your own', unsure: 'Still deciding' }
  const visitNotes = preferences.visitNotes || {}
  const prepStates = [
    routeSummary.loggedDays > 0,
    backgroundProgress.complete,
    preferences.selectedQuestions.length > 0,
    medicines.length > 0,
    Boolean(preferences.supportChoice),
  ]
  const prepComplete = prepStates.filter(Boolean).length

  useEffect(() => {
    screenRef.current?.scrollTo({ top: 0 })
  }, [activeTab])

  function toggleQuestion(question) {
    const selected = preferences.selectedQuestions.includes(question)
    updatePreferences({ selectedQuestions: selected ? preferences.selectedQuestions.filter((item) => item !== question) : [...preferences.selectedQuestions, question] })
  }
  function saveMedicines() {
    const next = medicineDraft.split(/\n+/).map((item) => item.trim()).filter(Boolean).slice(0, 20)
    dispatch({ type: 'SET_HISTORY', payload: { medications: next } })
    setMedicinesOpen(false)
  }
  function updateVisitNote(key, value) {
    updatePreferences({ visitNotes: { ...visitNotes, [key]: value } })
  }
  async function copyScript() {
    await navigator.clipboard.writeText(script)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div ref={screenRef} className="screen screen--pad-bottom route-screen">
      <TopBar title="Talk to a clinician" />
      <p className="route-lede">A little preparation can make it easier to explain what has been changing and what you need.</p>
      <div className="route-segments route-segments--three" aria-label="Visit timing">
        {TALK_TABS.map((item) => <button key={item.id} type="button" aria-pressed={activeTab === item.id} onClick={() => setActiveTab(item.id)}>{item.label}</button>)}
      </div>

      <section className="route-talk-panel">
        <h1>{tab.title}</h1>
        <p>{tab.intro}</p>

        {activeTab === 'before' && (
          <>
            <div className="route-prep-progress">
              <span><strong>{prepComplete} of {prepStates.length}</strong> ready</span>
              <div className="route-progress" role="progressbar" aria-valuenow={prepComplete} aria-valuemin="0" aria-valuemax={prepStates.length}><span style={{ width: `${(prepComplete / prepStates.length) * 100}%` }} /></div>
            </div>

            <div className="route-main-concern">
              <span><small>Main concern</small><strong>{focusedObservation?.title || 'Choose what you want to discuss'}</strong></span>
              <Link to="/patterns?tab=signals">{focusedObservation ? 'Change' : 'Choose'}</Link>
            </div>

            <div className="route-prep-tasks">
              <VisitPrepRow to="/route/summary" Icon={ClipboardText} title="Pattern summary" status={routeSummary.loggedDays ? `${routeSummary.loggedDays} logged ${routeSummary.loggedDays === 1 ? 'day' : 'days'}` : 'No check-ins yet'} complete={routeSummary.loggedDays > 0} />
              <VisitPrepRow to="/me/health-background" Icon={ShieldCheck} title="Health background" status={backgroundProgress.complete ? 'Ready to review' : `${backgroundProgress.total - backgroundProgress.answered} questions left`} complete={backgroundProgress.complete} />
              <VisitPrepRow Icon={ChatCircleText} title="Questions to ask" status={preferences.selectedQuestions.length ? `${preferences.selectedQuestions.length} selected` : 'Choose the questions that matter most'} complete={preferences.selectedQuestions.length > 0} expanded={questionsOpen} onClick={() => setQuestionsOpen((value) => !value)} />
              {questionsOpen && <div className="route-prep-editor"><div className="route-question-list">{QUESTION_OPTIONS.map((question) => <button key={question} type="button" aria-pressed={preferences.selectedQuestions.includes(question)} onClick={() => toggleQuestion(question)}>{question}</button>)}</div></div>}
              <VisitPrepRow Icon={NotePencil} title="Medicines and treatments" status={medicines.length ? `${medicines.length} added` : 'Add what you have already tried'} complete={medicines.length > 0} expanded={medicinesOpen} onClick={() => setMedicinesOpen((value) => !value)} />
              {medicinesOpen && <div className="route-prep-editor"><label className="route-visit-field"><span>One item per line</span><textarea maxLength={600} value={medicineDraft} placeholder={'Ibuprofen\nHeating pad'} onChange={(event) => setMedicineDraft(event.target.value)} /></label><Button block onClick={saveMedicines}>Save medicines</Button></div>}
              <VisitPrepRow Icon={Users} title="Support person" status={supportLabels[preferences.supportChoice] || 'Decide whether someone will join you'} complete={Boolean(preferences.supportChoice)} expanded={supportOpen} onClick={() => setSupportOpen((value) => !value)} />
              {supportOpen && <div className="route-prep-editor route-support-options">{[['yes', 'Someone will join me'], ['no', 'I will go on my own'], ['unsure', 'I am still deciding']].map(([value, label]) => <button key={value} type="button" aria-pressed={preferences.supportChoice === value} onClick={() => { updatePreferences({ supportChoice: value }); setSupportOpen(false) }}>{label}</button>)}</div>}
            </div>

            <button type="button" className="route-appointment-preview" onClick={() => setActiveTab('room')}><span>Open appointment view</span><ArrowRight size={18} weight="bold" /></button>
          </>
        )}

        {activeTab === 'room' && (
          <div className="route-appointment-mode">
            <section>
              <h2>A way to start</h2>
              <blockquote className="route-script">“{script}”</blockquote>
              <button className="route-copy-button" type="button" onClick={copyScript}>{copied ? <Check size={18} /> : <Copy size={18} />} {copied ? 'Copied' : 'Copy statement'}</button>
            </section>
            {visitObservationIds.length > 0 && <section><h2>What you want to discuss</h2><ul className="route-appointment-list">{visitObservationIds.map((id) => PATTERN_OBSERVATION_META[id] && <li key={id}>{PATTERN_OBSERVATION_META[id].title}</li>)}</ul></section>}
            <section><h2>Your questions</h2>{preferences.selectedQuestions.length ? <ol className="route-appointment-list">{preferences.selectedQuestions.map((question) => <li key={question}>{question}</li>)}</ol> : <p className="route-empty">No questions selected yet.</p>}</section>
            {medicines.length > 0 && <section><h2>What you have tried</h2><ul className="route-appointment-list">{medicines.map((item) => <li key={item}>{item}</li>)}</ul></section>}
            <VisitNotesField label="Notes from the conversation" value={visitNotes.room} placeholder="Write down anything you want to remember" onChange={(value) => updateVisitNote('room', value)} />
            <Link className="route-dismissed-link" to="/route/talk/dismissed">If you feel dismissed <ArrowRight size={17} /></Link>
          </div>
        )}

        {activeTab === 'after' && (
          <div className="route-after-visit">
            <VisitNotesField label="The plan" value={visitNotes.plan} placeholder="What did the clinician recommend?" onChange={(value) => updateVisitNote('plan', value)} />
            <VisitNotesField label="Tests, referrals, or medicine changes" value={visitNotes.tests} placeholder="Add anything that needs to happen next" onChange={(value) => updateVisitNote('tests', value)} />
            <label className="route-visit-field"><span>Follow-up date</span><NativeDateField id="route-follow-up-date" label="Follow-up date" value={visitNotes.followUpDate || ''} onChange={(event) => updateVisitNote('followUpDate', event.target.value)} /></label>
            <VisitNotesField label="Questions for next time" value={visitNotes.remainingQuestions} placeholder="Save anything you still want to ask" onChange={(value) => updateVisitNote('remainingQuestions', value)} />
            <Link className="route-appointment-preview" to="/route/summary"><span>Review your pattern summary</span><ArrowRight size={18} weight="bold" /></Link>
          </div>
        )}
      </section>

      <p className="route-disclaimer">These prompts help you prepare for a conversation. They are not medical advice.</p>
    </div>
  )
}

export function RouteDismissed() {
  if (!features.routeSummary) return <Navigate to="/home" replace />
  return (
    <div className="screen screen--pad-bottom route-screen">
      <TopBar title="If you feel dismissed" />
      <header className="route-intro route-intro--compact"><h1>You deserve to be heard.</h1><p>You can slow the conversation down and ask for a clearer next step.</p></header>
      <div className="route-guidance-list">
        <section><strong>Be specific</strong><p>Repeat what has changed, how long it has lasted, and what it stops you from doing.</p></section>
        <section><strong>Ask for the plan</strong><p>Ask what the next step is, what to watch for, and when to come back.</p></section>
        <section><strong>Bring support</strong><p>If you can, ask a trusted person to join you or help you keep notes.</p></section>
        <section><strong>Try another conversation</strong><p>It is okay to ask to speak with another qualified clinician when your concern has not been addressed.</p></section>
      </div>
      <Link className="route-card route-card--compact" to="/route/summary"><ClipboardText size={22} /><span className="route-card__copy"><strong>Bring your pattern summary</strong><span>Use your saved observations to make the timeline easier to explain.</span></span><ArrowRight size={19} /></Link>
    </div>
  )
}

function CareOption({ item, expanded, onToggle }) {
  const Icon = CARE_ICONS[item.id] || Stethoscope
  return (
    <div className={`care-option${expanded ? ' care-option--open' : ''}`}>
      <button
        className="care-option__trigger"
        type="button"
        aria-expanded={expanded}
        aria-controls={`care-option-${item.id}`}
        onClick={onToggle}
      >
        <span className="care-option__icon" aria-hidden="true"><Icon size={21} weight="duotone" /></span>
        <span className="care-option__label"><strong>{item.title}</strong><small>{item.summary}</small></span>
        <CaretDown className="care-option__caret" size={18} aria-hidden="true" />
      </button>
      {expanded && (
        <div className="care-option__detail" id={`care-option-${item.id}`}>
          <p>{item.text}</p>
          <a href={item.sourceUrl} target="_blank" rel="noreferrer">View official Ontario information <ArrowRight size={15} /></a>
        </div>
      )}
    </div>
  )
}

export function RouteCare({ urgent = false }) {
  const [expandedCareId, setExpandedCareId] = useState(null)
  if (!features.routeSummary) return <Navigate to="/home" replace />
  const careReady = features.routeCare
  if (!careReady) {
    return (
      <div className="screen screen--pad-bottom route-screen">
        <TopBar title={urgent ? 'Urgent care' : 'Finding care'} />
        <section className="route-review-state">
          <ShieldCheck size={30} weight="duotone" />
          <h1>Care guidance is being reviewed</h1>
          <p>Maisie will show Ontario care options here after the sources, wording, and safety guidance have completed clinical and legal review.</p>
          <Link to="/route">Back to Route</Link>
        </section>
      </div>
    )
  }
  const urgentReady = features.routeCareReviewed && ROUTE_CARE_REVIEW.clinicalReview === 'complete' && ROUTE_CARE_REVIEW.legalReview === 'complete'
  if (urgent && !urgentReady) return <Navigate to="/route/care" replace />
  if (urgent) return (
    <div className="screen screen--pad-bottom route-screen">
      <TopBar title="Urgent care" />
      <div className="route-notice route-notice--warning"><WarningCircle size={22} /><p><strong>Choose the safest next step</strong><span>Maisie cannot assess an emergency.</span></p></div>
      <div className="route-guidance-list">
        {URGENT_CARE_OPTIONS.map((item) => <section key={item.title}><strong>{item.title}</strong><p>{item.text}</p><a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.sourceLabel}</a></section>)}
      </div>
    </div>
  )
  const health811 = ONTARIO_CARE_OPTIONS.find((item) => item.id === 'health-811')
  return (
    <div className="screen screen--pad-bottom route-screen">
      <TopBar title="Find care" />
      <header className="route-intro route-intro--compact">
        <p className="eyebrow">Ontario care guide</p>
        <h1>Choose your next step.</h1>
        <p>Find advice, a clinic, ongoing care, or private support.</p>
      </header>

      <section className="care-811">
        <span className="care-811__icon" aria-hidden="true"><Phone size={23} weight="duotone" /></span>
        <div className="care-811__copy"><span>Not sure where to start?</span><strong>Talk to a nurse through Health811</strong><small>Free and available day or night.</small></div>
        <div className="care-811__actions">
          <a className="care-811__call" href="tel:811"><Phone size={17} weight="bold" /> Call 811</a>
          <a className="care-811__web" href={health811.sourceUrl} target="_blank" rel="noreferrer">Visit Health811</a>
        </div>
      </section>

      <div className="care-directory">
        {CARE_GROUPS.map((group) => (
          <section className="care-group" key={group.id}>
            <header><h2>{group.title}</h2><p>{group.description}</p></header>
            <div className="care-option-list">
              {group.ids.map((id) => {
                const item = ONTARIO_CARE_OPTIONS.find((option) => option.id === id)
                return item ? <CareOption key={id} item={item} expanded={expandedCareId === id} onToggle={() => setExpandedCareId((current) => current === id ? null : id)} /> : null
              })}
            </div>
          </section>
        ))}
      </div>

      <Link className="care-visit-prep" to="/route/talk">
        <span className="care-visit-prep__icon" aria-hidden="true"><ChatCircleText size={21} weight="duotone" /></span>
        <span><strong>Getting ready for an appointment</strong><small>Prepare what to say and ask about referrals.</small></span>
        <ArrowRight size={18} aria-hidden="true" />
      </Link>

      <details className="care-ohip">
        <summary><span><ShieldCheck size={19} weight="duotone" /> About OHIP coverage</span><CaretDown size={17} aria-hidden="true" /></summary>
        <div><p>{OHIP_NOTE.text}</p><a href={OHIP_NOTE.sourceUrl} target="_blank" rel="noreferrer">View what OHIP covers <ArrowRight size={15} /></a></div>
      </details>
      {urgentReady && <Link className="route-urgent-link" to="/route/care/urgent"><FirstAid size={18} /> Need care now?</Link>}
      <p className="route-source-date">Ontario service links checked {new Date(`${ROUTE_CARE_REVIEW.sourceVerifiedAt}T12:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}.</p>
    </div>
  )
}
