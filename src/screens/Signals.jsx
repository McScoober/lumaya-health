import { useState } from 'react'
import MetabolicCard from '../components/MetabolicCard.jsx'
import CycleOverlayChart from '../components/CycleOverlayChart.jsx'
import { useStore } from '../state/store.jsx'
import { phaseForDate, PHASE_META } from '../engine/cyclePredictor.js'

const FULL_MOCK_SIGNALS = {
  energy: { val: 'Trending up', desc: 'Higher energy on 18 of the last 30 days. Most common during days 6 to 14.', trend: Array.from({length: 30}, (_, i) => [3,3,2,3,4,4,5,5,5,5,5,5,5,5,4,4,4,3,3,3,2,2,2,2,3,3,3,3,3,3][i]) },
  skin:   { val: '2 flare-ups', desc: 'Skin changes showed up most around days 20 to 25.', trend: Array.from({length: 30}, (_, i) => [4,5,5,5,5,5,5,5,5,5,5,5,5,4,4,4,3,3,3,2,2,2,3,3,3,3,4,4,4,5][i]) },
  sleep:  { val: 'Solid',      desc: 'Solid sleep pattern holding for 21 days straight.', trend: Array.from({length: 30}, (_, i) => [3,4,4,4,5,5,5,5,5,5,5,5,4,4,4,4,3,3,3,2,2,2,2,3,3,3,3,4,4,4][i]) },
  mood:   { val: 'Steadier',   desc: 'Steadier than last cycle.', trend: Array.from({length: 30}, (_, i) => [2,2,3,3,4,5,5,5,5,5,5,4,4,4,4,3,3,3,2,2,2,2,3,3,3,3,4,4,5,5][i]) }
}

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

  const phaseInfo = phaseForDate(cycleModel, new Date())
  const phase = phaseInfo.phase || 'follicular'
  const cycleDay = phaseInfo.dayOfCycle === null || phaseInfo.dayOfCycle === undefined ? 14 : phaseInfo.dayOfCycle + 1
  const phaseMeta = PHASE_META[phase] || PHASE_META.follicular
  const phaseLabel = PHASE_LABELS[phase] || phaseMeta.label || 'building up'

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
          day {cycleDay}
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
          ['cycle', 'through your cycle'],
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
          <MetabolicCard title="Energy" value={FULL_MOCK_SIGNALS.energy.val} color="#E8C86A" description={FULL_MOCK_SIGNALS.energy.desc} trendPoints={FULL_MOCK_SIGNALS.energy.trend} />
          <MetabolicCard title="Skin" value={FULL_MOCK_SIGNALS.skin.val} color="#E8A0B0" description={FULL_MOCK_SIGNALS.skin.desc} trendPoints={FULL_MOCK_SIGNALS.skin.trend} />
          <MetabolicCard title="Sleep" value={FULL_MOCK_SIGNALS.sleep.val} color="#C4A8E0" description={FULL_MOCK_SIGNALS.sleep.desc} trendPoints={FULL_MOCK_SIGNALS.sleep.trend} />
          <MetabolicCard title="Mood" value={FULL_MOCK_SIGNALS.mood.val} color="#A0C4A4" description={FULL_MOCK_SIGNALS.mood.desc} trendPoints={FULL_MOCK_SIGNALS.mood.trend} />
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
              <strong style={{ color: '#2C1810' }}>Maisie says:</strong> this view is here to spot timing. If something keeps showing up during the same part of your cycle, it's worth tracking for one more month.
            </p>
          </section>
        </div>
      )}
    </div>
  )
}
