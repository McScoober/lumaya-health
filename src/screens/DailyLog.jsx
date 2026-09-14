// Daily Micro-Logger — single screen, < 10 seconds to complete.
// Maisie rebuild: collapses the former 6-screen (/log/0–5) flow into one panel.
//
// Layout (top → bottom):
//   1. Mood row — 5 emoji faces, tap to select
//   2. Pain dot-scale — 1–10 tappable dots (no dragging)
//   3. Symptom bubbles — chip grid (existing set)
//   4. Impact toggles — compact icon row
//   5. "Log it" button
//
// After logging:
//   - Short sisterly advice card appears based on the just-saved log
//   - If pain ≥ 8 → RedFlagCard instead of/in addition to tip
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { dateKeyLocal } from '../engine/cyclePredictor.js'
import { TopBar, Chip } from '../components/ui.jsx'
import MaisieLogo from '../components/MaisieLogo.jsx'
import RedFlagCard from '../components/RedFlagCard.jsx'
import {
  SmileyWink, Smiley, SmileyMeh, SmileySad, SmileyBlank,
  BookOpen, PersonSimpleRun, CalendarBlank, Moon, CheckCircle,
} from '@phosphor-icons/react'

// ── Data ──────────────────────────────────────────────────────────────────
const SYMPTOMS = [
  'Cramps', 'Headache', 'Bloating', 'Fatigue',
  'Back pain', 'Breast tenderness', 'Mood changes', 'Skin breakout',
  'Nausea', 'Spotting', 'Discharge changes', 'Sleep trouble',
]

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

// ── Sisterly post-log advice ──────────────────────────────────────────────
function getSisterlyTip({ symptoms, pain, impacts, vibe }) {
  if (symptoms.includes('Cramps') || pain >= 4) {
    return 'Big-sis move: heat on your lower belly or lower back for 10 minutes. If you can, sip water and give your body a quiet minute.'
  }
  if (symptoms.includes('Headache')) {
    return 'Tiny reset: drink a full glass of water and dim your screen for a few minutes. Headaches hate the dramatic lighting.'
  }
  if (symptoms.includes('Nausea')) {
    return 'Try small sips and something plain or salty. No need for a full meal if your stomach is already negotiating.'
  }
  if (symptoms.includes('Bloating')) {
    return 'A slow walk or gentle stretch can help more than curling into a ball forever. Annoying, but true.'
  }
  if (symptoms.includes('Back pain')) {
    return 'Pillow-under-the-knees trick: lie down, prop your knees, and let your lower back unclench for a bit.'
  }
  if (symptoms.includes('Fatigue')) {
    return 'Low battery day. Pick the smallest next thing, not the whole mountain. A snack with iron or protein can help.'
  }
  if (symptoms.includes('Sleep trouble') || impacts.includes('sleep')) {
    return 'Tonight, aim for boring on purpose: low lights, cozy clothes, phone down a little earlier. Future-you deserves the assist.'
  }
  if (symptoms.includes('Mood changes') || vibe?.value <= 2) {
    return 'Be extra gentle with yourself today. Feelings can be loud without being the whole truth.'
  }
  if (symptoms.includes('Skin breakout')) {
    return 'Hands off the breakout if you can. Wash, moisturize, and let it be boring. Your skin is not a report card.'
  }
  if (impacts.includes('school') || impacts.includes('activity') || impacts.includes('plans')) {
    return 'If today got interrupted, that counts as data, not failure. One honest log helps you explain the pattern later.'
  }
  if (vibe?.value >= 4) {
    return 'Love this for you. Make a tiny note of what helped today, even if it was just sleep, snacks, or less chaos.'
  }
  return 'You logged it. That is enough for today. Maisie gets smarter from honest check-ins, not perfect ones.'
}

