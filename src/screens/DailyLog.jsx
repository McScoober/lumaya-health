// Daily Micro-Logger — single screen, < 10 seconds to complete.
// Maisie rebuild: collapses the former 6-screen (/log/0–5) flow into one panel.
//
// Layout (top to bottom):
//   1. Core period/flow and pain observations
//   2. Shared collapsible symptom clusters
//   3. "Log it" button
//
// After logging:
//   - A short, practical suggestion appears based on the just-saved log
//   - If pain ≥ 8 → RedFlagCard instead of/in addition to tip
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { dateKeyLocal } from '../engine/cyclePredictor.js'
import {
  shouldShowBleedingDetails,
  shouldShowPainRelief,
  symptomIsEnabled,
  trackingModulesFromProfile,
} from '../lib/trackingPreferences.js'
import { groupSymptomOptions, SYMPTOM_CLUSTERS } from '../content/symptomClusters.js'
import { TopBar, Chip } from '../components/ui.jsx'
import MaisieLogo from '../components/MaisieLogo.jsx'
import RedFlagCard from '../components/RedFlagCard.jsx'
import {
  SmileyWink, Smiley, SmileyMeh, SmileySad, SmileyBlank,
  BookOpen, PersonSimpleRun, CalendarBlank, Moon, CheckCircle, CaretDown,
  BowlFood, DotsThreeCircle, Drop, Heartbeat, Sparkle,
} from '@phosphor-icons/react'

// ── Data ──────────────────────────────────────────────────────────────────
const SYMPTOMS = [
  'Cramps', 'Headache', 'Bloating', 'Fatigue',
  'Back pain', 'Breast tenderness', 'Mood changes', 'Skin breakout',
  'Nausea', 'Dizziness', 'Spotting', 'Discharge changes', 'Sleep trouble',
]

const PAIN_TIMING_OPTIONS = [
  'Before bleeding', 'While bleeding', 'After bleeding', 'Between periods',
  'Not sure', 'Prefer not to say',
]

const RELIEF_OPTIONS = [
  'Heat', 'Rest', 'Pain medicine', 'Movement', 'Something else',
  'Nothing yet', 'Not sure', 'Prefer not to say',
]

const RELIEF_RESULT_OPTIONS = [
  'Helped', 'Helped a little', 'Did not help', 'Not sure', 'Prefer not to say',
]

const BLEEDING_EXPERIENCE_OPTIONS = [
  'No leaking or soaking', 'Soaked protection', 'Leaked through clothes or bedding',
  'Both', 'Not sure', 'Prefer not to say',
]

const BLEEDING_DURATION_OPTIONS = [
  'Started today', '2-3 days', '4-7 days', 'More than 7 days',
  'Not sure', 'Prefer not to say',
]

const FLOW_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'heavy', label: 'Heavy' },
]

const CLUSTER_ICONS = {
  'period-bleeding': Drop,
  'pain-cramps': Heartbeat,
  'mood-energy': Smiley,
  sleep: Moon,
  'skin-hair-body': Sparkle,
  'tummy-other': DotsThreeCircle,
  'food-fuel': BowlFood,
}

const OPEN_CLUSTERS_KEY = 'maisie.dailyLog.openClusters'

function readOpenClusters() {
  try {
    const saved = JSON.parse(localStorage.getItem(OPEN_CLUSTERS_KEY) || '[]')
    return new Set(Array.isArray(saved) ? saved : [])
  } catch {
    return new Set()
  }
}

const EXCLUSIVE_RELIEF_OPTIONS = new Set(['Nothing yet', 'Not sure', 'Prefer not to say'])

const VIBE_OPTIONS = [
  { key: 'great', label: 'Great',  value: 5, Icon: SmileyWink,  color: '#4E7554' },
  { key: 'good',  label: 'Good',   value: 4, Icon: Smiley,      color: '#713666' },
  { key: 'okay',  label: 'Okay',   value: 3, Icon: SmileyMeh,   color: '#713666' },
  { key: 'rough', label: 'Rough',  value: 2, Icon: SmileySad,   color: '#EB587B' },
  { key: 'awful', label: 'Awful',  value: 1, Icon: SmileyBlank, color: '#713666' },
]

