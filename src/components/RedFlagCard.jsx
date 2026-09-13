// RedFlagCard — shown when pain ≥ 8 or heavy spotting logged.
// Calm, non-alarming tone — "heavier than normal" framing, not "emergency".
// Two paths: dismiss (logs normally) or go to advisor for what to say.
import { useNavigate } from 'react-router-dom'

export default function RedFlagCard({ onDismiss }) {
  const navigate = useNavigate()

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #FFF1F4 0%, #FFE0E8 100%)',
        border: '1.5px solid rgba(180, 30, 75, 0.25)',
        borderRadius: 18,
        padding: '20px 18px',
        marginTop: 20,
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(180, 30, 75, 0.12)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          🌡️
        </span>
        <p
          style={{
            margin: 0,
            fontWeight: 700,
            fontSize: 15,
            color: '#7B1B40',
            lineHeight: 1.3,
          }}
        >
          This is heavier than normal
        </p>
      </div>

      <p
        style={{
          margin: '0 0 16px',
          fontSize: 14,
          color: '#5C1832',
          lineHeight: 1.55,
        }}
      >
        Pain at this level means your body is asking for support. It's worth letting a parent or doctor know today — you don't have to deal with this alone.
      </p>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          id="red-flag-tell-someone"
          type="button"
          onClick={onDismiss}
          style={{
            width: '100%',
            padding: '13px 16px',
            border: 'none',
            borderRadius: 12,
            background: '#C01B50',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '0.01em',
          }}
        >
          Got it — I'll tell someone
        </button>
        <button
          id="red-flag-show-advisor"
          type="button"
          onClick={() => {
            onDismiss()
            navigate('/advisor')
          }}
          style={{
            width: '100%',
            padding: '13px 16px',
            border: '1.5px solid rgba(180, 30, 75, 0.3)',
            borderRadius: 12,
            background: 'transparent',
            color: '#7B1B40',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Show me what to say 💬
        </button>
      </div>
    </div>
  )
}
