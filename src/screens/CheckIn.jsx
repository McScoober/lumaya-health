// Screen 4 — Fast-Start Seed Check-In (3 questions only)
// Maisie rebuild: ask only the minimum needed to boot the cycle engine on day 1.
// The remaining ~15 clinical questions surface as progressive mini-cards on Home
// over the first week (2/day), so the data is still collected without upfront friction.
//
// Seed questions:
//   1. Have you started your period? (gate — if No, skip 2 & 3)
//   2. When did your last period start? (lastStart — date)
//   3. How heavy is your heaviest day? (flow — chips)
//   4. At its worst, how bad is your pain? (painWorst — 0–10 slider)
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { PAIN_ANCHORS, painLabel } from '../data/questions.js'
import { Button, Chip, ChipGroup, ProgressBar, TopBar } from '../components/ui.jsx'
import { dateKeyLocal } from '../engine/cyclePredictor.js'

const TODAY = dateKeyLocal()

const FLOW_OPTIONS = ['Very light', 'Light', 'Moderate', 'Heavy', 'Very heavy']

function parseDate(value) {
  if (!value || value === 'unknown') return null
  const d = new Date(`${value}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

export default function CheckIn() {
  const navigate = useNavigate()
  const { state, dispatch } = useStore()

  // seed from existing answers in case user is returning mid-flow
  const [started,   setStarted]   = useState(state.answers.started   || null)
  const [lastStart, setLastStart] = useState(state.answers.lastStart  || '')
  const [dateUnknown, setDateUnknown] = useState(state.answers.lastStart === 'unknown')
  const [dateConfirmed, setDateConfirmed] = useState(Boolean(state.answers.lastStart))
  const [flow,      setFlow]      = useState(state.answers.flow       || null)
  const [painWorst, setPainWorst] = useState(
    typeof state.answers.painWorst === 'number' ? state.answers.painWorst : 0
  )
  const [dateError, setDateError] = useState('')

  // Determine which step we're on (0 = started gate, 1 = date, 2 = flow, 3 = pain)
  const notStarted = started === 'Not yet'
  const step = started === null ? 0
    : notStarted ? 4                       // skip directly to finish
    : !dateConfirmed ? 1
    : flow === null ? 2
    : 3

  const totalSteps = notStarted ? 1 : 4
  const progress   = step / totalSteps

  function validateDate(value) {
    if (value === 'unknown') { setDateError(''); return true }
    const d = parseDate(value)
    if (!d) { setDateError("That date didn't come through right. Try again or choose \"I don't remember.\""); return false }
    if (value > TODAY) { setDateError('Pick a date from today or earlier.'); return false }
    setDateError('')
    return true
  }

  function handleDateChange(value) {
    setDateUnknown(false)
    setLastStart(value)
    setDateConfirmed(false)
    setDateError('')
  }

  function handleDateUnknown() {
    setDateUnknown(true)
    setLastStart('unknown')
    setDateConfirmed(false)
    setDateError('')
  }

  function handleDateNext() {
    const val = dateUnknown ? 'unknown' : lastStart
    if (!val) { setDateError("Pick a date or choose \"I don't remember.\""); return }
    if (!validateDate(val)) return
    setLastStart(val)
    setDateConfirmed(true)
    // Advance: stay in this component, step logic will re-render to flow
    setFlow(null) // ensure flow step shows next
  }

  function finish() {
    const seedAnswers = {
      ...state.answers,
      started: started || 'Not yet',
      // Only include period fields if they actually started
      ...(notStarted ? {} : {
        lastStart: dateUnknown ? 'unknown' : lastStart,
        flow:      flow,
        painWorst: painWorst,
      }),
      // Preserve age from identity (already set in AgeConsent)
      age: state.identity.ageBand,
      // Mark as fast-start so progressive cards know to show
      fastStart: true,
    }
    dispatch({ type: 'SAVE_CHECKIN', answers: seedAnswers })
    navigate('/result')
  }

  // ── Step 0: Have you started your period? ───────────────────────────────
  if (step === 0) {
    return (
      <div className="screen">
        <TopBar onBack={() => navigate('/personalize')} />
        <ProgressBar value={0.05} />
        <div style={{ marginTop: 24 }}>
          <p className="eyebrow">Quick setup</p>
          <h1 style={{ fontSize: 26 }}>Have you started your period?</h1>
          <p className="muted">This helps us figure out what to track for you.</p>
          <ChipGroup
            options={['Yes', 'Not yet']}
            value={started}
            onChange={(v) => setStarted(v)}
          />
        </div>
        <div className="spacer" />
        {/* If "Not yet" is selected, allow them to proceed directly */}
        {started === 'Not yet' && (
          <Button block onClick={finish}>
            Set up my tracker
          </Button>
        )}
      </div>
    )
  }

  // ── Step 1: Last period start date ─────────────────────────────────────
  if (step === 1) {
    return (
      <div className="screen">
        <TopBar onBack={() => setStarted(null)} />
        <ProgressBar value={0.3} />
        <div style={{ marginTop: 24 }}>
          <p className="eyebrow">Quick setup · 1 of 3</p>
          <h1 style={{ fontSize: 26 }}>When did your last period start?</h1>
          <p className="muted">Your best guess is fine.</p>
        </div>
        <div className="stack-12" style={{ marginTop: 16 }}>
          <input
            className="input"
            type="date"
            max={TODAY}
            value={!dateUnknown && lastStart !== 'unknown' ? lastStart : ''}
            onChange={(e) => handleDateChange(e.target.value)}
          />
          <Chip
            stack
            selected={dateUnknown}
            onClick={handleDateUnknown}
          >
            I don't remember the exact date
          </Chip>
          {dateError && (
            <p style={{ margin: 0, color: '#B3265A', fontSize: 12.5, lineHeight: 1.4 }}>
              {dateError}
            </p>
          )}
          {dateUnknown && (
            <p className="muted" style={{ fontSize: 12.5 }}>
              No problem — your first few daily check-ins will help us figure this out.
            </p>
          )}
        </div>
        <div className="spacer" />
        <Button
          block
          disabled={!dateUnknown && !lastStart}
          onClick={handleDateNext}
        >
          Next
        </Button>
      </div>
    )
  }

  // ── Step 2: Flow heaviness ──────────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="screen">
        <TopBar onBack={() => setDateConfirmed(false)} />
        <ProgressBar value={0.6} />
        <div style={{ marginTop: 24 }}>
          <p className="eyebrow">Quick setup · 2 of 3</p>
          <h1 style={{ fontSize: 26 }}>How heavy is your flow on your heaviest day?</h1>
        </div>
        <div style={{ marginTop: 16 }}>
          <ChipGroup
            options={FLOW_OPTIONS}
            value={flow}
            onChange={(v) => setFlow(v)}
          />
        </div>
        <div className="spacer" />
        <Button block disabled={!flow} onClick={() => {/* step logic handles re-render */}}>
          Next
        </Button>
      </div>
    )
  }

  // ── Step 3: Pain level ──────────────────────────────────────────────────
  if (step === 3) {
    return (
      <div className="screen">
        <TopBar onBack={() => setFlow(null)} />
        <ProgressBar value={0.85} />
        <div style={{ marginTop: 24 }}>
          <p className="eyebrow">Quick setup · 3 of 3</p>
          <h1 style={{ fontSize: 26 }}>At its worst, how bad is your period pain?</h1>
          <p className="muted">0 = none · 10 = worst imaginable</p>
        </div>
        <div className="stack-16" style={{ marginTop: 24 }}>
          <div className="center">
            <span className="big-num" style={{ fontSize: 56, color: 'var(--pink-accent)' }}>
              {painWorst}
            </span>
            <div style={{ fontWeight: 600, color: 'var(--pink-accent)', marginTop: 2 }}>
              {painLabel(painWorst)}
            </div>
          </div>
          <input
            className="slider"
            type="range"
            min="0"
            max="10"
            step="1"
            value={painWorst}
            onChange={(e) => setPainWorst(Number(e.target.value))}
            aria-label="Pain level 0 to 10"
          />
          <div className="row row--between muted" style={{ fontSize: 12 }}>
            <span>0 · No pain</span>
            <span>10 · Worst imaginable</span>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
              {PAIN_ANCHORS.find((x) => painWorst >= x.range[0] && painWorst <= x.range[1])?.desc}
            </p>
          </div>
        </div>
        <div className="spacer" />
        <Button block onClick={finish}>
          Set up my tracker
        </Button>
        <p className="muted center" style={{ fontSize: 12, marginTop: 10 }}>
          That's it — Maisie will learn more about you as you go.
        </p>
      </div>
    )
  }

  return null
}
