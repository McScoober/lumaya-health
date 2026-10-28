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
  foodSensitiveModeIsActive,
} from '../lib/trackingPreferences.js'
import { groupSymptomOptions, SYMPTOM_CLUSTERS } from '../content/symptomClusters.js'
import { TopBar, Chip } from '../components/ui.jsx'
import MaisieLogo from '../components/MaisieLogo.jsx'
import RedFlagCard from '../components/RedFlagCard.jsx'
import MoodSafetyCard from '../components/MoodSafetyCard.jsx'
import { MOOD_ITEM_DEFINITIONS, MOOD_SEVERITY_OPTIONS, moodSafetyStatus } from '../engine/moodPms.js'
import {
  SmileyWink, Smiley, SmileyMeh, SmileySad, SmileyBlank,
  BookOpen, PersonSimpleRun, CalendarBlank, Bed, CheckCircle, CaretDown,
  BowlFood, DotsThreeCircle, Drop, Heartbeat, Sparkle, WarningCircle,
} from '@phosphor-icons/react'

// ── Data ──────────────────────────────────────────────────────────────────
const SYMPTOMS = [
  'Cramps', 'Headache', 'Bloating', 'Fatigue',
  'Back pain', 'Breast tenderness', 'Mood changes', 'Skin breakout',
  'Nausea', 'Dizziness', 'Discharge changes', 'Sleep trouble',
]

const PAIN_TIMING_OPTIONS = [
  'Before bleeding', 'While bleeding', 'After bleeding', 'Between periods',
  'Not sure', 'Prefer not to say',
]

const MEDICINE_OPTIONS = [
  { value: true, label: 'Yes' }, { value: false, label: 'No' },
]

const MEDICINE_RELIEF_OPTIONS = [
  { value: 'full', label: 'A lot' }, { value: 'partial', label: 'A little' },
  { value: 'none', label: 'Not at all' },
]

const BLEEDING_DURATION_OPTIONS = [
  'Started today', '2-3 days', '4-7 days', 'More than 7 days',
  'Not sure', 'Prefer not to say',
]

const ENERGY_OPTIONS = [
  { value: 1, label: 'Very low' }, { value: 2, label: 'Low' }, { value: 3, label: 'Okay' },
  { value: 4, label: 'Good' }, { value: 5, label: 'High' },
]

