import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { dateKeyLocal } from '../engine/cyclePredictor.js'
import { Button, TopBar, ProgressBar, Chip } from '../components/ui.jsx'
import MaisieLogo from '../components/MaisieLogo.jsx'
import { SmileyWink, Smiley, SmileyMeh, SmileySad, SmileyBlank } from '@phosphor-icons/react'

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

const VIBE_OPTIONS = [
  { key: 'great', label: 'Great', value: 5, Icon: SmileyWink, color: '#A0C4A4' },
  { key: 'good', label: 'Good', value: 4, Icon: Smiley, color: '#E8C86A' },
  { key: 'okay', label: 'Okay', value: 3, Icon: SmileyMeh, color: '#C4A8E0' },
  { key: 'rough', label: 'Rough', value: 2, Icon: SmileySad, color: '#E8A0B0' },
  { key: 'awful', label: 'Awful', value: 1, Icon: SmileyBlank, color: '#E0528A' },
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
    const todayKey = dateKeyLocal()
    dispatch({ 
      type: 'LOG_DAILY', 
      dateKey: todayKey, 
      vibe: logData.vibe?.value,
      vibeLabel: logData.vibe?.key,
      symptoms: logData.symptoms,
      pain: logData.pain,
      impact: logData.impacts,
    })
    navigate('/home')
  }

  const todayKey = dateKeyLocal()
  const loggedToday = state.dailyLogs[todayKey]

  // If already logged today, skip the wizard and show a confirmed state
  if (loggedToday?.checkinCompleted) {
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

  // lg-4: Overall mood
  if (currentStep === 4) {
    return (
      <div className="screen">
        <TopBar onBack={goBack} />
        <ProgressBar value={0.8} />
        <h2 style={{ fontSize: 24, margin: '24px 0 12px' }}>How's your overall mood today?</h2>
        <p className="muted" style={{ marginBottom: 24 }}>Pick the one that feels closest.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 8 }}>
          {VIBE_OPTIONS.map(({ key, label, Icon, color, value }) => {
            const selected = logData.vibe?.key === key
            return (
              <button
                key={key}
                type="button"
                aria-label={label}
                aria-pressed={selected}
                onClick={() => updateLog('vibe', { key, value })}
                style={{
                  aspectRatio: '1',
                  minHeight: 58,
                  border: `1.5px solid ${selected ? color : 'rgba(44,24,16,0.08)'}`,
                  borderRadius: 16,
                  background: selected ? `color-mix(in srgb, ${color} 16%, white)` : '#fff',
                  color,
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  transform: selected ? 'scale(0.97)' : 'scale(1)',
                  transition: 'transform 0.15s ease, background 0.15s ease, border 0.15s ease',
                }}
              >
                <Icon size={30} weight={selected ? 'fill' : 'duotone'} color={color} />
              </button>
            )
          })}
        </div>
        
        <div className="spacer" />
        <Button block disabled={!logData.vibe} onClick={goNext}>Next</Button>
      </div>
    )
  }

  // lg-5: Maisie reaction
  if (currentStep === 5) {
    return (
      <div className="screen center">
        <TopBar onBack={goBack} />
        <ProgressBar value={1.0} />
        <div className="spacer" />
        
        <MaisieLogo size={80} />
        <div className="card" style={{ marginTop: 24, textAlign: 'left' }}>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5 }}>
            ok, I see you. You logged {logData.symptoms.length} symptoms, pain at a {logData.pain}, and your overall mood. thanks for updating your chart today.
          </p>
        </div>
        
        <div className="spacer" />
        <Button block onClick={finish}>Finish</Button>
      </div>
    )
  }
}
