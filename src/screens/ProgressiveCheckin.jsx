// ProgressiveCheckin — surfaces the 15 deferred onboarding questions
// as 2 mini-cards per day on the Home screen over the first week.
// Only shown when state.answers.fastStart === true and there are still
// unanswered questions in the deferred deck.
//
// Each card shows one question at a time. Answering dispatches ANSWER_PROGRESSIVE
// which saves the answer and increments progressiveQIndex.
import { useState, useMemo } from 'react'
import { useStore } from '../state/store.jsx'
import { DEEP_QUESTIONS, PAIN_ANCHORS, painLabel } from '../data/questions.js'
import { Chip, ChipGroup } from '../components/ui.jsx'
import { dateKeyLocal } from '../engine/cyclePredictor.js'

// Questions shown during fast-start seed (already answered)
const SEED_KEYS = new Set(['age', 'started', 'lastStart', 'flow', 'painWorst'])
// Questions we actively defer to progressive cards (everything else)
const DEFERRED = DEEP_QUESTIONS.filter(
  (q) => !SEED_KEYS.has(q.key) && q.type !== 'your_thing'
)

// Friendly intro labels per section
const SECTION_LABELS = {
  'Your cycle':    'Getting to know your cycle',
  'Your flow':     'About your flow',
  'Pain':          'About your pain',
  'Physical signs':'Physical signs',
  'Lifestyle':     'Your lifestyle',
  'About you':     'A little more about you',
}

export default function ProgressiveCheckin() {
  const { state, dispatch } = useStore()
  const { answers, progressiveQIndex } = state

  // Only show this component if the user went through fast-start
  if (!answers.fastStart) return null

  // Filter to questions still applicable (respect skip logic)
  const active = useMemo(() => {
    return DEFERRED.filter((q) => {
      if (q.skipIf && q.skipIf(answers)) return false
      if (answers[q.key] !== undefined && answers[q.key] !== null && answers[q.key] !== '') return false
      return true
    })
  }, [answers, progressiveQIndex])

  // Show at most 2 questions per session day
  const todayKey     = dateKeyLocal()
  const questionsPerDay = 2
  // Figure out how many "days" of questions the user has unlocked.
  // We reveal 2 more questions per calendar day from when they signed up.
  // Simple heuristic: always show up to progressiveQIndex + 2 from the active list.
  const visibleCount = Math.min(questionsPerDay, active.length)
  const currentQ     = active[0] // Always work through one at a time

  if (!currentQ || active.length === 0) return null

  return (
    <ProgressiveCard
      key={currentQ.key}
      question={currentQ}
      answers={answers}
      onAnswer={(key, value) => {
        dispatch({ type: 'ANSWER_PROGRESSIVE', key, value })
      }}
      remaining={active.length}
    />
  )
}

function ProgressiveCard({ question: q, answers, onAnswer, remaining }) {
  const [localValue, setLocalValue] = useState(
    q.type === 'multi' ? [] : q.type === 'slider' ? 0 : null
  )
  const [submitted, setSubmitted]   = useState(false)

  const TODAY = dateKeyLocal()

  const sectionLabel = SECTION_LABELS[q.section] || q.section

  const isAnswered =
    q.type === 'multi'   ? localValue.length > 0
    : q.type === 'slider' ? true // 0 is valid for sliders
    : q.type === 'date'   ? (localValue && localValue !== '')
    : localValue !== null && localValue !== ''

  function handleSubmit() {
    if (!isAnswered) return
    onAnswer(q.key, localValue)
  }

  return (
    <div
      id={`progressive-card-${q.key}`}
      style={{
        background: 'linear-gradient(135deg, #FFF8F0 0%, #FFF0F8 100%)',
        border: '1.5px solid rgba(224, 82, 138, 0.15)',
        borderRadius: 18,
        padding: '16px 16px 14px',
        marginTop: 14,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <p
          style={{
            margin: 0,
            fontSize: 10.5,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--pink-accent, #E0528A)',
          }}
        >
          Help Maisie know you better
        </p>
        <span
          style={{
            fontSize: 10.5,
            color: 'rgba(44,24,16,0.4)',
          }}
        >
          {remaining} left
        </span>
      </div>

      <p
        style={{
          margin: '0 0 12px',
          fontWeight: 700,
          fontSize: 15,
          color: '#2C1810',
          lineHeight: 1.35,
        }}
      >
        {q.text}
      </p>
      {q.help && (
        <p className="muted" style={{ margin: '-6px 0 10px', fontSize: 12.5 }}>
          {q.help}
        </p>
      )}

      {/* Input */}
      {q.type === 'chips' && (
        <ChipGroup
          options={q.options}
          value={localValue}
          onChange={setLocalValue}
          columns={q.options.length > 6 ? 2 : undefined}
        />
      )}

      {q.type === 'multi' && (
        <div className="chips">
          {q.options.map((opt) => (
            <Chip
              key={opt}
              selected={localValue.includes(opt)}
              onClick={() => {
                if (opt === q.exclusive) {
                  setLocalValue([opt])
                  return
                }
                const without = localValue.filter((x) => x !== q.exclusive)
                const has = without.includes(opt)
                setLocalValue(has ? without.filter((x) => x !== opt) : [...without, opt])
              }}
            >
              {opt}
            </Chip>
          ))}
        </div>
      )}

      {q.type === 'date' && (
        <div className="stack-12">
          <input
            className="input"
            type="date"
            max={TODAY}
            value={localValue && localValue !== 'unknown' ? localValue : ''}
            onChange={(e) => setLocalValue(e.target.value)}
            style={{ fontSize: 14 }}
          />
          <Chip
            stack
            selected={localValue === 'unknown'}
            onClick={() => setLocalValue('unknown')}
          >
            I don't remember
          </Chip>
        </div>
      )}

      {q.type === 'slider' && (
        <div className="stack-12" style={{ marginTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              style={{
                fontSize: 36,
                fontWeight: 800,
                color: 'var(--pink-accent, #E0528A)',
                minWidth: 40,
              }}
            >
              {localValue}
            </span>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--pink-accent, #E0528A)', fontSize: 13 }}>
                {painLabel(localValue)}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                {PAIN_ANCHORS.find((x) => localValue >= x.range[0] && localValue <= x.range[1])?.desc}
              </div>
            </div>
          </div>
          <input
            className="slider"
            type="range"
            min="0"
            max="10"
            step="1"
            value={localValue}
            onChange={(e) => setLocalValue(Number(e.target.value))}
          />
          <div className="row row--between muted" style={{ fontSize: 11 }}>
            <span>0 · No pain</span>
            <span>10 · Worst imaginable</span>
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        id={`progressive-submit-${q.key}`}
        type="button"
        disabled={!isAnswered}
        onClick={handleSubmit}
        style={{
          width: '100%',
          marginTop: 14,
          padding: '12px 16px',
          border: 'none',
          borderRadius: 12,
          background: isAnswered ? 'var(--pink-accent, #E0528A)' : 'rgba(44,24,16,0.08)',
          color: isAnswered ? '#fff' : 'rgba(44,24,16,0.3)',
          fontSize: 14,
          fontWeight: 700,
          cursor: isAnswered ? 'pointer' : 'default',
          transition: 'background 0.15s',
        }}
      >
        Save answer →
      </button>
    </div>
  )
}
