// Screen 3, Personalization (TRD Section 5.2)
// Student/athlete and sleep schedule. Asked after consent,
// before the 18-question check-in. One question per screen (13.1).
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { PERSONALIZATION } from '../data/questions.js'
import { Button, ChipGroup, ProgressBar, TopBar } from '../components/ui.jsx'

export default function Personalization() {
  const navigate = useNavigate()
  const { state, dispatch } = useStore()
  const [answers, setAnswers] = useState({
    studentAthlete: state.profile.studentAthlete,
    sleep: state.profile.sleep,
  })

  // Filter out questions hidden by showIf (e.g. sport only for athletes).
  const questions = useMemo(
    () => PERSONALIZATION.filter((q) => !q.showIf || q.showIf(answers)),
    [answers],
  )
  const [idx, setIdx] = useState(0)
  const q = questions[idx]
  const value = answers[q.key]

  function setValue(v) {
    const next = { ...answers, [q.key]: v }
    setAnswers(next)
    dispatch({ type: 'SET_PROFILE', payload: { [q.key]: v } })
  }

  const canNext = q.optional || value

  function next() {
    dispatch({ type: 'SET_PROFILE', payload: answers })
    if (idx < questions.length - 1) {
      setIdx(idx + 1)
    } else {
      navigate('/checkin')
    }
  }

  const total = questions.length
  const progress = 0.2 + (0.15 * (idx / total))

  return (
    <div className="screen">
      <TopBar onBack={() => (idx > 0 ? setIdx(idx - 1) : navigate('/age'))} />
      <ProgressBar value={progress} />

      <div style={{ marginTop: 26 }}>
        <p className="eyebrow">Make it yours · {idx + 1} of {total}</p>
        <h1>{q.text}</h1>
        {q.help && <p className="muted">{q.help}</p>}
      </div>

      <div style={{ marginTop: 12 }}>
        {q.type === 'chips' && (
          <ChipGroup options={q.options} value={value} onChange={setValue} />
        )}
        {q.type === 'text' && (
          <input
            className="input"
            value={value || ''}
            placeholder={q.placeholder}
            onChange={(e) => setValue(e.target.value)}
          />
        )}
      </div>

      <div className="spacer" />
      <div className="row" style={{ marginTop: 20, gap: 10 }}>
        {q.optional && (
          <Button variant="soft" onClick={next}>
            Skip
          </Button>
        )}
        <Button block disabled={!canNext} onClick={next}>
          {idx < total - 1 ? 'Continue' : 'Start check-in'}
        </Button>
      </div>
    </div>
  )
}