const IMPACTS = [
  { id: 'school',   label: 'School',   Icon: BookOpen,          color: '#7B9FD4' },
  { id: 'activity', label: 'Activity', Icon: PersonSimpleRun,   color: '#4E7554' },
  { id: 'plans',    label: 'Plans',    Icon: CalendarBlank,     color: '#713666' },
  { id: 'sleep',    label: 'Sleep',    Icon: Moon,              color: '#713666' },
  { id: 'fine',     label: 'All good', Icon: CheckCircle,       color: '#4E7554' },
]

function vibeFromLog(log = {}) {
  return VIBE_OPTIONS.find((option) =>
    option.key === log.vibeLabel ||
    option.value === log.vibe ||
    option.label === log.mood
  ) || null
}

function hasDailyAnswers(log = {}) {
  return log.checkinCompleted === true ||
    log.mood !== undefined ||
    log.vibe !== undefined ||
    log.symptoms !== undefined ||
    log.pain !== undefined ||
    log.impact !== undefined ||
    log.painTiming !== undefined ||
    log.reliefAttempted !== undefined ||
    log.reliefReceived !== undefined ||
    log.bleedingExperience !== undefined ||
    log.bleedingDuration !== undefined
}

// ── Practical post-log guidance ───────────────────────────────────────────
function getDailyTip({ symptoms, pain, impacts, vibe, foodEnabled }) {
  if (symptoms.includes('Cramps') || pain >= 4) {
    return 'A heating pad on your lower abdomen or back may help with cramps. Rest and drink water if you can.'
  }
  if (symptoms.includes('Headache')) {
    return 'Drink some water and lower your screen brightness. Rest in a quiet space if possible.'
  }
  if (symptoms.includes('Nausea')) {
    return 'Try small sips of water and a plain snack. Eat slowly and stop if the nausea gets worse.'
  }
  if (symptoms.includes('Bloating')) {
    return 'A short walk or gentle stretch may help with bloating.'
  }
  if (symptoms.includes('Back pain')) {
    return 'Try lying down with a pillow under your knees to reduce pressure on your lower back.'
  }
  if (symptoms.includes('Fatigue')) {
    return foodEnabled
      ? 'Rest if you can, and consider a snack with protein or iron.'
      : 'Rest if you can, and notice whether the fatigue keeps returning.'
  }
  if (symptoms.includes('Sleep trouble') || impacts.includes('sleep')) {
    return 'Lower the lights, avoid late caffeine, and put your phone down a little earlier.'
  }
  if (symptoms.includes('Mood changes') || vibe?.value <= 2) {
    return 'Take things slowly today. If a low mood feels intense or lasts, talk to someone you trust.'
  }
  if (symptoms.includes('Skin breakout')) {
    return 'Wash gently, moisturize, and avoid picking at breakouts.'
  }
  if (impacts.includes('school') || impacts.includes('activity') || impacts.includes('plans')) {
    return 'Note what was affected today. This can help you explain the pattern later.'
  }
  if (vibe?.value >= 4) {
    return foodEnabled
      ? 'Think about what helped today, such as sleep, food, movement, or less stress.'
      : 'Think about what helped today, such as sleep, movement, or less stress.'
  }
  return 'Your check-in is saved. Keep logging when you notice changes.'
}

