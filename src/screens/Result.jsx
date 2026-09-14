// Screen 5 — Result screen (TRD Section 6.4)
import { useNavigate } from 'react-router-dom'

export default function Result() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAF6F0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '48px 24px 40px',
      fontFamily: "'DM Sans', sans-serif",
      boxSizing: 'border-box'
    }}>
      <p style={{
        fontFamily: "'Fraunces', serif",
        fontSize: '18px',
        color: '#E0528A',
        margin: '0 0 20px 0',
        letterSpacing: '0.04em'
      }}>
        maisie
      </p>

      {/* 4-flower bunch SVG illustration with stems and leaves */}
      <div style={{ margin: '10px 0 24px' }}>
        <svg width="140" height="140" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Stems & Leaves */}
          <path d="M70 130 C70 90, 45 75, 40 55" stroke="#7BAF7B" strokeWidth="4" strokeLinecap="round" />
          <path d="M70 130 C70 85, 95 75, 100 55" stroke="#7BAF7B" strokeWidth="4" strokeLinecap="round" />
          <path d="M70 130 C70 95, 60 70, 60 45" stroke="#7BAF7B" strokeWidth="4" strokeLinecap="round" />
          <path d="M70 130 C70 95, 80 70, 80 45" stroke="#7BAF7B" strokeWidth="4" strokeLinecap="round" />

          <path d="M70 110 Q50 100 45 108 Q55 118 70 110 Z" fill="#A0C4A4" />
          <path d="M70 100 Q90 90 95 98 Q85 108 70 100 Z" fill="#A0C4A4" />

          {/* Flower 1 (Pink) */}
          <g transform="translate(40, 55)">
            <circle cx="-10" cy="0" r="8" fill="#EDAFC0" />
            <circle cx="10" cy="0" r="8" fill="#EDAFC0" />
            <circle cx="0" cy="-10" r="8" fill="#EDAFC0" />
            <circle cx="0" cy="10" r="8" fill="#EDAFC0" />
            <circle cx="0" cy="0" r="6" fill="#E0528A" />
          </g>

          {/* Flower 2 (Yellow) */}
          <g transform="translate(100, 55)">
            <circle cx="-10" cy="0" r="8" fill="#F5DF9A" />
            <circle cx="10" cy="0" r="8" fill="#F5DF9A" />
            <circle cx="0" cy="-10" r="8" fill="#F5DF9A" />
            <circle cx="0" cy="10" r="8" fill="#F5DF9A" />
            <circle cx="0" cy="0" r="6" fill="#C8920A" />
          </g>

          {/* Flower 3 (Purple) */}
          <g transform="translate(60, 45)">
            <circle cx="-9" cy="0" r="7.5" fill="#D4B8EC" />
            <circle cx="9" cy="0" r="7.5" fill="#D4B8EC" />
            <circle cx="0" cy="-9" r="7.5" fill="#D4B8EC" />
            <circle cx="0" cy="9" r="7.5" fill="#D4B8EC" />
            <circle cx="0" cy="0" r="5.5" fill="#9B72CC" />
          </g>

          {/* Flower 4 (Cream/Pink) */}
          <g transform="translate(80, 45)">
            <circle cx="-9" cy="0" r="7.5" fill="#F7DDE6" />
            <circle cx="9" cy="0" r="7.5" fill="#F7DDE6" />
            <circle cx="0" cy="-9" r="7.5" fill="#F7DDE6" />
            <circle cx="0" cy="9" r="7.5" fill="#F7DDE6" />
            <circle cx="0" cy="0" r="5.5" fill="#E0528A" />
          </g>
        </svg>
      </div>

      <h1 style={{
        fontFamily: "'Fraunces', serif",
        fontSize: '32px',
        color: '#2C1810',
        margin: '0 0 12px 0',
        textAlign: 'center',
        fontWeight: 700,
        lineHeight: 1.2
      }}>
        you're in.
      </h1>

      <p style={{
        fontSize: '15px',
        color: '#5C3D2E',
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
        <div style={{ background: '#FFF8E8', border: '1px solid rgba(180, 83, 9, 0.18)', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <span style={{ fontSize: '21px', lineHeight: 1 }}>ℹ️</span>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#2C1810' }}>Maisie does not diagnose</p>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: '#5C3D2E', lineHeight: 1.45 }}>
              Maisie flags cycle signals from what you log. It cannot tell you that you have a medical condition.
            </p>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid rgba(44,24,16,0.08)', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '22px' }}>🌸</span>
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#2C1810' }}>Cycle + Signals</p>
            <p style={{ margin: 0, fontSize: 13, color: '#5C3D2E' }}>Track how energy, skin, sleep, and mood shift across your cycle.</p>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid rgba(44,24,16,0.08)', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '22px' }}>📊</span>
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#2C1810' }}>30-Day Heatmap</p>
            <p style={{ margin: 0, fontSize: 13, color: '#5C3D2E' }}>See patterns clearly before taking them to a doctor.</p>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid rgba(44,24,16,0.08)', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '22px' }}>💬</span>
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#2C1810' }}>Daily Check-Ins</p>
            <p style={{ margin: 0, fontSize: 13, color: '#5C3D2E' }}>One step at a time, quick and distraction-free.</p>
          </div>
        </div>
      </div>

      <button onClick={() => navigate('/home')}
        style={{
          width: '100%',
          maxWidth: '340px',
          background: '#E0528A',
          color: '#fff',
          border: 'none',
          borderRadius: '14px',
          padding: '16px',
          fontSize: '16px',
          fontWeight: 500,
          cursor: 'pointer'
        }}>
        let's go
      </button>
    </div>
  )
}
