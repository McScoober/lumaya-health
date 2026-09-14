import { useState } from 'react'
import MetabolicCard from '../components/MetabolicCard.jsx'
import CycleOverlayChart from '../components/CycleOverlayChart.jsx'
import { useStore } from '../state/store.jsx'
import { phaseForDate, PHASE_META, hasThreeFullCycles } from '../engine/cyclePredictor.js'
import { deriveBodySignals } from '../engine/bodySignals.js'

const PHASE_LABELS = {
  menstrual: 'period',
  follicular: 'building up',
  ovulation: 'peak',
  luteal: 'wind down',
  bc_active: 'steady week',
  bc_break: 'break week',
  bc_generic: 'this week',
}

export default function Signals() {
  const [view, setView] = useState('all')
  const { state, cycleModel } = useStore()

  const predictionsReady = hasThreeFullCycles(state.periodLogs)
  const phaseInfo = predictionsReady ? phaseForDate(cycleModel, new Date()) : { phase: null, dayOfCycle: null }
  const phase = phaseInfo.phase || 'follicular'
  const cycleDay = phaseInfo.dayOfCycle === null || phaseInfo.dayOfCycle === undefined ? 14 : phaseInfo.dayOfCycle + 1
  const phaseMeta = PHASE_META[phase] || PHASE_META.follicular
  const phaseLabel = PHASE_LABELS[phase] || phaseMeta.label || 'building up'
  const bodySignals = deriveBodySignals(state.dailyLogs, state.profile, {
    days: 30,
    energyColor: '#E8C86A',
    skinColor: '#E8A0B0',
    sleepColor: '#C4A8E0',
    moodColor: '#A0C4A4',
  })

  return (
    <div style={{
      minHeight: '100%',
      padding: '18px 18px 96px',
      background: '#FAF6F0',
      color: '#2C1810',
      fontFamily: "'DM Sans', sans-serif",
      boxSizing: 'border-box',
    }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <p style={{
            margin: '0 0 4px',
            color: '#E0528A',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            signals
          </p>
          <h1 style={{
            margin: 0,
            color: '#2C1810',
            fontFamily: "'Fraunces', serif",
            fontSize: 26,
            lineHeight: 1.15,
          }}>
            how you're feeling
          </h1>
        </div>
        <span style={{
          flexShrink: 0,
          fontSize: 11,
          fontWeight: 700,
          color: phaseMeta?.accent || '#E0528A',
          background: phaseMeta?.soft || '#FDEEF4',
          padding: '7px 10px',
          borderRadius: 99,
        }}>
          {predictionsReady ? `day ${cycleDay}` : 'baseline'}
        </span>
      </header>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 6,
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: '#FAF6F0',
        paddingTop: 12,
        paddingBottom: 10,
        marginBottom: 18,
        marginTop: 16
      }}>
        {[
          ['all', 'last 30 days'],
          ['cycle', predictionsReady ? 'through your cycle' : 'baseline'],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-pressed={view === key}
            onClick={() => setView(key)}
            style={{
              minHeight: 40,
              border: view === key ? '1.5px solid #E0528A' : '1px solid rgba(44,24,16,0.08)',
              borderRadius: 999,
              background: view === key ? '#FDEEF4' : '#fff',
              color: view === key ? '#E0528A' : '#5C3D2E',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'all' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'rise 300ms ease' }}>
          <MetabolicCard title="Energy" value={bodySignals.energy.val} color="#E8C86A" description={bodySignals.energy.desc} trendPoints={bodySignals.energy.trend} />
          <MetabolicCard title="Skin" value={bodySignals.skin.val} color="#E8A0B0" description={bodySignals.skin.desc} trendPoints={bodySignals.skin.trend} />
          <MetabolicCard title="Sleep" value={bodySignals.sleep.val} color="#C4A8E0" description={bodySignals.sleep.desc} trendPoints={bodySignals.sleep.trend} />
          <MetabolicCard title="Mood" value={bodySignals.mood.val} color="#A0C4A4" description={bodySignals.mood.desc} trendPoints={bodySignals.mood.trend} />
        </div>
      )}

      {view === 'cycle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'rise 300ms ease' }}>
          <section style={{
            background: '#fff',
            border: '1px solid rgba(44,24,16,0.08)',
            borderRadius: 14,
            padding: 13,
            boxShadow: '0 10px 30px rgba(44,24,16,0.04)',
          }}>
            {predictionsReady ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                  <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, lineHeight: 1.15, margin: 0, color: '#2C1810' }}>
                    how you feel through your cycle
                  </h2>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: phaseMeta?.accent || '#E0528A',
                    background: phaseMeta?.soft || '#FDEEF4',
                    padding: '5px 10px',
                    borderRadius: 99,
                    whiteSpace: 'nowrap',
                  }}>
                    {phaseLabel}
                  </span>
                </div>

                <div style={{ marginTop: 12, borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
                  <CycleOverlayChart cycleDay={cycleDay} dailyLogs={state.dailyLogs} />
                </div>

                <p style={{ margin: '14px 0 0', color: '#5C3D2E', fontSize: 13.5, lineHeight: 1.5 }}>
                  <strong style={{ color: '#2C1810' }}>Maisie says:</strong> this view is here to spot timing from your own cycle history.
                </p>
              </>
            ) : (
              <>
                <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, lineHeight: 1.15, margin: 0, color: '#2C1810' }}>
                  building your baseline
                </h2>
                <p style={{ margin: '10px 0 0', color: '#5C3D2E', fontSize: 13.5, lineHeight: 1.5 }}>
                  Keep logging period starts and daily check-ins. Maisie will show timing-based views once there are enough full cycles to make them useful.
                </p>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