// ── Main component ────────────────────────────────────────────────────────
export default function DailyLog() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { state, dispatch } = useStore()

  const todayKey = dateKeyLocal()
  const requestedDateKey = searchParams.get('date') || ''
  const dateKey = /^\d{4}-\d{2}-\d{2}$/.test(requestedDateKey) && requestedDateKey <= todayKey
    ? requestedDateKey
    : todayKey
  const existingLog = state.dailyLogs[dateKey] || {}
  const existingPeriodLog = state.periodLogs[dateKey] || {}
  const trackingModules = trackingModulesFromProfile(state.profile)
  const visibleSymptoms = SYMPTOMS.filter((symptom) => symptomIsEnabled(symptom, trackingModules))
  const groupedSymptoms = groupSymptomOptions(visibleSymptoms)
  const isEditing = hasDailyAnswers(existingLog) || existingPeriodLog.periodPromptAnswered === true
  const isToday = dateKey === todayKey
  const returnTo = searchParams.get('from') === 'patterns' ? '/patterns' : '/home'
  const displayDate = new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const [vibe,    setVibe]    = useState(() => vibeFromLog(existingLog))
  const [periodToday, setPeriodToday] = useState(() => {
    if (existingPeriodLog.period === true || existingPeriodLog.status === 'confirmed') return true
    if (existingPeriodLog.status === 'not_period') return false
    return null
  })
  const [flow, setFlow] = useState(() => existingPeriodLog.flow || '')
  const [pain,    setPain]    = useState(() => typeof existingLog.pain === 'number' ? existingLog.pain : null)
  const [symptoms, setSymptoms] = useState(() => [...(existingLog.symptoms || [])])
  const [impacts,  setImpacts]  = useState(() => [...(existingLog.impact || [])])
  const [painTiming, setPainTiming] = useState(() => existingLog.painTiming || '')
  const [reliefAttempted, setReliefAttempted] = useState(() => [...(existingLog.reliefAttempted || [])])
  const [reliefReceived, setReliefReceived] = useState(() => existingLog.reliefReceived || '')
  const [bleedingExperience, setBleedingExperience] = useState(() => existingLog.bleedingExperience || '')
  const [bleedingDuration, setBleedingDuration] = useState(() => existingLog.bleedingDuration || '')
  const [openClusters, setOpenClusters] = useState(readOpenClusters)
  const [done,    setDone]    = useState(false)    // post-log confirmation state
  const painReliefActive = shouldShowPainRelief(trackingModules, pain)
  const bleedingDetailActive = shouldShowBleedingDetails(trackingModules, {
    period: periodToday === true,
    spotting: symptoms.includes('Spotting'),
    hasExistingDetails: Boolean(existingLog.bleedingExperience || existingLog.bleedingDuration),
  })

  function toggleCluster(clusterId) {
    setOpenClusters((current) => {
      const next = new Set(current)
      if (next.has(clusterId)) next.delete(clusterId)
      else next.add(clusterId)
      localStorage.setItem(OPEN_CLUSTERS_KEY, JSON.stringify([...next]))
      return next
    })
  }

  function toggleSymptom(s) {
    setSymptoms((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }

  function toggleImpact(id) {
    setImpacts((prev) => {
      if (id === 'fine') return prev.includes('fine') ? [] : ['fine']
      const withoutFine = prev.filter((x) => x !== 'fine')
      return withoutFine.includes(id) ? withoutFine.filter((x) => x !== id) : [...withoutFine, id]
    })
  }

  function toggleRelief(option) {
    setReliefAttempted((previous) => {
      if (previous.includes(option)) return previous.filter((item) => item !== option)
      if (EXCLUSIVE_RELIEF_OPTIONS.has(option)) return [option]
      return [...previous.filter((item) => !EXCLUSIVE_RELIEF_OPTIONS.has(item)), option]
    })
  }

  function choosePeriod(value) {
    setPeriodToday((current) => current === value ? null : value)
    if (value === false) setFlow('')
  }

  const clusterCards = SYMPTOM_CLUSTERS.map((cluster) => {
    const symptomOptions = groupedSymptoms.find((group) => group.id === cluster.id)?.symptoms || []
    const showsPainDetails = cluster.id === 'pain-cramps' && painReliefActive
    const showsBleedingDetails = cluster.id === 'period-bleeding' && bleedingDetailActive
    const visible = symptomOptions.length > 0 || showsPainDetails || showsBleedingDetails ||
      cluster.id === 'pain-cramps' || cluster.id === 'mood-energy'
    const selectedSymptoms = symptomOptions.filter((symptom) => symptoms.includes(symptom)).length
    const detailCount = cluster.id === 'pain-cramps'
      ? Number(pain !== null) + Number(impacts.length > 0) + Number(Boolean(painTiming)) + Number(reliefAttempted.length > 0) + Number(Boolean(reliefReceived))
      : cluster.id === 'period-bleeding'
        ? Number(periodToday !== null) + Number(Boolean(flow)) + Number(Boolean(bleedingExperience)) + Number(Boolean(bleedingDuration))
        : cluster.id === 'mood-energy'
          ? Number(vibe !== null)
        : 0
    return { ...cluster, symptomOptions, showsPainDetails, showsBleedingDetails, visible, count: selectedSymptoms + detailCount }
  }).filter((cluster) => cluster.visible)

  function handleLogIt() {
    const clearOptionalFields = []
    if (painReliefActive) clearOptionalFields.push('painTiming', 'reliefAttempted', 'reliefReceived')
    if (bleedingDetailActive) clearOptionalFields.push('bleedingExperience', 'bleedingDuration')
    dispatch({
      type: 'LOG_DAILY',
      dateKey,
      mood: vibe?.label,
      vibe: vibe?.value,
      vibeLabel: vibe?.key,
      symptoms,
      pain: pain ?? undefined,
      clearPain: isEditing && pain === null,
      impact: impacts.filter((id) => id !== 'fine'),
      ...(painReliefActive ? { painTiming, reliefAttempted, reliefReceived } : {}),
      ...(bleedingDetailActive ? { bleedingExperience, bleedingDuration } : {}),
      clearOptionalFields,
    })
    if (periodToday !== null) {
      dispatch({
        type: 'UPDATE_PERIOD_STATUS',
        dateKey,
        period: periodToday,
        periodPromptAnswered: true,
        flow: periodToday ? flow : '',
        source: 'daily-log',
      })
    }
    setDone(true)
  }

  const dailyTip      = getDailyTip({ symptoms, pain: pain ?? 0, impacts, vibe, foodEnabled: trackingModules.food })
  const isHighPain    = (pain ?? 0) >= 8
  const hasSpotting   = symptoms.includes('Spotting')
  const showRedFlag   = isHighPain || (hasSpotting && (pain ?? 0) >= 6)

  // ── Post-log confirmation + instant tip ──────────────────────────────
  if (done) {
    return (
      <div className="screen">
        <TopBar onBack={() => navigate(returnTo)} />
        <div style={{ marginTop: 28, textAlign: 'center' }}>
          <MaisieLogo size={60} />
          <h2 style={{ margin: '14px 0 4px', fontSize: 22 }}>
            {isEditing ? 'Changes saved' : 'Logged'}
          </h2>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            {vibe?.label ? `feeling ${vibe.label.toLowerCase()} · ` : ''}
            {symptoms.length > 0 ? `${symptoms.length} symptom${symptoms.length > 1 ? 's' : ''}` : 'no symptoms'}
          </p>
        </div>

        {/* Red flag takes priority */}
        {showRedFlag ? (
          <RedFlagCard onDismiss={() => navigate(returnTo)} />
        ) : (
          /* Instant tip payoff */
          <div
            style={{
              background: 'linear-gradient(135deg, var(--pink-light, #FFF0F5) 0%, #F5F0FF 100%)',
              border: '1.5px solid rgba(180, 80, 140, 0.15)',
              borderRadius: 18,
              padding: '18px 16px',
              marginTop: 20,
            }}
          >
            <p
              style={{
                margin: '0 0 6px',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--pink-accent, #713666)',
              }}
            >
              Tip from Maisie
            </p>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: '#3F0824' }}>
              {dailyTip}
            </p>
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: 24 }}>
          <button
            id="log-done-home"
            type="button"
            style={{
              width: '100%',
              padding: '15px',
              border: 'none',
              borderRadius: 14,
              background: 'var(--pink-accent, #713666)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
            }}
            onClick={() => navigate(returnTo)}
          >
            {returnTo === '/patterns' ? 'Back to patterns' : 'Back to home'}
          </button>
        </div>
      </div>
    )
  }

  // ── Main micro-logger panel ──────────────────────────────────────────
  const canLog = isEditing ||
    vibe !== null ||
    periodToday !== null ||
    pain !== null ||
    symptoms.some((symptom) => visibleSymptoms.includes(symptom)) ||
    impacts.length > 0 ||
    (painReliefActive && Boolean(painTiming || reliefAttempted.length || reliefReceived)) ||
    (bleedingDetailActive && Boolean(bleedingExperience || bleedingDuration))

  return (
    <div className="screen screen--pad-bottom" id="daily-log-screen">
      <TopBar onBack={() => navigate(returnTo)} />

      <div style={{ marginTop: 12 }}>
        <p className="eyebrow" style={{ marginBottom: 4 }}>{isEditing ? 'Edit daily log' : 'Daily check-in'}</p>
        <h1 style={{ fontSize: 24, marginBottom: 0 }}>{isToday ? 'Today' : displayDate}</h1>
      </div>

      {/* ── 1. Period and flow ─────────────────────────────────────── */}
      <div style={{ marginTop: 20 }}>
        <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 15 }}>
          {isToday ? 'Are you on your period today?' : 'Were you on your period that day?'}
        </p>
        <div className="chips" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          <Chip selected={periodToday === true} onClick={() => choosePeriod(true)}>Yes</Chip>
          <Chip selected={periodToday === false} onClick={() => choosePeriod(false)}>No</Chip>
        </div>
        {periodToday === true && (
          <div style={{ marginTop: 14 }}>
            <p style={{ margin: '0 0 9px', fontSize: 13.5, fontWeight: 700 }}>How was the flow? <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></p>
            <div className="chips" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
              {FLOW_OPTIONS.map((option) => (
                <Chip key={option.value} selected={flow === option.value} onClick={() => setFlow((current) => current === option.value ? '' : option.value)}>{option.label}</Chip>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Pain dot-scale ──────────────────────────────────────── */}
      <div style={{ marginTop: 22 }}>
        <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 15 }}>
          {isToday ? 'Pain level today' : 'Pain level that day'}{' '}
          <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>
            (tap to set)
          </span>
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          {Array.from({ length: 11 }, (_, i) => {
            const val = i
            const isSelected = pain === val
            const isUnder    = pain !== null && val <= pain
            // Color ramps: green → yellow → orange → red
            const dotColor =
              val <= 3 ? '#4E7554'
              : val <= 6 ? '#713666'
              : val <= 8 ? '#EB587B'
              : '#713666'
            return (
              <button
                key={val}
                id={`pain-dot-${val}`}
                type="button"
                aria-label={val === 0 ? 'Pain 0, no pain' : `Pain ${val}`}
                onClick={() => setPain(isSelected ? null : val)}
                style={{
                  flex: 1,
                  aspectRatio: '1',
                  maxWidth: 28,
                  borderRadius: '50%',
                  border: isSelected
                    ? `2px solid ${dotColor}`
                    : isUnder
                    ? 'none'
                    : '1.5px solid rgba(44,24,16,0.1)',
                  background: isUnder ? dotColor : 'transparent',
                  opacity: isUnder ? (isSelected ? 1 : 0.55) : 0.3,
                  cursor: 'pointer',
                  transform: isSelected ? 'scale(1.25)' : 'scale(1)',
                  transition: 'transform 0.1s ease, opacity 0.1s ease',
                  padding: 0,
                }}
              />
            )
          })}
        </div>
        <div
          className="row row--between muted"
          style={{ fontSize: 11, marginTop: 5 }}
        >
          <span>0 · none</span>
          <span>10 · worst</span>
        </div>
        {pain !== null && (
          <p
            style={{
              margin: '6px 0 0',
              fontSize: 13,
              fontWeight: 600,
              color:
                pain <= 3 ? '#4E7554'
                : pain <= 6 ? '#713666'
                : pain <= 8 ? '#EB587B'
                : '#713666',
            }}
          >
            {pain === 0 ? 'No pain' : pain <= 3 ? 'Mild' : pain <= 6 ? 'Moderate' : pain <= 8 ? 'Severe' : 'Extreme'} · {pain}/10
          </p>
        )}
      </div>

      {/* ── 3. Symptom clusters ────────────────────────────────────── */}
      {clusterCards.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 15 }}>Anything else?</p>
          <p className="muted" style={{ margin: '0 0 12px', fontSize: 13 }}>
            Open an area to add what you noticed.
          </p>
          <div style={{ display: 'grid', gap: 9 }}>
            {clusterCards.map((cluster) => (
              <SymptomClusterCard
                key={cluster.id}
                cluster={cluster}
                open={openClusters.has(cluster.id)}
                onToggle={() => toggleCluster(cluster.id)}
              >
                {cluster.id === 'mood-energy' && (
                  <VibeSelector vibe={vibe} onChange={setVibe} isToday={isToday} />
                )}

                {cluster.symptomOptions.length > 0 && (
                  <div className="chips" style={{ marginTop: cluster.id === 'mood-energy' ? 18 : 0 }}>
                    {cluster.symptomOptions.map((symptom) => (
                      <Chip
                        key={symptom}
                        selected={symptoms.includes(symptom)}
                        onClick={() => toggleSymptom(symptom)}
                      >
                        {symptom}
                      </Chip>
                    ))}
                  </div>
                )}

                {cluster.id === 'pain-cramps' && (
                  <ImpactSelector impacts={impacts} onToggle={toggleImpact} />
                )}

                {cluster.showsPainDetails && <>
                  <OptionalChoice
                    label="When did the pain happen?"
                    options={PAIN_TIMING_OPTIONS}
                    value={painTiming}
                    onChange={(value) => setPainTiming(value === painTiming ? '' : value)}
                  />
                  <OptionalChoice
                    label="What did you try for relief?"
                    options={RELIEF_OPTIONS}
                    value={reliefAttempted}
                    onChange={toggleRelief}
                    multiple
                  />
                  {reliefAttempted.some((option) => !EXCLUSIVE_RELIEF_OPTIONS.has(option)) && (
                    <OptionalChoice
                      label="How much did it help?"
                      options={RELIEF_RESULT_OPTIONS}
                      value={reliefReceived}
                      onChange={(value) => setReliefReceived(value === reliefReceived ? '' : value)}
                    />
                  )}
                </>}

                {cluster.showsBleedingDetails && <>
                  <OptionalChoice
                    label="Any leaking or soaking?"
                    options={BLEEDING_EXPERIENCE_OPTIONS}
                    value={bleedingExperience}
                    onChange={(value) => setBleedingExperience(value === bleedingExperience ? '' : value)}
                  />
                  <OptionalChoice
                    label="How long has this bleeding lasted?"
                    options={BLEEDING_DURATION_OPTIONS}
                    value={bleedingDuration}
                    onChange={(value) => setBleedingDuration(value === bleedingDuration ? '' : value)}
                  />
                </>}
              </SymptomClusterCard>
            ))}
          </div>
        </div>
      )}

      {/* ── 4. Log it ──────────────────────────────────────────────── */}

      <div style={{ marginTop: 28 }}>
        {!canLog && (
          <p
            className="muted center"
            style={{ fontSize: 12.5, marginBottom: 8 }}
          >
            Add one answer to continue
          </p>
        )}
        <button
          id="log-it-button"
          type="button"
          disabled={!canLog}
          onClick={handleLogIt}
          style={{
            width: '100%',
            padding: '16px',
            border: 'none',
            borderRadius: 14,
            background: canLog ? 'var(--pink-accent, #713666)' : 'rgba(44,24,16,0.1)',
            color: canLog ? '#fff' : 'rgba(44,24,16,0.35)',
            fontSize: 16,
            fontWeight: 700,
            cursor: canLog ? 'pointer' : 'default',
            transition: 'background 0.15s ease',
          }}
        >
          {isEditing ? 'Save changes' : 'Log it'}
        </button>
        <p className="muted center" style={{ fontSize: 11.5, marginTop: 8 }}>
          {isEditing ? 'Only this day will be updated' : 'Your data stays private'}
        </p>
      </div>
    </div>
  )
}

