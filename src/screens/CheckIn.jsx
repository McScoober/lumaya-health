// Screen 4 — Deep Symptom Check-In, Q1–18 (TRD Section 7)
// One question per screen. Skip logic (7.1): if Q2 = "Not yet", skip Q3–15.
// Dates offer "I don't remember the exact date" (7.1). Pain sliders use the
// anchors in Section 7.2. This is the onboarding baseline that seeds the tracker.
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { DEEP_QUESTIONS, activeQuestions, painLabel, PAIN_ANCHORS } from '../data/questions.js'
import { Button, Chip, ChipGroup, ProgressBar, TopBar } from '../components/ui.jsx'

const TODAY = new Date().toISOString().slice(0, 10)

export default function CheckIn() {
  const navigate = useNavigate()
  const { state, dispatch } = useStore()
  const [answers, setAnswers] = useState(() => ({ age: state.identity.ageBand, ...state.answers }))
  const [pos, setPos] = useState(1) // start after Q1 (age already captured); index into active list

  const active = useMemo(() => activeQuestions(answers), [answers])
  const q = active[Math.min(pos, active.length - 1)]

  const totalDeep = DEEP_QUESTIONS.length
  const answeredCount = pos
  const progress = 0.35 + 0.6 * (answeredCount / active.length)

  function set(key, value) {
    setAnswers((a) => ({ ...a, [key]: value }))
  }

  function toggleMulti(key, opt, exclusive) {
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
      : value !== undefined && value !== null && value !== ''

  function goNext() {
    if (pos < active.length - 1) {
      setPos(pos + 1)
    } else {
      dispatch({ type: 'SAVE_CHECKIN', answers })
      navigate('/result')
    }
  }
  function goBack() {
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
            {value === 'unknown' && (
              <p className="muted" style={{ fontSize: 12.5 }}>
                No problem — your first couple of daily check-ins will fill this in for us.
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
