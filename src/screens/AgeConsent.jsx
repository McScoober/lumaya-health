// Screen 2 — Age & consent (TRD §5.1)
// Fast-Start rebuild: age chip + first name + consent only.
// Email removed — teens don't check email and magic-link auth isn't wired.
// Ages 13-17: consent checkbox. 18+: privacy ack.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { Button, ChipGroup, ProgressBar, TopBar } from '../components/ui.jsx'

const AGES = ['13', '14', '15', '16', '17', '18+']

export default function AgeConsent() {
  const navigate = useNavigate()
  const { state, dispatch } = useStore()
  const [age, setAge]       = useState(state.identity.ageBand)
  const [name, setName]     = useState(state.identity.name || '')
  const [consent, setConsent] = useState(false)
  const [ack, setAck]       = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [touched, setTouched] = useState({})

  const isMinor = age && age !== '18+'
  const is18    = age === '18+'

  const nameError    = name.trim() ? '' : "Enter your first name so Maisie knows what to call you."
  const consentError = isMinor && !consent ? "Check this once you have a parent or guardian's permission." : ''
  const ackError     = is18 && !ack ? "Check this to confirm you've read the privacy policy." : ''

  const showError = (key) => submitted || touched[key]

  const canContinue =
    !!age &&
    !nameError &&
    (is18 ? !ackError : isMinor ? !consentError : false)

  function chooseAge(a) {
    setAge(a)
    dispatch({ type: 'SET_AGE', band: a })
  }

  function proceed() {
    setSubmitted(true)
    if (!canContinue) return
    dispatch({
      type: 'SET_IDENTITY',
      payload: { name: name.trim() },
    })
    dispatch({
      type: 'SET_CONSENT',
      payload: { name: name.trim() },
    })
    navigate('/personalize')
  }

  return (
    <div className="screen">
      <TopBar onBack={() => navigate('/')} />
      <ProgressBar value={0.15} />

      <div style={{ marginTop: 22 }}>
        <p className="eyebrow">A little about you</p>
        <h1>How old are you?</h1>
        <ChipGroup options={AGES} value={age} onChange={chooseAge} />
      </div>

      {age && (
        <div className="stack-16" style={{ marginTop: 24 }}>
          <div className="field">
            <label htmlFor="name">Your first name</label>
            <input
              id="name"
              className="input"
              value={name}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should we call you?"
              autoFocus
            />
            {showError('name') && nameError && (
              <p style={{ margin: '6px 0 0', color: '#B3265A', fontSize: 12.5, lineHeight: 1.35 }}>
                {nameError}
              </p>
            )}
          </div>

          {isMinor && (
            <div className="card card--accent">
              <label className="row" style={{ alignItems: 'flex-start', gap: 12, fontWeight: 500, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  style={{ width: 22, height: 22, marginTop: 2, accentColor: 'var(--accent)' }}
                />
                <span>I am at least 13 years old and have a parent or guardian's permission to use Maisie.</span>
              </label>
              {submitted && consentError && (
                <p style={{ margin: '8px 0 0', color: '#B3265A', fontSize: 12.5, lineHeight: 1.35 }}>
                  {consentError}
                </p>
              )}
            </div>
          )}

          {is18 && (
            <div className="card">
              <label className="row" style={{ alignItems: 'flex-start', gap: 12, fontWeight: 500, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={ack}
                  onChange={(e) => setAck(e.target.checked)}
                  style={{ width: 22, height: 22, marginTop: 2, accentColor: 'var(--accent)' }}
                />
                <span>I agree to Maisie's privacy policy.</span>
              </label>
              {submitted && ackError && (
                <p style={{ margin: '8px 0 0', color: '#B3265A', fontSize: 12.5, lineHeight: 1.35 }}>
                  {ackError}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="spacer" />
      <Button block disabled={!age} onClick={proceed} style={{ marginTop: 20 }}>
        Continue
      </Button>
    </div>
  )
}
