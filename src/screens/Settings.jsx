// Screen 11 — Settings (TRD Section 4, 6.5, 9.2, 12.3)
// Manage personalization answers, support contact, notification preferences,
// cycle nickname, theme, and data deletion (PIPEDA).
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, THEME_MAP } from '../state/store.jsx'
import { Button, Card, ChipGroup } from '../components/ui.jsx'

const THEME_OPTIONS = ['Calm pastels', 'Bold & bright', 'Minimal & clean', 'Surprise me']
const SA_OPTIONS = ['Student', 'Athlete', 'Both', 'Neither']
const SLEEP_OPTIONS = ['Early to bed, early to rise', 'Night owl', 'All over the place']

export default function Settings() {
  const navigate = useNavigate()
  const { state, dispatch } = useStore()
  const { profile, identity, notifyPrefs } = state
  const [nickname, setNickname] = useState(profile.cycleNickname)
  const [toast, setToast] = useState('')

  const themeLabel = Object.keys(THEME_MAP).find((k) => THEME_MAP[k] === profile.theme) || 'Calm pastels'

  function flash(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 1600)
  }

  function updateProfile(payload) {
    dispatch({ type: 'SET_PROFILE', payload })
    flash('Saved')
  }

  function deleteData() {
    if (confirm('Delete all your Lumaya data from this device? This can’t be undone.')) {
      localStorage.clear()
      dispatch({ type: 'RESET' })
      navigate('/')
    }
  }

  return (
    <div className="screen screen--pad-bottom">
      {toast && <div className="toast">{toast}</div>}
      <h1>Settings</h1>

      <div className="card__label" style={{ marginTop: 8 }}>Cycle nickname</div>
      <Card>
        <div className="row" style={{ gap: 10 }}>
          <input className="input" value={nickname} placeholder="Name your tracker (optional)"
            onChange={(e) => setNickname(e.target.value)} />
          <Button variant="soft" onClick={() => updateProfile({ cycleNickname: nickname })}>Save</Button>
        </div>
        <p className="muted" style={{ fontSize: 12, margin: '8px 0 0' }}>
          Just for you — visible nowhere outside your own account.
        </p>
      </Card>

      <div className="card__label" style={{ marginTop: 18 }}>Theme</div>
      <Card>
        <ChipGroup options={THEME_OPTIONS} value={themeLabel}
          onChange={(v) => updateProfile({ themeChoice: v })} stack />
      </Card>

      <div className="card__label" style={{ marginTop: 18 }}>About you</div>
      <Card>
        <label style={{ fontWeight: 600, fontSize: 14 }}>Student / athlete</label>
        <div style={{ margin: '8px 0 14px' }}>
          <ChipGroup options={SA_OPTIONS} value={profile.studentAthlete} onChange={(v) => updateProfile({ studentAthlete: v })} />
        </div>
        <label style={{ fontWeight: 600, fontSize: 14 }}>Sleep schedule</label>
        <div style={{ marginTop: 8 }}>
          <ChipGroup options={SLEEP_OPTIONS} value={profile.sleep} onChange={(v) => updateProfile({ sleep: v })} stack />
        </div>
      </Card>

      <div className="card__label" style={{ marginTop: 18 }}>Notifications</div>
      <Card>
        <Toggle label="Period check-ins" desc="Daily during your predicted period window."
          on={notifyPrefs.periodCheckin} onChange={(v) => dispatch({ type: 'SET_NOTIFY', payload: { periodCheckin: v } })} />
        <hr className="divider" />
        <Toggle label="Phase tips" desc="About once a week, tuned to your phase."
          on={notifyPrefs.phaseTips} onChange={(v) => dispatch({ type: 'SET_NOTIFY', payload: { phaseTips: v } })} />
      </Card>

      <div className="card__label" style={{ marginTop: 18 }}>{identity.isMinor ? 'Parent dashboard' : 'Support contact'}</div>
      <Card onClick={() => navigate('/dashboard')} role="button" tabIndex={0} style={{ cursor: 'pointer' }}>
        <div className="row row--between">
          <span>{identity.isMinor ? 'Manage parent dashboard' : 'Manage support contact'}</span>
          <span className="muted">›</span>
        </div>
      </Card>

      <div className="card__label" style={{ marginTop: 18 }}>Privacy</div>
      <Card>
        <p className="muted" style={{ fontSize: 13, margin: '0 0 12px' }}>
          Your answers are encrypted and never sold. You can request full deletion at any time (PIPEDA).
        </p>
        <Button variant="ghost" style={{ color: 'var(--red)' }} onClick={deleteData}>
          Delete my data
        </Button>
      </Card>

      <p className="muted center" style={{ fontSize: 11, marginTop: 20 }}>
        Lumaya · MVP · pattern-awareness tool, not a diagnostic device
      </p>
    </div>
  )
}

function Toggle({ label, desc, on, onChange }) {
  return (
    <div className="row row--between">
      <div>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 14.5 }}>{label}</p>
        <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>{desc}</p>
      </div>
      <button
        onClick={() => onChange(!on)}
        aria-pressed={on}
        aria-label={label}
        style={{
          width: 50, height: 30, borderRadius: 999, border: 'none',
          background: on ? 'var(--accent)' : 'var(--line)', position: 'relative', flexShrink: 0,
          transition: 'background 160ms',
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: on ? 23 : 3, width: 24, height: 24,
          borderRadius: '50%', background: '#fff', transition: 'left 160ms', boxShadow: 'var(--shadow-sm)',
        }} />
      </button>
    </div>
  )
}
