// Screen 5 — Result screen (TRD Section 6.4)
import { useNavigate } from 'react-router-dom'
import { ChartBar, ChatCircleDots, CheckCircle, Flower, Info } from '@phosphor-icons/react'
import MaisieLogo from '../components/MaisieLogo.jsx'

export default function Result() {
  const navigate = useNavigate()

  return (
    <div className="screen result-screen">
      <MaisieLogo variant="wordmark" width={220} style={{ marginBottom: 18 }} />

      <div
        aria-hidden="true"
        style={{
          width: 56,
          height: 56,
          margin: '10px 0 24px',
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--sage-100)',
          color: 'var(--sage-700)',
        }}
      >
        <CheckCircle size={34} weight="fill" />
      </div>

      <h1 style={{
        fontFamily: "'Fraunces', serif",
        fontSize: '32px',
        color: 'var(--text-primary)',
        margin: '0 0 12px 0',
        textAlign: 'center',
        fontWeight: 700,
        lineHeight: 1.2
      }}>
        you're in.
      </h1>

      <p style={{
        fontSize: '15px',
        color: 'var(--text-secondary)',
        textAlign: 'center',
        lineHeight: 1.6,
        margin: '0 0 36px 0',
        maxWidth: '300px'
      }}>
        your body is telling you something every day.
        maisie helps you actually hear it.
      </p>

      {/* 3 feature tiles */}
      <div style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
        <div className="callout callout--real-talk" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <Info size={22} weight="fill" color="var(--plum-700)" aria-hidden="true" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Maisie does not diagnose</p>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              Maisie flags cycle signals from what you log. It cannot tell you that you have a medical condition.
            </p>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Flower size={22} weight="duotone" color="var(--rose)" aria-hidden="true" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Cycle + Signals</p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Track how energy, skin, sleep, and mood shift across your cycle.</p>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ChartBar size={22} weight="duotone" color="var(--sage-700)" aria-hidden="true" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>30-Day Heatmap</p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>See patterns clearly before taking them to a doctor.</p>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ChatCircleDots size={22} weight="duotone" color="var(--plum-700)" aria-hidden="true" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Daily Check-Ins</p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>One step at a time, quick and distraction-free.</p>
          </div>
        </div>
      </div>

      <div className="screen__actions result-screen__actions">
        <button onClick={() => navigate('/auth?next=/home&source=post-onboarding')}
          style={{
            width: '100%',
            background: 'var(--plum-700)',
            color: '#fff',
            border: 'none',
            borderRadius: '14px',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 500,
            cursor: 'pointer'
          }}>
          save my tracker
        </button>
      </div>
    </div>
  )
}
