import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { Button } from '../components/ui.jsx'
import MaisieLogo from '../components/MaisieLogo.jsx'

export default function Welcome() {
  const navigate = useNavigate()
  const { state } = useStore()

  useEffect(() => {
    if (state.onboarded) {
      navigate('/home', { replace: true })
    }
  }, [state.onboarded, navigate])

  return (
    <div className="screen center" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="spacer" />
      <div style={{ display: 'grid', placeItems: 'center', gap: 16 }}>
        <MaisieLogo size={120} />
        <h1 style={{ fontSize: 36, margin: '14px 0 0', color: 'var(--text-primary)' }}>Maisie</h1>
      </div>
      <div className="spacer" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24, width: '100%', maxWidth: 380 }}>
        <Button className="btn--primary btn--block" onClick={() => navigate(state.onboarded ? '/home' : '/age')}>
          For you (Teen)
        </Button>
        <Button className="btn--ghost btn--block" onClick={() => navigate('/parent')}>
          For a parent
        </Button>
        <button
          type="button"
          onClick={() => navigate('/auth?next=/home&source=signin')}
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            padding: '4px 0',
          }}
        >
          Already have an account? Sign in
        </button>
      </div>

      <div className="card" style={{ textAlign: 'left', marginBottom: 12, padding: '14px', width: '100%', maxWidth: 380 }}>
        <div className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
          <span aria-hidden="true" style={{ fontSize: 18 }}>🔒</span>
          <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.4 }}>
            Until you save your tracker, answers stay in this open page. Closing or refreshing it clears them.
          </p>
        </div>
      </div>
    </div>
  )
}
