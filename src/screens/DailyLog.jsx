// Daily Micro-Logger — single screen, < 10 seconds to complete.
// Maisie rebuild: collapses the former 6-screen (/log/0–5) flow into one panel.
//
// Layout (top → bottom):
//   1. Mood row — 5 emoji faces, tap to select
//   2. Pain dot-scale — 0–10 tappable dots (no dragging)
//   3. Symptom bubbles — chip grid (existing set)
//   4. Impact toggles — compact icon row
//   5. "Log it" button
//
// After logging:
//   - A short, practical suggestion appears based on the just-saved log
//   - If pain ≥ 8 → RedFlagCard instead of/in addition to tip
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { dateKeyLocal } from '../engine/cyclePredictor.js'
import { TopBar, Chip } from '../components/ui.jsx'
import MaisieLogo from '../components/MaisieLogo.jsx'
import RedFlagCard from '../components/RedFlagCard.jsx'
import {
  SmileyWink, Smiley, SmileyMeh, SmileySad, SmileyBlank,
  BookOpen, PersonSimpleRun, CalendarBlank, Moon, CheckCircle, CaretDown,
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

const EXCLUSIVE_RELIEF_OPTIONS = new Set(['Nothing yet', 'Not sure', 'Prefer not to say'])

const VIBE_OPTIONS = [
  { key: 'great', label: 'Great',  value: 5, Icon: SmileyWink,  color: '#4BAF6B' },
  { key: 'good',  label: 'Good',   value: 4, Icon: Smiley,      color: '#C8920A' },
  { key: 'okay',  label: 'Okay',   value: 3, Icon: SmileyMeh,   color: '#9B72CC' },
  { key: 'rough', label: 'Rough',  value: 2, Icon: SmileySad,   color: '#E06B6B' },
  { key: 'awful', label: 'Awful',  value: 1, Icon: SmileyBlank, color: '#E0528A' },
]

const IMPACTS = [
  { id: 'school',   label: 'School',   Icon: BookOpen,          color: '#7B9FD4' },
  { id: 'activity', label: 'Activity', Icon: PersonSimpleRun,   color: '#4BAF6B' },
  { id: 'plans',    label: 'Plans',    Icon: CalendarBlank,     color: '#C8920A' },
  { id: 'sleep',    label: 'Sleep',    Icon: Moon,              color: '#9B72CC' },
  { id: 'fine',     label: 'All good', Icon: CheckCircle,       color: '#4BAF6B' },
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
function getDailyTip({ symptoms, pain, impacts, vibe }) {
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
    return 'Rest if you can, and consider a snack with protein or iron.'
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
    return 'Think about what helped today, such as sleep, food, movement, or less stress.'
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
  const isEditing = hasDailyAnswers(existingLog)
  const isToday = dateKey === todayKey
  const returnTo = searchParams.get('from') === 'patterns' ? '/patterns' : '/home'
  const displayDate = new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const [vibe,    setVibe]    = useState(() => vibeFromLog(existingLog))
  const [pain,    setPain]    = useState(() => typeof existingLog.pain === 'number' ? existingLog.pain : null)
  const [symptoms, setSymptoms] = useState(() => [...(existingLog.symptoms || [])])
  const [impacts,  setImpacts]  = useState(() => [...(existingLog.impact || [])])
  const [painTiming, setPainTiming] = useState(() => existingLog.painTiming || '')
  const [reliefAttempted, setReliefAttempted] = useState(() => [...(existingLog.reliefAttempted || [])])
  const [reliefReceived, setReliefReceived] = useState(() => existingLog.reliefReceived || '')
  const [bleedingExperience, setBleedingExperience] = useState(() => existingLog.bleedingExperience || '')
  const [bleedingDuration, setBleedingDuration] = useState(() => existingLog.bleedingDuration || '')
  const [showDetails, setShowDetails] = useState(() => Boolean(
    existingLog.painTiming || existingLog.reliefAttempted?.length || existingLog.reliefReceived ||
    existingLog.bleedingExperience || existingLog.bleedingDuration
  ))
  const [done,    setDone]    = useState(false)    // post-log confirmation state

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

  function handleLogIt() {
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
      painTiming,
      reliefAttempted,
      reliefReceived,
      bleedingExperience,
      bleedingDuration,
      clearOptionalDetails: true,
    })
    setDone(true)
  }

  const dailyTip      = getDailyTip({ symptoms, pain: pain ?? 0, impacts, vibe })
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
                color: 'var(--pink-accent, #E0528A)',
              }}
            >
              Tip from Maisie
            </p>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: '#2C1810' }}>
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
              background: 'var(--pink-accent, #E0528A)',
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
  const canLog = vibe !== null  // mood is the only required field

  return (
    <div className="screen screen--pad-bottom" id="daily-log-screen">
      <TopBar onBack={() => navigate(returnTo)} />

      <div style={{ marginTop: 12 }}>
        <p className="eyebrow" style={{ marginBottom: 4 }}>{isEditing ? 'Edit daily log' : 'Daily check-in'}</p>
        <h1 style={{ fontSize: 24, marginBottom: 0 }}>{isToday ? 'Today' : displayDate}</h1>
      </div>

      {/* ── 1. Mood row ───────────────────────────────────────────── */}
      <div style={{ marginTop: 20 }}>
        <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 15 }}>
          {isToday ? 'How are you feeling today?' : 'How were you feeling that day?'}
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 8,
          }}
        >
          {VIBE_OPTIONS.map(({ key, label, Icon, color, value }) => {
            const selected = vibe?.key === key
            return (
              <button
                key={key}
                id={`vibe-${key}`}
                type="button"
                aria-label={label}
                aria-pressed={selected}
                onClick={() => setVibe({ key, label, value })}
                style={{
                  aspectRatio: '1',
                  minHeight: 56,
                  border: `1.5px solid ${selected ? color : 'rgba(44,24,16,0.08)'}`,
                  borderRadius: 14,
                  background: selected
                    ? `color-mix(in srgb, ${color} 14%, white)`
                    : '#fff',
                  color,
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  transform: selected ? 'scale(0.95)' : 'scale(1)',
                  transition: 'transform 0.12s ease, background 0.12s ease, border 0.12s ease',
                }}
              >
                <Icon size={28} weight={selected ? 'fill' : 'duotone'} color={color} />
              </button>
            )
          })}
        </div>
        {/* Label below selected */}
        {vibe && (
          <p
            style={{
              margin: '6px 0 0',
              textAlign: 'center',
              fontSize: 12,
              color: VIBE_OPTIONS.find((v) => v.key === vibe.key)?.color,
              fontWeight: 600,
            }}
          >
            {vibe.label}
          </p>
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
              val <= 3 ? '#4BAF6B'
              : val <= 6 ? '#C8920A'
              : val <= 8 ? '#E06B6B'
              : '#C01B50'
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
                pain <= 3 ? '#4BAF6B'
                : pain <= 6 ? '#C8920A'
                : pain <= 8 ? '#E06B6B'
                : '#C01B50',
            }}
          >
            {pain === 0 ? 'No pain' : pain <= 3 ? 'Mild' : pain <= 6 ? 'Moderate' : pain <= 8 ? 'Severe' : 'Extreme'} · {pain}/10
          </p>
        )}
      </div>

      {/* ── 3. Symptom bubbles ─────────────────────────────────────── */}
      <div style={{ marginTop: 22 }}>
        <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 15 }}>
          Any symptoms?{' '}
          <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>
            tap all that apply
          </span>
        </p>
        <div className="chips">
          {SYMPTOMS.map((s) => {
            const isSelected = symptoms.includes(s)
            return (
              <Chip
                key={s}
                selected={isSelected}
                onClick={() => toggleSymptom(s)}
              >
                {s}
              </Chip>
            )
          })}
        </div>
      </div>

      {/* ── 4. Impact icon-row ─────────────────────────────────────── */}
      <div style={{ marginTop: 22 }}>
        <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 15 }}>
          Did it affect your day?
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 7,
          }}
        >
          {IMPACTS.map(({ id, label, Icon, color }) => {
            const isSelected = impacts.includes(id)
            return (
              <button
                key={id}
                id={`impact-${id}`}
                type="button"
                aria-label={label}
                aria-pressed={isSelected}
                onClick={() => toggleImpact(id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 5,
                  padding: '10px 4px',
                  border: `1.5px solid ${isSelected ? color : 'rgba(44,24,16,0.08)'}`,
                  borderRadius: 12,
                  background: isSelected
                    ? `color-mix(in srgb, ${color} 12%, white)`
                    : '#fff',
                  cursor: 'pointer',
                  transition: 'border 0.12s ease, background 0.12s ease',
                }}
              >
                <Icon
                  size={22}
                  weight={isSelected ? 'fill' : 'regular'}
                  color={isSelected ? color : 'rgba(44,24,16,0.35)'}
                />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: isSelected ? color : 'rgba(44,24,16,0.4)',
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 5. Log it ──────────────────────────────────────────────── */}
      <div style={{ marginTop: 22 }}>
        <button
          type="button"
          aria-expanded={showDetails}
          onClick={() => setShowDetails((open) => !open)}
          style={{
            width: '100%', minHeight: 48, padding: '11px 14px', borderRadius: 12,
            border: '1.5px solid rgba(44,24,16,0.09)', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            color: '#2C1810', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          <span>More details <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></span>
          <CaretDown
            size={18}
            weight="bold"
            aria-hidden="true"
            style={{ transform: showDetails ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}
          />
        </button>

        {showDetails && (
          <div style={{ padding: '4px 2px 0' }}>
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
          </div>
        )}
      </div>

      <div style={{ marginTop: 28 }}>
        {!canLog && (
          <p
            className="muted center"
            style={{ fontSize: 12.5, marginBottom: 8 }}
          >
            Tap a mood face to continue
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
            background: canLog ? 'var(--pink-accent, #E0528A)' : 'rgba(44,24,16,0.1)',
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
          {isEditing ? 'Only this day will be updated' : 'Takes less than 10 seconds · your data stays private'}
        </p>
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