function SymptomClusterCard({ cluster, open, onToggle, children }) {
  const Icon = CLUSTER_ICONS[cluster.id] || DotsThreeCircle
  const panelId = `symptom-cluster-${cluster.id}`

  return (
    <section style={{ border: '1.5px solid rgba(63,8,36,0.1)', borderRadius: 12, background: '#fff', overflow: 'hidden' }}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        style={{
          width: '100%', minHeight: 64, padding: '11px 13px', border: 0, background: 'transparent',
          display: 'grid', gridTemplateColumns: '36px minmax(0, 1fr) auto', alignItems: 'center',
          gap: 10, color: '#3F0824', textAlign: 'left', cursor: 'pointer',
        }}
      >
        <span style={{ width: 36, height: 36, borderRadius: 8, background: '#F4EDF7', display: 'grid', placeItems: 'center' }}>
          <Icon size={20} weight="duotone" color="#713666" aria-hidden="true" />
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 750 }}>{cluster.label}</span>
          <span className="muted" style={{ display: 'block', marginTop: 2, fontSize: 11.5, lineHeight: 1.35 }}>
            {cluster.description}
          </span>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          {cluster.count > 0 && (
            <span style={{ padding: '3px 7px', borderRadius: 10, background: '#F4EDF7', color: '#713666', fontSize: 10.5, fontWeight: 700 }}>
              {cluster.count}
            </span>
          )}
          <CaretDown
            size={17}
            weight="bold"
            aria-hidden="true"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.16s ease' }}
          />
        </span>
      </button>
      {open && (
        <div id={panelId} style={{ padding: '2px 13px 15px', borderTop: '1px solid rgba(63,8,36,0.07)' }}>
          <div style={{ paddingTop: 13 }}>{children}</div>
        </div>
      )}
    </section>
  )
}

