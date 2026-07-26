// Screen 4, Deep Symptom Check-In, Q1 to 18 (TRD Section 7)
// One question per screen. Skip logic (7.1): if Q2 = "Not yet", skip Q3 to 15.
// Dates offer "I don't remember the exact date" (7.1). Pain sliders use the
// anchors in Section 7.2. This is the onboarding baseline that seeds the tracker.
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { DEEP_QUESTIONS, activeQuestions, painLabel, PAIN_ANCHORS } from '../data/questions.js'
import { Button, Chip, ChipGroup, ProgressBar, TopBar } from '../components/ui.jsx'
import YourThingSelector from '../components/YourThingSelector.jsx'
import { dateKeyLocal } from '../engine/cyclePredictor.js'

const TODAY = dateKeyLocal()

function parseDate(value) {
  if (!value || value === 'unknown') return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function daysBetween(a, b) {
  const start = parseDate(a)
  const end = parseDate(b)
  if (!start || !end) return null
  return Math.round((end - start) / 86400000)
}

function dateAnswerError(question, answers) {
  if (question.type !== 'date') return ''
  const value = answers[question.key]
  if (!value || value === 'unknown') return ''
  if (!parseDate(value)) return 'That date did not come through right. Pick it again or choose I don’t remember.'
  if (value > TODAY) return 'That date is in the future. Pick a date from today or earlier.'

  if (question.key === 'lastEnd') {
    const periodLength = daysBetween(answers.lastStart, value)
    if (periodLength === null) return ''
    if (periodLength < 0) return 'Your period end date needs to be the same day as the start date or after it.'
    if (periodLength > 10) return 'That would mean your period lasted more than 10 days. Check the end date, or choose I don’t remember.'
  }

  if (question.key === 'prevStart') {
    const cycleLength = daysBetween(value, answers.lastStart)
    if (cycleLength === null) return ''
    if (cycleLength <= 0) return 'The period before that needs to start before your last period.'
    if (cycleLength < 15) return 'Those two period starts are very close together. Check the date, or choose I don’t remember.'
    if (cycleLength > 90) return 'That gap looks unusually long. Check the date, or choose I don’t remember.'
  }

  return ''
}

export default function CheckIn() {
  const navigate = useNavigate()
  const { state, dispatch } = useStore()
  const [answers, setAnswers] = useState(() => ({ age: state.identity.ageBand, ...state.answers }))
  const [pos, setPos] = useState(1) // start after Q1 (age already captured); index into active list
  const [error, setError] = useState('')

  const active = useMemo(() => activeQuestions(answers), [answers])
  const q = active[Math.min(pos, active.length - 1)]

  const totalDeep = DEEP_QUESTIONS.length
  const answeredCount = pos
  const progress = 0.35 + 0.6 * (answeredCount / active.length)

  function set(key, value) {
    setError('')
    setAnswers((a) => ({ ...a, [key]: value }))
  }

  function toggleMulti(key, opt, exclusive) {
    setError('')
    setAnswers((a) => {
      const cur = a[key] || []
      if (opt === exclusive) return { ...a, [key]: [exclusive] }
      const without = cur.filter((x) => x !== exclusive)
      const has = without.includes(opt)
      return { ...a, [key]: has ? without.filter((x) => x !== opt) : [...without, opt] }
    })
  }

  const value = answers[q.key]
  const answered =
    q.type === 'multi'
      ? (value || []).length > 0
      : q.type === 'slider'
      ? typeof value === 'number'
      : q.type === 'your_thing'
      ? (value?.categories?.length > 0)
      : value !== undefined && value !== null && value !== ''

  function goNext() {
    const currentError = dateAnswerError(q, answers)
    if (currentError) {
      setError(currentError)
      return
    }

    if (pos < active.length - 1) {
      setPos(pos + 1)
    } else {
      const firstInvalidDateIndex = active.findIndex((question) => dateAnswerError(question, answers))
      if (firstInvalidDateIndex >= 0) {
        setPos(firstInvalidDateIndex)
        setError(dateAnswerError(active[firstInvalidDateIndex], answers))
        return
      }
      dispatch({ type: 'SAVE_CHECKIN', answers })
      navigate('/result')
    }
  }
  function goBack() {
    setError('')
    if (pos > 1) setPos(pos - 1)
    else navigate('/personalize')
  }

  return (
    <div className="screen">
      <TopBar onBack={goBack} />
      <ProgressBar value={progress} />

      <div style={{ marginTop: 24 }}>
        <p className="eyebrow">{q.section}</p>
        <h1 style={{ fontSize: 25 }}>{q.text}</h1>
        {q.help && <p className="muted">{q.help}</p>}
      </div>

      <div style={{ marginTop: 14 }}>
        {q.type === 'chips' && (
          <ChipGroup
            options={q.options}
            value={value}
            onChange={(v) => set(q.key, v)}
            columns={q.options.length > 6 ? 2 : undefined}
            stack={q.options.some((o) => o.length > 18)}
          />
        )}

        {q.type === 'multi' && (
          <div className="chips">
            {q.options.map((opt) => (
              <Chip
                key={opt}
                stack
                selected={(value || []).includes(opt)}
                onClick={() => toggleMulti(q.key, opt, q.exclusive)}
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
              value={value && value !== 'unknown' ? value : ''}
              onChange={(e) => set(q.key, e.target.value)}
            />
            <Chip stack selected={value === 'unknown'} onClick={() => set(q.key, 'unknown')}>
              I don’t remember the exact date
            </Chip>
            {error && (
              <p style={{ margin: 0, color: '#B3265A', fontSize: 12.5, lineHeight: 1.4 }}>
                {error}
              </p>
            )}
            {value === 'unknown' && (
              <p className="muted" style={{ fontSize: 12.5 }}>
                No problem, your first couple of daily check-ins will fill this in for us.
              </p>
            )}
          </div>
        )}

        {q.type === 'slider' && (
          <div className="stack-16" style={{ marginTop: 8 }}>
            <div className="center">
              <span className="big-num" style={{ fontSize: 52, color: 'var(--accent-ink)' }}>
                {typeof value === 'number' ? value : 0}
              </span>
              <div style={{ fontWeight: 600, color: 'var(--accent-ink)' }}>
                {painLabel(typeof value === 'number' ? value : 0)}
              </div>
            </div>
            <input
              className="slider"
              type="range"
              min="0"
              max="10"
              step="1"
              value={typeof value === 'number' ? value : 0}
              onChange={(e) => set(q.key, Number(e.target.value))}
              aria-label={q.text}
            />
            <div className="row row--between muted" style={{ fontSize: 12 }}>
              <span>0 · No pain</span>
              <span>10 · Worst imaginable</span>
            </div>
            <div className="card" style={{ padding: 14 }}>
              <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
                {PAIN_ANCHORS.find(
                  (x) =>
                    (typeof value === 'number' ? value : 0) >= x.range[0] &&
                    (typeof value === 'number' ? value : 0) <= x.range[1],
                )?.desc}
              </p>
            </div>
          </div>
        )}

        {q.type === 'your_thing' && (
          <YourThingSelector 
            value={value || { categories: [], specifics: '', practiceDays: [] }} 
            onChange={(v) => set(q.key, v)} 
          />
        )}
      </div>

      <div className="spacer" />
      <Button block disabled={!answered} onClick={goNext} style={{ marginTop: 20 }}>
        {pos < active.length - 1 ? 'Next' : 'See my results'}
      </Button>
      <p className="muted center" style={{ fontSize: 12, marginTop: 10 }}>
        Question {pos + 1} of {active.length} · one at a time, no rush
      </p>
    </div>
  )
}