// ── Main component ────────────────────────────────────────────────────────
export default function DailyLog() {
  const navigate = useNavigate()
  const { state, dispatch } = useStore()

  const todayKey   = dateKeyLocal()
  const todayLog   = state.dailyLogs[todayKey] || {}
  const alreadyDone = todayLog.checkinCompleted === true

  const [vibe,    setVibe]    = useState(null)
  const [pain,    setPain]    = useState(null)     // null = not yet touched
  const [symptoms, setSymptoms] = useState([])
  const [impacts,  setImpacts]  = useState([])
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

  function handleLogIt() {
    dispatch({
      type: 'LOG_DAILY',
      dateKey: todayKey,
      mood: vibe?.label,
      vibe: vibe?.value,
      vibeLabel: vibe?.key,
      symptoms,
      pain: pain ?? undefined,
      impact: impacts.filter((id) => id !== 'fine'),
    })
    setDone(true)
  }

  const sisterlyTip   = getSisterlyTip({ symptoms, pain: pain ?? 0, impacts, vibe })
  const isHighPain    = (pain ?? 0) >= 8
  const hasSpotting   = symptoms.includes('Spotting')
  const showRedFlag   = isHighPain || (hasSpotting && (pain ?? 0) >= 6)

  // ── Already logged today ─────────────────────────────────────────────
  if (alreadyDone) {
    return (
      <div className="screen center">
        <TopBar onBack={() => navigate('/home')} />
        <div className="spacer" />
        <MaisieLogo size={72} />
        <div className="card" style={{ marginTop: 24, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5 }}>
            you're all caught up for today 🌸<br />
            <span className="muted" style={{ fontSize: 13 }}>see you tomorrow.</span>
          </p>
        </div>
        <div className="spacer" />
        <button
          id="already-logged-home"
          className="btn btn--primary"
          style={{ width: '100%' }}
          onClick={() => navigate('/home')}
        >
          Back to home
        </button>
      </div>
    )
  }

  // ── Post-log confirmation + instant tip ──────────────────────────────
  if (done) {
    return (
      <div className="screen">
        <TopBar onBack={() => navigate('/home')} />
        <div style={{ marginTop: 28, textAlign: 'center' }}>
          <MaisieLogo size={60} />
          <h2 style={{ margin: '14px 0 4px', fontSize: 22 }}>logged ✓</h2>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            {vibe ? `feeling ${vibe.label.toLowerCase()} · ` : ''}
            {symptoms.length > 0 ? `${symptoms.length} symptom${symptoms.length > 1 ? 's' : ''}` : 'no symptoms'}
          </p>
        </div>

        {/* Red flag takes priority */}
        {showRedFlag ? (
          <RedFlagCard onDismiss={() => navigate('/home')} />
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
              Maisie's sisterly tip
            </p>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: '#2C1810' }}>
              {sisterlyTip}
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
            onClick={() => navigate('/home')}
          >
            Back to home
          </button>
        </div>
      </div>
    )
  }

  // ── Main micro-logger panel ──────────────────────────────────────────
  const canLog = vibe !== null  // mood is the only required field

  return (
    <div className="screen screen--pad-bottom" id="daily-log-screen">
      <TopBar onBack={() => navigate('/home')} />

      {/* ── 1. Mood row ───────────────────────────────────────────── */}
      <div style={{ marginTop: 20 }}>
        <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 15 }}>
          How are you feeling today?
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
                onClick={() => setVibe({ key, value })}
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
          Pain level today{' '}
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
          {Array.from({ length: 10 }, (_, i) => {
            const val = i + 1
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
                aria-label={`Pain ${val}`}
                onClick={() => setPain(isSelected ? null : val)}
                style={{
                  flex: 1,
                  aspectRatio: '1',
                  maxWidth: 30,
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
          <span>1 · mild</span>
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
            {pain <= 3 ? 'Mild' : pain <= 6 ? 'Moderate' : pain <= 8 ? 'Severe' : 'Extreme'} · {pain}/10
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
          Log it ✓
        </button>
        <p className="muted center" style={{ fontSize: 11.5, marginTop: 8 }}>
          Takes less than 10 seconds · your data stays private
        </p>
      </div>
    </div>
  )
}