function VibeSelector({ vibe, onChange, isToday }) {
  return (
    <div>
      <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 14 }}>
        {isToday ? 'How are you feeling today?' : 'How were you feeling that day?'}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 7 }}>
        {VIBE_OPTIONS.map(({ key, label, Icon, color, value }) => {
          const selected = vibe?.key === key
          return (
            <button
              key={key}
              id={`vibe-${key}`}
              type="button"
              aria-label={label}
              aria-pressed={selected}
              onClick={() => onChange(selected ? null : { key, label, value })}
              style={{
                aspectRatio: '1', minHeight: 48, border: `1.5px solid ${selected ? color : 'rgba(44,24,16,0.08)'}`,
                borderRadius: 12, background: selected ? `color-mix(in srgb, ${color} 14%, white)` : '#fff',
                display: 'grid', placeItems: 'center', cursor: 'pointer',
                transform: selected ? 'scale(0.95)' : 'scale(1)',
                transition: 'transform 0.12s ease, background 0.12s ease, border 0.12s ease',
              }}
            >
              <Icon size={24} weight={selected ? 'fill' : 'duotone'} color={color} />
            </button>
          )
        })}
      </div>
      {vibe && (
        <p style={{ margin: '6px 0 0', textAlign: 'center', fontSize: 12, color: VIBE_OPTIONS.find((option) => option.key === vibe.key)?.color, fontWeight: 600 }}>
          {vibe.label}
        </p>
      )}
    </div>
  )
}

