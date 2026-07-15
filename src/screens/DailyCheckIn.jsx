// Screen 7 — Daily check-in (TRD Section 6.2 + 6.5)
// "Did you get your period today?" yes/no + optional one-tap mood emoji.
// No performance, no streak-shaming (13.2.1). Milestone confetti (13.2.5).
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { isInPeriodWindow } from '../engine/cyclePredictor.js'
import { Button, Card, TopBar } from '../components/ui.jsx'
import Confetti from '../components/Confetti.jsx'

const MOODS = ['😄', '🙂', '😐', '😣', '😢', '😴']
const MILESTONES = [7, 30, 100]

export default function DailyCheckIn() {
  const navigate = useNavigate()
  const { state, dispatch, cycleModel } = useStore()
  const now = new Date()
  const dateKey = now.toISOString().slice(0, 10)
  const inWindow = isInPeriodWindow(cycleModel, now)

  const [period, setPeriod] = useState(null) // true / false
  const [mood, setMood] = useState(null)
  const [celebrate, setCelebrate] = useState(false)

  function haptic() {
    if (navigator.vibrate) navigator.vibrate(12) // 13.2.5 tactile confirm
  }

  function submit() {
    haptic()
    dispatch({ type: 'LOG_DAILY', dateKey, period: period === true, mood: mood || undefined })
    const newStreak = state.lastCheckinDate === dateKey ? state.streak : state.streak + (isConsecutive() ? 1 : 0) || 1
    if (MILESTONES.includes(newStreak)) {
      setCelebrate(true)
      setTimeout(() => navigate('/home'), 1700)
    } else {
      navigate('/home')
    }
  }

  function isConsecutive() {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    return state.lastCheckinDate === yesterday
  }

  return (
    <div className="screen">
      <Confetti show={celebrate} onDone={() => setCelebrate(false)} />
      <TopBar title="Daily check-in" onBack={() => navigate('/home')} />

      <Card accent style={{ marginTop: 8 }}>
        <h2 style={{ marginTop: 0 }}>
          {inWindow ? 'Did you get your period today?' : 'Any spotting or period today?'}
        </h2>
        <div className="row" style={{ gap: 12, marginTop: 6 }}>
          <Button variant={period === true ? 'primary' : 'soft'} block onClick={() => { setPeriod(true); haptic() }}>
            Yes
          </Button>
          <Button variant={period === false ? 'primary' : 'soft'} block onClick={() => { setPeriod(false); haptic() }}>
            No
          </Button>
        </div>
      </Card>

      <Card style={{ marginTop: 14 }}>
        <div className="card__label">How are you feeling? (optional)</div>
        <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {MOODS.map((m) => (
            <button
              key={m}
              onClick={() => { setMood(mood === m ? null : m); haptic() }}
              aria-pressed={mood === m}
              aria-label={`Mood ${m}`}
              style={{
                fontSize: 28, width: 48, height: 48, borderRadius: 14,
                border: mood === m ? '2px solid var(--accent)' : '1.5px solid var(--line)',
                background: mood === m ? 'var(--accent-soft)' : 'var(--surface)',
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </Card>

      <div className="spacer" />
      <Button block disabled={period === null} onClick={submit} style={{ marginTop: 20 }}>
        Log today
      </Button>
      <p className="muted center" style={{ fontSize: 12, marginTop: 10 }}>
        No streaks to keep up with — just check in when you can. 🌙
      </p>
    </div>
  )
}
