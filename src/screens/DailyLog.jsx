import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { Button, TopBar, ProgressBar, Chip } from '../components/ui.jsx'
import requireOnboarded from '../App.jsx' // just for context (we don't export from App)
import MaisieLogo from '../components/MaisieLogo.jsx'

const SYMPTOMS = [
  'Cramps', 'Headache', 'Bloating', 'Fatigue', 
  'Back pain', 'Breast tenderness', 'Mood changes', 'Skin breakout', 
  'Nausea', 'Spotting', 'Discharge changes', 'Sleep trouble'
]

const IMPACTS = [
  { id: 'school', label: 'Missed school', icon: '🏫' },
  { id: 'activity', label: 'Missed your thing', icon: '🏃‍♀️' },
  { id: 'plans', label: 'Cancelled plans', icon: '📅' },
  { id: 'sleep', label: 'Sleep affected', icon: '🌙' },
  { id: 'fine', label: 'Managed fine', icon: '✅' },
]

export default function DailyLog() {
  const { step } = useParams()
  const navigate = useNavigate()
  const { state, dispatch } = useStore()
  
  const currentStep = parseInt(step) || 0
  
  const [logData, setLogData] = useState({
    vibe: null,
    symptoms: [],
    pain: 1, // initialize to 1 so the slider matches the numeric visual and isn't stuck waiting for an interaction
    impacts: []
  })

  const updateLog = (key, val) => setLogData(d => ({ ...d, [key]: val }))
  
  const goNext = () => navigate(`/log/${currentStep + 1}`)
  const goBack = () => {
    if (currentStep > 0) navigate(`/log/${currentStep - 1}`)
    else navigate('/home')
  }

  const finish = () => {
    // save logData to state
    const todayKey = new Date().toISOString().slice(0, 10)
    dispatch({ 
      type: 'LOG_DAILY', 
      dateKey: todayKey, 
      period: false,
    })
    navigate('/home')
  }

  const todayKey = new Date().toISOString().slice(0, 10)
  const loggedToday = state.dailyLogs[todayKey]

  // If already logged today, skip the wizard and show a confirmed state
  if (loggedToday) {
    return (
      <div className="screen center">
        <TopBar onBack={() => navigate('/home')} />
        <div className="spacer" />
        <MaisieLogo size={80} />
        <div className="card" style={{ marginTop: 24, textAlign: 'left' }}>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5 }}>
            you're all caught up for today! thanks for keeping your chart updated.
          </p>
        </div>
        <div className="spacer" />
        <Button block onClick={() => navigate('/home')}>Back to dashboard</Button>
      </div>
    )
  }

  // lg-0: How are you feeling
  if (currentStep === 0) {
    return (
      <div className="screen center">
        <TopBar onBack={goBack} />
        <div className="spacer" />
        <MaisieLogo size={80} />
        <h2 style={{ fontSize: 24, margin: '24px 0 12px', color: 'var(--text-primary)' }}>hey {state.identity?.name?.split(' ')[0] || 'there'}. how are you feeling today?</h2>
        <Button block className="btn--primary" onClick={goNext} style={{ marginTop: 24 }}>Start logging</Button>
        <div className="spacer" />
      </div>
    )
  }

  // lg-1: Symptoms
  if (currentStep === 1) {
    return (
      <div className="screen">
        <TopBar onBack={goBack} />
        <ProgressBar value={0.2} />
        <h2 style={{ fontSize: 24, margin: '24px 0 12px' }}>Any symptoms today?</h2>
        <div className="chips" style={{ marginTop: 16 }}>
          {SYMPTOMS.map(s => {
            const isSelected = logData.symptoms.includes(s)
            return (
              <Chip 
                key={s} 
                selected={isSelected}
                onClick={() => {
                  if (isSelected) {
                    updateLog('symptoms', logData.symptoms.filter(x => x !== s))
                  } else {
                    updateLog('symptoms', [...logData.symptoms, s])
                  }
                }}
              >
                {s}
              </Chip>
            )
          })}
        </div>
        <div className="spacer" />
        <Button block onClick={goNext}>Next</Button>
      </div>
    )
  }

  // lg-2: Pain
  if (currentStep === 2) {
    return (
      <div className="screen">
        <TopBar onBack={goBack} />
        <ProgressBar value={0.4} />
        <h2 style={{ fontSize: 24, margin: '24px 0 12px' }}>Pain level</h2>
        <p className="muted" style={{ marginBottom: 32 }}>1 to 5 scale.</p>
        
        <div className="stack-16">
          <div className="center">
            <span className="big-num" style={{ fontSize: 52, color: 'var(--pink-accent)' }}>
              {logData.pain !== null ? logData.pain : '-'}
            </span>
          </div>
          <input
            className="slider"
            type="range"
            min="1"
            max="5"
            step="1"
            value={logData.pain || 1}
            onChange={(e) => updateLog('pain', Number(e.target.value))}
          />
        </div>
        
        <div className="spacer" />
        <Button block disabled={logData.pain === null} onClick={goNext}>Next</Button>
      </div>
    )
  }

  // lg-3: Impact
  if (currentStep === 3) {
    return (
      <div className="screen">
        <TopBar onBack={goBack} />
        <ProgressBar value={0.6} />
        <h2 style={{ fontSize: 24, margin: '24px 0 12px' }}>Did it affect your day?</h2>
        
        <div className="stack-16" style={{ marginTop: 24 }}>
          {IMPACTS.map(imp => {
            const isSelected = logData.impacts.includes(imp.id)
            return (
              <button 
                key={imp.id}
                onClick={() => {
                  if (isSelected) updateLog('impacts', logData.impacts.filter(x => x !== imp.id))
                  else updateLog('impacts', [...logData.impacts, imp.id])
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '16px',
                  width: '100%',
                  border: `1.5px solid ${isSelected ? 'var(--pink-accent)' : 'var(--border-light)'}`,
                  borderRadius: 'var(--radius)',
                  background: isSelected ? 'var(--pink-light)' : 'var(--surface)'
                }}
              >
                <span style={{ fontSize: 24 }} aria-hidden="true">{imp.icon}</span>
                <span style={{ fontSize: 16, fontWeight: 500 }}>{imp.label}</span>
              </button>
            )
          })}
        </div>

        <div className="card" style={{ marginTop: 24, background: 'var(--pink-light)', borderLeft: '3px solid var(--pink-accent)' }}>
          <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.4 }}>
            <strong>real talk:</strong> Logging impact isn't just for you. This is the evidence doctors take seriously.
          </p>
        </div>

        <div className="spacer" />
        <Button block disabled={logData.impacts.length === 0} onClick={goNext}>Next</Button>
      </div>
    )
  }

  // lg-4: Maisie reaction
  if (currentStep === 4) {
    return (
      <div className="screen center">
        <TopBar onBack={goBack} />
        <ProgressBar value={1.0} />
        <div className="spacer" />
        
        <MaisieLogo size={80} />
        <div className="card" style={{ marginTop: 24, textAlign: 'left' }}>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5 }}>
            ok, I see you. You logged {logData.symptoms.length} symptoms and pain at a {logData.pain}. thanks for updating your chart today.
          </p>
        </div>
        
        <div className="spacer" />
        <Button block onClick={finish}>Back to dashboard</Button>
      </div>
    )
  }
}