function ImpactSelector({ impacts, onToggle }) {
  return (
    <div style={{ marginTop: 18 }}>
      <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 14 }}>Did it affect your day?</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 7 }}>
        {IMPACTS.map(({ id, label, Icon, color }) => {
          const selected = impacts.includes(id)
          return (
            <button
              key={id}
              id={`impact-${id}`}
              type="button"
              aria-label={label}
              aria-pressed={selected}
              onClick={() => onToggle(id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                minWidth: 0, padding: '9px 2px', border: `1.5px solid ${selected ? color : 'rgba(44,24,16,0.08)'}`,
                borderRadius: 10, background: selected ? `color-mix(in srgb, ${color} 12%, white)` : '#fff',
                cursor: 'pointer', transition: 'border 0.12s ease, background 0.12s ease',
              }}
            >
              <Icon size={20} weight={selected ? 'fill' : 'regular'} color={selected ? color : 'rgba(44,24,16,0.35)'} />
              <span style={{ fontSize: 9.5, fontWeight: 600, color: selected ? color : 'rgba(44,24,16,0.5)', textAlign: 'center', lineHeight: 1.15 }}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function OptionalChoice({ label, options, value, onChange, multiple = false }) {
  return (
    <div style={{ marginTop: 18 }}>
      <p style={{ margin: '0 0 9px', fontSize: 14, fontWeight: 700 }}>{label}</p>
      <div className="chips">
        {options.map((option) => (
          <Chip
            key={option}
            selected={multiple ? value.includes(option) : value === option}
            onClick={() => onChange(option)}
          >
            {option}
          </Chip>
        ))}
      </div>
    </div>
  )
}
