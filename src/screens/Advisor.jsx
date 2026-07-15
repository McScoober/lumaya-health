// Screen 9 — Advisor connection (TRD Section 11)
// No EHR, no live chat, no booking. Collect name + email, "send" a formatted
// email to the Lumaya advisor inbox with result level, flagged rule IDs, and the
// full structured answers, then confirm a 48-hour reply window.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { Button, Card, TopBar } from '../components/ui.jsx'
import Mascot from '../components/Mascot.jsx'
import { getCurrentUserId } from '../lib/supabase.js'
import { pushAdvisorRequest } from '../lib/sync.js'

// In production this posts to Formspree / Resend / a small Express endpoint (Section 11).
// Here we simulate the send and surface the exact payload for transparency.
function buildAdvisorEmail({ name, email, result, answers }) {
  return {
    to: 'advisors@lumayahealth.example',
    subject: `New Lumaya advisor request — result: ${result?.level}`,
    body: {
      name,
      email,
      resultLevel: result?.level,
      flaggedRuleIds: (result?.flags || []).map((f) => f.id),
      structuredAnswers: answers,
      submittedAt: new Date().toISOString(),
    },
  }
}

export default function Advisor() {
  const navigate = useNavigate()
  const { state, dispatch } = useStore()
  const [name, setName] = useState(state.identity.name)
  const [email, setEmail] = useState(state.identity.email)
  const [sent, setSent] = useState(false)
  const [payload, setPayload] = useState(null)
  const [showPayload, setShowPayload] = useState(false)

  const valid = name.trim() && /.+@.+\..+/.test(email)

  function send() {
    const p = buildAdvisorEmail({ name: name.trim(), email: email.trim(), result: state.result, answers: state.answers })
    setPayload(p)
    dispatch({ type: 'CONNECT_ADVISOR' })
    // Best-effort: record the request in the advisor_requests table too (§11).
    pushAdvisorRequest(getCurrentUserId(), { level: state.result?.level, flagIds: p.body.flaggedRuleIds })
    dispatch({
      type: 'ADD_MESSAGE',
      message: {
        id: 'adv-' + Date.now(),
        at: new Date().toISOString(),
        channel: 'system',
        title: 'Advisor request received',
        body: 'A Lumaya advisor will review your results and reach out within 48 hours.',
        read: false,
      },
    })
    setSent(true)
  }

  if (sent) {
    return (
      <div className="screen center" style={{ justifyContent: 'center' }}>
        <Mascot size={110} />
        <h1 style={{ marginTop: 16 }}>You’re all set</h1>
        <p className="muted" style={{ maxWidth: 320 }}>
          A Lumaya advisor will review your results and reach out to <strong>{email}</strong> within
          48 hours. Nothing else you need to do.
        </p>
        <div className="spacer" />
        <Button variant="ghost" onClick={() => setShowPayload((s) => !s)} style={{ fontSize: 13 }}>
          {showPayload ? 'Hide' : 'What gets sent to the advisor?'}
        </Button>
        {showPayload && payload && (
          <Card style={{ textAlign: 'left', marginTop: 8 }}>
            <p className="muted" style={{ fontSize: 12, margin: '0 0 6px' }}>
              Result level + flagged rule IDs + your structured answers (Section 11):
            </p>
            <pre style={{ fontSize: 11, overflow: 'auto', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(payload.body, null, 2)}
            </pre>
          </Card>
        )}
        <Button block onClick={() => navigate('/home')} style={{ marginTop: 16 }}>
          Back to home
        </Button>
      </div>
    )
  }

  return (
    <div className="screen">
      <TopBar title="Connect with an advisor" onBack={() => navigate(-1)} />

      <Card accent style={{ marginTop: 8 }}>
        <p style={{ margin: 0, fontSize: 14.5 }}>
          A Lumaya advisor is a real person who reviews your check-in and reaches out with a
          recommendation. No appointment, no referral, no cost to connect.
        </p>
      </Card>

      <div className="stack-16" style={{ marginTop: 18 }}>
        <div className="field">
          <label htmlFor="advName">Your name</label>
          <input id="advName" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="advEmail">Email for the advisor to reach you</label>
          <input id="advEmail" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>

      <div className="spacer" />
      <Button block disabled={!valid} onClick={send} style={{ marginTop: 16 }}>
        Send to a Lumaya advisor
      </Button>
      <p className="muted center" style={{ fontSize: 12, marginTop: 10 }}>
        Your answers are shared only with the advisor, only when you tap send.
      </p>
    </div>
  )
}
