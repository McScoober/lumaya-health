import { useMemo, useState } from 'react'
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
  ShareNetwork,
  ShieldCheck,
  Stethoscope,
  WarningCircle,
} from '@phosphor-icons/react'
import { Button, TopBar } from '../components/ui.jsx'
import MaisieLogo from '../components/MaisieLogo.jsx'
import { features } from '../config/features.js'
import { buildRouteSummary, ROUTE_WINDOWS } from '../engine/routeSummary.js'
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
    items: [
      ['summary', 'Open your pattern summary'],
      ['questions', 'Choose your most important questions'],
      ['medicines', 'Write down medicines or treatments you have tried'],
      ['support', 'Decide whether you want someone with you'],
    ],
  },
  {
    id: 'room',
    label: 'In the room',
    title: 'Say what matters first',
    intro: 'Start with the change, how long it has been happening, and how it affects your day.',
    items: [
      ['lead', 'Lead with the main concern'],
      ['impact', 'Explain what it stops you from doing'],
      ['show', 'Show your summary if it helps'],
      ['clarify', 'Ask what happens next'],
    ],
  },
  {
    id: 'after',
    label: 'After',
    title: 'Leave with a clear next step',
    intro: 'It is okay to ask for instructions again or write them down.',
    items: [
      ['plan', 'Write down the plan'],
      ['followup', 'Confirm when to follow up'],
      ['results', 'Ask how you will receive results'],
      ['questions-after', 'Save questions that come up later'],
    ],
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

function SummarySection({ title, children }) {
  return (
    <section className="route-section">
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

export function RouteSummary() {
  if (!features.routeSummary) return <Navigate to="/home" replace />
  const { state } = useStore()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const windowKey = ROUTE_WINDOWS[searchParams.get('range')] ? searchParams.get('range') : '90'
  const summary = useMemo(() => buildRouteSummary({
    dailyLogs: state.dailyLogs,
    periodLogs: state.periodLogs,
    result: state.result,
    window: windowKey,
  }), [state.dailyLogs, state.periodLogs, state.result, windowKey])

  return (
    <div className="screen screen--pad-bottom route-screen">
      <TopBar title="Pattern summary" />
      <div className="route-segments" aria-label="Summary time range">
        {Object.entries(ROUTE_WINDOWS).map(([key, item]) => (
          <button key={key} type="button" aria-pressed={windowKey === key} onClick={() => setSearchParams({ range: key })}>{item.label}</button>
        ))}
      </div>
      <div className="route-basis">
        <CalendarDots size={20} weight="duotone" />
        <div><strong>Based on {summary.loggedDays} logged {summary.loggedDays === 1 ? 'day' : 'days'} out of {summary.windowDays}</strong><span>{summary.completedCycles} completed {summary.completedCycles === 1 ? 'cycle' : 'cycles'} recorded</span></div>
      </div>

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
          {summary.stage === 'descriptive' && (
            <div className="route-notice"><ShieldCheck size={21} /><p><strong>Your observations are ready.</strong><span>Maisie will wait for two completed cycles before showing pattern flags.</span></p></div>
          )}
          {summary.stage === 'flags' && summary.flags.length > 0 && (
            <SummarySection title="Worth discussing">
              <div className="route-flag-list">
                {summary.flags.map((flag) => <div key={flag.id}><strong>{flag.title}</strong><p>{flag.note}</p></div>)}
              </div>
            </SummarySection>
          )}
          <SummarySection title="At a glance">
            <Metric label="Days logged" value={summary.loggedDays} />
            <Metric label="Bleeding days" value={summary.metrics.bleedingDays || 'None logged'} />
            <Metric label="Days affected" value={summary.metrics.impactDays || 'None logged'} detail="School, sleep, movement, or plans" />
          </SummarySection>
          <SummarySection title="Cycles">
            {summary.cycles.length ? summary.cycles.map((cycle) => (
              <Metric key={cycle.start} label={new Date(`${cycle.start}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} value={`${cycle.cycleDays} days`} detail={`${cycle.periodDays} bleeding ${cycle.periodDays === 1 ? 'day' : 'days'} logged`} />
            )) : <p className="route-empty">Not enough completed cycle dates in this view.</p>}
          </SummarySection>
          <SummarySection title="Pain">
            <Metric label="Pain entries" value={summary.metrics.painLogCount || 'None logged'} />
            <Metric label="Highest logged" value={summary.metrics.worstPain === null ? 'Not logged' : `${summary.metrics.worstPain}/10`} />
            <Metric label="Severe pain days" value={summary.metrics.highPainDays || 'None logged'} />
          </SummarySection>
          <SummarySection title="Daily impact">
            {summary.metrics.impacts.length ? summary.metrics.impacts.map((item) => <Metric key={item.name} label={item.name} value={`${item.count} ${item.count === 1 ? 'day' : 'days'}`} />) : <p className="route-empty">No daily impact was logged in this view.</p>}
          </SummarySection>
          <SummarySection title="Mood">
            <Metric label="Mood entries" value={summary.metrics.moodLogCount || 'None logged'} />
            <Metric label="Average" value={summary.metrics.averageMood === null ? 'Not enough data' : `${summary.metrics.averageMood}/5`} />
            <Metric label="Timing across cycles" value={summary.metrics.moodPattern.comparedCycles ? `${summary.metrics.moodPattern.comparedCycles} compared` : 'Still collecting'} detail={summary.metrics.moodPattern.summary} />
          </SummarySection>
          <SummarySection title="Symptoms by area">
            {summary.metrics.symptomClusters.length ? summary.metrics.symptomClusters.map((cluster) => (
              <div className="route-cluster-summary" key={cluster.id}>
                <h3>{cluster.label}</h3>
                {cluster.symptoms.map((item) => <Metric key={item.name} label={item.name} value={`${item.count} ${item.count === 1 ? 'day' : 'days'}`} />)}
              </div>
            )) : <p className="route-empty">No symptoms were logged in this view.</p>}
          </SummarySection>
          <Button block onClick={() => navigate(`/route/summary/export?range=${windowKey}`)}>Export or share</Button>
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
  if (preferences.exportSections.cycles && summary.metrics.averageCycleDays) lines.push(`Average completed cycle: ${summary.metrics.averageCycleDays} days`)
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
          {Object.entries({ overview: 'Overview', cycles: 'Cycles', pain: 'Pain', impact: 'Daily impact', mood: 'Mood', symptoms: 'Symptoms' }).map(([key, label]) => (
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
        {preferences.exportSections.cycles && <SummarySection title="Cycles"><Metric label="Completed cycles" value={summary.completedCycles} /><Metric label="Average cycle" value={summary.metrics.averageCycleDays ? `${summary.metrics.averageCycleDays} days` : 'Not enough data'} /></SummarySection>}
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

export function RouteTalk() {
  if (!features.routeSummary) return <Navigate to="/home" replace />
  const { state } = useStore()
  const [preferences, updatePreferences] = useRoutePreferences()
  const [activeTab, setActiveTab] = useState('before')
  const [copied, setCopied] = useState(false)
  const tab = TALK_TABS.find((item) => item.id === activeTab)
  const script = 'I have been tracking a change in my health. It has been happening for a while and it affects my day. I would like to understand what the next step should be.'
  function toggleChecklist(key) {
    updatePreferences({ checklist: { ...preferences.checklist, [key]: !preferences.checklist[key] } })
  }
  function toggleQuestion(question) {
    const selected = preferences.selectedQuestions.includes(question)
    updatePreferences({ selectedQuestions: selected ? preferences.selectedQuestions.filter((item) => item !== question) : [...preferences.selectedQuestions, question] })
  }
  async function copyScript() {
    await navigator.clipboard.writeText(script)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }
  return (
    <div className="screen screen--pad-bottom route-screen">
      <TopBar title="Talk to a clinician" />
      <p className="route-lede">A little preparation can make it easier to explain what has been changing and what you need.</p>
      <Link className="route-background-link" to="/me/health-background" state={{ from: 'route' }}>
        <span><strong>My health background</strong><small>{healthBackgroundProgress(healthBackgroundValues(state.answers, state.history)).complete ? 'Review the context Maisie uses to personalize visit preparation.' : 'Add context that can make visit preparation more useful.'}</small></span>
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
      <div className="route-segments route-segments--three" aria-label="Visit timing">
        {TALK_TABS.map((item) => <button key={item.id} type="button" aria-pressed={activeTab === item.id} onClick={() => setActiveTab(item.id)}>{item.label}</button>)}
      </div>
      <section className="route-talk-panel">
        <h1>{tab.title}</h1>
        <p>{tab.intro}</p>
        <div className="route-checklist">
          {tab.items.map(([key, label]) => <label key={key}><input type="checkbox" checked={Boolean(preferences.checklist[key])} onChange={() => toggleChecklist(key)} /><span>{label}</span></label>)}
        </div>
      </section>
      {activeTab === 'before' && (
        <SummarySection title="Questions to bring">
          <div className="route-question-list">{QUESTION_OPTIONS.map((question) => <button key={question} type="button" aria-pressed={preferences.selectedQuestions.includes(question)} onClick={() => toggleQuestion(question)}>{question}</button>)}</div>
        </SummarySection>
      )}
      {activeTab === 'room' && (
        <SummarySection title="A way to start">
          <blockquote className="route-script">“{script}”</blockquote>
          <button className="route-copy-button" type="button" onClick={copyScript}>{copied ? <Check size={18} /> : <Copy size={18} />} {copied ? 'Copied' : 'Copy script'}</button>
        </SummarySection>
      )}
      <Link className="route-dismissed-link" to="/route/talk/dismissed">If you feel dismissed <ArrowRight size={17} /></Link>
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