const SLEEP_HOURS_OPTIONS = ['Under 6', '6-7', '8-9', '10+', 'Not sure', 'Prefer not to say']
const RESTED_OPTIONS = ['Rested', 'Somewhat rested', 'Not rested', 'Not sure', 'Prefer not to say']
const MOVEMENT_OPTIONS = ['Rest day', 'Light movement', 'Active', 'Hard training', 'Prefer not to say']
const MEAL_OPTIONS = [
  { value: 'all', label: 'All or nearly all' }, { value: 'most', label: 'Some' }, { value: 'few', label: 'Very few' },
  { value: 'prefer-not', label: 'Prefer not to say' },
]
const APPETITE_OPTIONS = ['Lower than usual', 'About usual', 'Higher than usual', 'Not sure', 'Prefer not to say']
const CRAVING_OPTIONS = ['Sweet', 'Salty', 'Something else', 'None', 'Not sure', 'Prefer not to say']
const WATER_OPTIONS = ['A little', 'Some', 'Plenty', 'Not sure', 'Prefer not to say']
const IRON_FOOD_OPTIONS = [
  { value: true, label: 'Yes' }, { value: false, label: 'No' },
  { value: 'not-sure', label: 'Not sure' }, { value: 'prefer-not', label: 'Prefer not to say' },
]
const CLOT_OPTIONS = ['None', 'Small', 'Large', 'Not sure', 'Prefer not to say']
const FLOODING_OPTIONS = [
  { value: true, label: 'Yes' }, { value: false, label: 'No' },
  { value: 'not-sure', label: 'Not sure' }, { value: 'prefer-not', label: 'Prefer not to say' },
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
  sleep: Bed,
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

const EXCLUSIVE_CRAVING_OPTIONS = new Set(['None', 'Not sure', 'Prefer not to say'])

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
  { id: 'sleep',    label: 'Sleep',    Icon: Bed,               color: '#713666' },
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
    log.bleedingDuration !== undefined ||
    log.energy !== undefined ||
    log.sleepHours !== undefined ||
    log.rested !== undefined ||
    log.movement !== undefined ||
    log.fuel !== undefined ||
    log.bleeding !== undefined ||
    log.medicineTaken !== undefined ||
    log.medicineRelief !== undefined ||
    log.moodItems !== undefined ||
    log.functionalImpact !== undefined ||
    log.safetyConcern !== undefined
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
  const foodSensitive = foodSensitiveModeIsActive(state.profile, state.dailyLogs)
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
  const existingSpotting = (existingLog.symptoms || []).includes('Spotting')
  const [spotting, setSpotting] = useState(() => existingSpotting ? true : null)
  const [symptoms, setSymptoms] = useState(() => (existingLog.symptoms || []).filter((symptom) => symptom !== 'Spotting'))
  const [impacts,  setImpacts]  = useState(() => [...(existingLog.impact || [])])
  const [painTiming, setPainTiming] = useState(() => existingLog.painTiming || '')
  const [medicineTaken, setMedicineTaken] = useState(() => existingLog.medicineTaken ?? (
    existingLog.reliefAttempted?.includes('Pain medicine') ? true : null
  ))
  const [medicineRelief, setMedicineRelief] = useState(() => existingLog.medicineRelief || ({
    Helped: 'full', 'Helped a little': 'partial', 'Did not help': 'none',
  }[existingLog.reliefReceived] || ''))
  const [bleedingDuration, setBleedingDuration] = useState(() => existingLog.bleedingDuration || '')
  const [energy, setEnergy] = useState(() => existingLog.energy ?? null)
  const [sleepHours, setSleepHours] = useState(() => existingLog.sleepHours || '')
  const [rested, setRested] = useState(() => existingLog.rested || '')
  const [movement, setMovement] = useState(() => existingLog.movement || '')
  const [moodItems, setMoodItems] = useState(() => ({ ...(existingLog.moodItems || {}) }))
  const [functionalImpact, setFunctionalImpact] = useState(() => existingLog.functionalImpact || '')
  const [safetyConcern, setSafetyConcern] = useState(() => existingLog.safetyConcern === true)
  const [fuel, setFuel] = useState(() => ({
    meals: '', appetite: '', cravings: [], ironFood: null, water: '', ...(existingLog.fuel || {}),
  }))
  const [bleeding, setBleeding] = useState(() => ({
    clots: '', flooding: null,
    ...(existingLog.bleeding || {}),
    productFullness: {
      light: 0, moderate: 0, full: 0,
      ...(existingLog.bleeding?.productFullness || {}),
    },
  }))
  const [openClusters, setOpenClusters] = useState(readOpenClusters)
  const [done,    setDone]    = useState(false)    // post-log confirmation state
  const painReliefActive = shouldShowPainRelief(trackingModules, pain)
  const bleedingDetailActive = shouldShowBleedingDetails(trackingModules, {
    period: periodToday === true,
    spotting: periodToday !== true && spotting === true,
  })
  const showIronFoodQuestion = periodToday === true || Object.values(state.periodLogs).some((log) => log?.flow === 'heavy')

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

  function toggleCraving(option) {
    setFuel((current) => {
      const previous = current.cravings || []
      if (previous.includes(option)) return { ...current, cravings: previous.filter((item) => item !== option) }
      if (EXCLUSIVE_CRAVING_OPTIONS.has(option)) return { ...current, cravings: [option] }
      return { ...current, cravings: [...previous.filter((item) => !EXCLUSIVE_CRAVING_OPTIONS.has(item)), option] }
    })
  }

  function choosePeriod(value) {
    setPeriodToday((current) => current === value ? null : value)
    if (value === false) setFlow('')
    if (value === true) setSpotting(null)
  }

  const clusterCards = SYMPTOM_CLUSTERS.map((cluster) => {
    const symptomOptions = groupedSymptoms.find((group) => group.id === cluster.id)?.symptoms || []
    const showsPainDetails = cluster.id === 'pain-cramps' && painReliefActive
    const showsBleedingDetails = cluster.id === 'period-bleeding' && bleedingDetailActive
    const moduleVisible = {
      'period-bleeding': trackingModules.bleedingDetail && periodToday !== null,
      'pain-cramps': true,
      'mood-energy': true,
      sleep: trackingModules.sleep,
      'skin-hair-body': trackingModules.skinHair,
      'tummy-other': trackingModules.symptoms,
      'food-fuel': trackingModules.food && !foodSensitive,
    }[cluster.id]
    const visible = moduleVisible && (symptomOptions.length > 0 || showsPainDetails || showsBleedingDetails ||
      ['period-bleeding', 'pain-cramps', 'mood-energy', 'sleep', 'food-fuel'].includes(cluster.id))
    const selectedSymptoms = symptomOptions.filter((symptom) => symptoms.includes(symptom)).length
    const detailCount = cluster.id === 'pain-cramps'
      ? Number(pain !== null) + Number(impacts.length > 0) + Number(Boolean(painTiming)) + Number(medicineTaken !== null) + Number(Boolean(medicineRelief))
      : cluster.id === 'period-bleeding'
        ? Number(periodToday === false && spotting !== null) + Number(Boolean(bleedingDuration)) +
          Number(Boolean(bleeding.clots)) + Number(bleeding.flooding !== null) + Number(Object.values(bleeding.productFullness).some(Boolean))
        : cluster.id === 'mood-energy'
          ? Number(vibe !== null) + Number(energy !== null) + Number(Boolean(movement)) +
            Object.keys(moodItems).length + Number(Boolean(functionalImpact)) + Number(safetyConcern)
          : cluster.id === 'sleep'
            ? Number(Boolean(sleepHours)) + Number(Boolean(rested))
            : cluster.id === 'food-fuel'
              ? Number(Boolean(fuel.meals)) + Number(Boolean(fuel.appetite)) + Number(fuel.cravings.length > 0) + Number(fuel.ironFood !== null) + Number(Boolean(fuel.water))
              : 0
    const description = cluster.id === 'period-bleeding'
      ? periodToday === true
        ? 'Flow, protection, clots, soaking, and duration.'
        : periodToday === false
          ? 'Spotting or unexpected bleeding.'
          : 'Flow, spotting, and bleeding details.'
      : cluster.description
    return { ...cluster, description, symptomOptions, showsPainDetails, showsBleedingDetails, visible, count: selectedSymptoms + detailCount }
  }).filter((cluster) => cluster.visible)

  function handleLogIt() {
    const clearOptionalFields = []
    if (painReliefActive) clearOptionalFields.push('painTiming', 'medicineTaken', 'medicineRelief')
    if (bleedingDetailActive || (
      trackingModules.bleedingDetail && periodToday === false && spotting === false &&
      Boolean(existingLog.bleeding || existingLog.bleedingExperience || existingLog.bleedingDuration)
    )) clearOptionalFields.push('bleeding', 'bleedingDuration')
    clearOptionalFields.push('energy')
    if (trackingModules.sleep) clearOptionalFields.push('sleepHours', 'rested')
    if (trackingModules.movement) clearOptionalFields.push('movement')
    if (trackingModules.food && !foodSensitive) clearOptionalFields.push('fuel')
    if (trackingModules.moodPms) clearOptionalFields.push('moodItems', 'functionalImpact', 'safetyConcern')
    const editedAt = isEditing || !isToday ? new Date().toISOString() : undefined
    const symptomsToSave = [...symptoms]
    if (trackingModules.bleedingDetail) {
      if (periodToday !== true && spotting === true) symptomsToSave.push('Spotting')
    } else if (existingSpotting) {
      symptomsToSave.push('Spotting')
    }
    dispatch({
      type: 'LOG_DAILY',
      dateKey,
      mood: vibe?.label,
      vibe: vibe?.value,
      vibeLabel: vibe?.key,
      symptoms: symptomsToSave,
      pain: pain ?? undefined,
      clearPain: isEditing && pain === null,
      impact: impacts.filter((id) => id !== 'fine'),
      energy,
      ...(trackingModules.sleep ? { sleepHours, rested } : {}),
      ...(trackingModules.movement ? { movement } : {}),
      ...(trackingModules.food && !foodSensitive ? { fuel } : {}),
      ...(trackingModules.moodPms ? { moodItems, functionalImpact, safetyConcern } : {}),
      ...(painReliefActive ? { painTiming, medicineTaken, medicineRelief } : {}),
      ...(bleedingDetailActive ? { bleeding, bleedingDuration } : {}),
      editedAt,
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
        editedAt,
      })
    }
    setDone(true)
  }

  const dailyTip      = getDailyTip({ symptoms, pain: pain ?? 0, impacts, vibe, foodEnabled: trackingModules.food && !foodSensitive })
  const moodSafety = moodSafetyStatus({
    ...state.dailyLogs,
    [dateKey]: { ...existingLog, moodItems, functionalImpact, safetyConcern },
  }, todayKey)
  const isHighPain    = (pain ?? 0) >= 8
  const hasSpotting   = periodToday !== true && spotting === true
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
        {moodSafety.active ? (
          <div style={{ marginTop: 20 }}><MoodSafetyCard /></div>
        ) : showRedFlag ? (
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
    energy !== null ||
    (trackingModules.sleep && Boolean(sleepHours || rested)) ||
    (trackingModules.movement && Boolean(movement)) ||
    (trackingModules.food && !foodSensitive && Boolean(fuel.meals || fuel.appetite || fuel.cravings.length || fuel.ironFood !== null || fuel.water)) ||
    (trackingModules.moodPms && Boolean(Object.keys(moodItems).length || functionalImpact || safetyConcern)) ||
    (painReliefActive && Boolean(painTiming || medicineTaken !== null || medicineRelief)) ||
    (bleedingDetailActive && Boolean(bleedingDuration || bleeding.clots || bleeding.flooding !== null || Object.values(bleeding.productFullness).some(Boolean)))

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
                  <>
                    <VibeSelector vibe={vibe} onChange={setVibe} isToday={isToday} />
                    <ValueChoice
                      label="How was your energy?"
                      options={ENERGY_OPTIONS}
                      value={energy}
                      onChange={(value) => setEnergy(value === energy ? null : value)}
                    />
                    {trackingModules.movement && (
                      <OptionalChoice label="How much did you move?" options={MOVEMENT_OPTIONS} value={movement} onChange={(value) => setMovement(value === movement ? '' : value)} />
                    )}
                    {trackingModules.moodPms && (
                      <MoodPmsQuestions
                        values={moodItems}
                        onChange={setMoodItems}
                        functionalImpact={functionalImpact}
                        onImpactChange={setFunctionalImpact}
                        safetyConcern={safetyConcern}
                        onSafetyChange={setSafetyConcern}
                      />
                    )}
                  </>
                )}

                {cluster.id === 'sleep' && <>
                  <OptionalChoice label="About how long did you sleep?" options={SLEEP_HOURS_OPTIONS} value={sleepHours} onChange={(value) => setSleepHours(value === sleepHours ? '' : value)} />
                  <OptionalChoice label="How rested did you feel?" options={RESTED_OPTIONS} value={rested} onChange={(value) => setRested(value === rested ? '' : value)} />
                </>}

                {cluster.id === 'period-bleeding' && periodToday === false && (
                  <ValueChoice
                    label="Did you notice spotting or unexpected bleeding?"
                    options={[{ value: true, label: 'Yes' }, { value: false, label: 'No' }]}
                    value={spotting}
                    onChange={(value) => setSpotting(value === spotting ? null : value)}
                  />
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
                  <ValueChoice
                    label="Did you take pain medicine?"
                    options={MEDICINE_OPTIONS}
                    value={medicineTaken}
                    onChange={(value) => {
                      setMedicineTaken(value === medicineTaken ? null : value)
                      if (value !== true) setMedicineRelief('')
                    }}
                  />
                  {medicineTaken === true && (
                    <ValueChoice
                      label="How much relief did you get?"
                      options={MEDICINE_RELIEF_OPTIONS}
                      value={medicineRelief}
                      onChange={(value) => setMedicineRelief(value === medicineRelief ? '' : value)}
                    />
                  )}
                </>}

                {cluster.showsBleedingDetails && <>
                  <div style={{ marginTop: 18 }}>
                    <p style={{ margin: '0 0 3px', fontSize: 14, fontWeight: 700 }}>{isToday ? 'Protection used today' : 'Protection used that day'}</p>
                    <p className="muted" style={{ margin: '0 0 9px', fontSize: 12 }}>Add how full each pad, tampon, cup, or underwear was when changed.</p>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {[
                        ['light', 'Lightly full'], ['moderate', 'About half full'], ['full', 'Fully soaked'],
                      ].map(([key, label]) => (
                        <CountStepper key={key} label={label} value={bleeding.productFullness[key]} onChange={(value) => setBleeding((current) => ({ ...current, productFullness: { ...current.productFullness, [key]: value } }))} />
                      ))}
                    </div>
                  </div>
                  <OptionalChoice label="Did you notice clots?" options={CLOT_OPTIONS} value={bleeding.clots} onChange={(value) => setBleeding((current) => ({ ...current, clots: value === current.clots ? '' : value }))} />
                  <ValueChoice label="Did bleeding suddenly soak through?" options={FLOODING_OPTIONS} value={bleeding.flooding} onChange={(value) => setBleeding((current) => ({ ...current, flooding: value === current.flooding ? null : value }))} />
                  <OptionalChoice
                    label="How long has this bleeding lasted?"
                    options={BLEEDING_DURATION_OPTIONS}
                    value={bleedingDuration}
                    onChange={(value) => setBleedingDuration(value === bleedingDuration ? '' : value)}
                  />
                </>}

                {cluster.id === 'food-fuel' && <>
                  <ValueChoice label="How many of your usual meals or snacks did you have?" options={MEAL_OPTIONS} value={fuel.meals} onChange={(value) => setFuel((current) => ({ ...current, meals: value === current.meals ? '' : value }))} />
                  <OptionalChoice label="How was your appetite?" options={APPETITE_OPTIONS} value={fuel.appetite} onChange={(value) => setFuel((current) => ({ ...current, appetite: value === current.appetite ? '' : value }))} />
                  <OptionalChoice label="Any cravings?" options={CRAVING_OPTIONS} value={fuel.cravings} onChange={toggleCraving} multiple />
                  {showIronFoodQuestion && <ValueChoice label="Did you have an iron-rich food today?" options={IRON_FOOD_OPTIONS} value={fuel.ironFood} onChange={(value) => setFuel((current) => ({ ...current, ironFood: value === current.ironFood ? null : value }))} />}
                  <OptionalChoice label="How was your water intake?" options={WATER_OPTIONS} value={fuel.water} onChange={(value) => setFuel((current) => ({ ...current, water: value === current.water ? '' : value }))} />
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

function MoodPmsQuestions({ values, onChange, functionalImpact, onImpactChange, safetyConcern, onSafetyChange }) {
  return (
    <div className="mood-pms-questions">
      <div className="mood-pms-questions__intro">
        <strong>Mood details</strong>
        <span>Optional. These help compare how you feel before and after your period.</span>
      </div>
      {MOOD_ITEM_DEFINITIONS.map((item) => (
        <fieldset className="mood-pms-item" key={item.id}>
          <legend>{item.label}</legend>
          <div className="mood-pms-scale">
            {MOOD_SEVERITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={values[item.id] === option.value}
                onClick={() => onChange((current) => {
                  const next = { ...current }
                  if (next[item.id] === option.value) delete next[item.id]
                  else next[item.id] = option.value
                  return next
                })}
              >
                <span>{option.value}</span>
                <small>{option.label}</small>
              </button>
            ))}
          </div>
        </fieldset>
      ))}
      <ValueChoice
        label="Did these feelings get in the way today?"
        options={[
          { value: 'none', label: 'Not at all' },
          { value: 'some', label: 'A little' },
          { value: 'a_lot', label: 'A lot' },
        ]}
        value={functionalImpact}
        onChange={(value) => onImpactChange(value === functionalImpact ? '' : value)}
      />
      <button
        type="button"
        className={`mood-safety-choice${safetyConcern ? ' mood-safety-choice--selected' : ''}`}
        aria-pressed={safetyConcern}
        onClick={() => onSafetyChange((current) => !current)}
      >
        <WarningCircle size={20} weight="duotone" aria-hidden="true" />
        I am not feeling safe
      </button>
      {safetyConcern && <MoodSafetyCard compact />}
    </div>
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

function ValueChoice({ label, options, value, onChange }) {
  return (
    <div style={{ marginTop: 18 }}>
      <p style={{ margin: '0 0 9px', fontSize: 14, fontWeight: 700 }}>{label}</p>
      <div className="chips">
        {options.map((option) => (
          <Chip key={String(option.value)} selected={value === option.value} onClick={() => onChange(option.value)}>
            {option.label}
          </Chip>
        ))}
      </div>
    </div>
  )
}

function CountStepper({ label, value, onChange }) {
  return (
    <div style={{ minHeight: 48, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 42px 32px 42px', alignItems: 'center', gap: 6, padding: '6px 8px 6px 12px', border: '1px solid rgba(63,8,36,0.1)', borderRadius: 10 }}>
      <span style={{ fontSize: 13, fontWeight: 650 }}>{label}</span>
      <button type="button" aria-label={`Remove one ${label.toLowerCase()}`} onClick={() => onChange(Math.max(0, value - 1))} disabled={value === 0} style={{ minWidth: 42, minHeight: 42, border: 0, borderRadius: 8, background: '#F4EDF7', color: '#713666', fontSize: 22 }}>-</button>
      <strong style={{ textAlign: 'center', fontSize: 14 }}>{value}</strong>
      <button type="button" aria-label={`Add one ${label.toLowerCase()}`} onClick={() => onChange(Math.min(12, value + 1))} disabled={value >= 12} style={{ minWidth: 42, minHeight: 42, border: 0, borderRadius: 8, background: '#F4EDF7', color: '#713666', fontSize: 20 }}>+</button>
    </div>
  )
}
