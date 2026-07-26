// Screen 2, Age & consent branching (TRD Section 5.1)
// Age chips double as the age gate (Q1). Under-13 blocked (COPPA).
// Ages 13 to 17: consent checkbox + linked parent email required.
// 18+: privacy-policy acknowledgment only, no guardian language.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { Button, ChipGroup, ProgressBar, TopBar } from '../components/ui.jsx'

const AGES = ['13', '14', '15', '16', '17', '18+']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizedEmail(value) {
  return value.trim().toLowerCase()
}

function emailError(value, label) {
  if (!value.trim()) return `${label} is required.`
  if (!EMAIL_RE.test(value.trim())) return `Enter a valid ${label.toLowerCase()}, like name@example.com.`
  return ''
}

export default function AgeConsent() {
  const navigate = useNavigate()
  const { state, dispatch } = useStore()
  const [age, setAge] = useState(state.identity.ageBand)
  const [name, setName] = useState(state.identity.name)
  const [email, setEmail] = useState(state.identity.email)
  const [parentEmail, setParentEmail] = useState(state.identity.parentEmail)
  const [consent, setConsent] = useState(false)
  const [ack, setAck] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [touched, setTouched] = useState({})

  const isMinor = age && age !== '18+'
  const is18 = age === '18+'
  const nameError = name.trim() ? '' : 'Enter your first name so Maisie knows what to call you.'
  const userEmailError = emailError(email, 'Your email')
  const parentEmailFormatError = isMinor ? emailError(parentEmail, 'Parent or guardian email') : ''
  const parentMatchesUser =
    isMinor &&
    normalizedEmail(email) &&
    normalizedEmail(parentEmail) &&
    normalizedEmail(email) === normalizedEmail(parentEmail)
  const parentEmailError = parentEmailFormatError || (parentMatchesUser ? "Use a different email for your parent or guardian. It can't match yours." : '')
  const consentError = isMinor && !consent ? 'Check this once you have parent or guardian permission.' : ''
  const ackError = is18 && !ack ? "Check this to confirm you've read the privacy policy." : ''
  const showError = (key) => submitted || touched[key]

  const canContinue =
    !!age &&
    !nameError &&
    !userEmailError &&
    (is18 ? !ackError : isMinor ? !consentError && !parentEmailError : false)

  function chooseAge(a) {
    setAge(a)
    dispatch({ type: 'SET_AGE', band: a })
  }

  function proceed() {
    setSubmitted(true)
    if (!canContinue) return
    dispatch({
      type: 'SET_IDENTITY',
      payload: { name: name.trim(), email: email.trim(), parentEmail: parentEmail.trim() },
    })
    dispatch({
      type: 'SET_CONSENT',
      payload: { name: name.trim(), email: email.trim(), parentEmail: parentEmail.trim() },
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
            />
            {showError('name') && nameError && (
              <p style={{ margin: '6px 0 0', color: '#B3265A', fontSize: 12.5, lineHeight: 1.35 }}>
                {nameError}
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor="email">Your email</label>
            <input
              id="email"
              className="input"
              type="email"
              value={email}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            {showError('email') && userEmailError && (
              <p style={{ margin: '6px 0 0', color: '#B3265A', fontSize: 12.5, lineHeight: 1.35 }}>
                {userEmailError}
              </p>
            )}
          </div>

          {isMinor && (
            <>
              <div className="card card--accent">
                <label className="row" style={{ alignItems: 'flex-start', gap: 12, fontWeight: 500, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    style={{ width: 22, height: 22, marginTop: 2, accentColor: 'var(--accent)' }}
                  />
                  <span>I am at least 13 years old and have a parent or guardian’s permission to use Lumaya.</span>
                </label>
              </div>
              <div className="field">
                <label htmlFor="parent">Parent or guardian’s email</label>
                <input
                  id="parent"
                  className="input"
                  type="email"
                  value={parentEmail}
                  onBlur={() => setTouched((t) => ({ ...t, parentEmail: true }))}
                  onChange={(e) => setParentEmail(e.target.value)}
                  placeholder="parent@example.com"
                />
                {showError('parentEmail') && parentEmailError && (
                  <p style={{ margin: '6px 0 0', color: '#B3265A', fontSize: 12.5, lineHeight: 1.35 }}>
                    {parentEmailError}
                  </p>
                )}
                <p className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>
                  Required to unlock Lumaya. You choose later whether they see an ongoing dashboard.
                </p>
              </div>
            </>
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
                <span>I agree to Lumaya’s privacy policy.</span>
              </label>
            </div>
          )}
        </div>
      )}

      <div className="spacer" />
      {submitted && age && (consentError || ackError) && (
        <p style={{ margin: '0 0 10px', color: '#B3265A', fontSize: 12.5, lineHeight: 1.35, textAlign: 'center' }}>
          {consentError || ackError}
        </p>
      )}
      <Button block disabled={!age} onClick={proceed} style={{ marginTop: 20 }}>
        Continue
      </Button>
    </div>
  )
}
