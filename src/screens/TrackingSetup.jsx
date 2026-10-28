import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { Button, ProgressBar, TopBar } from '../components/ui.jsx'
import {
  profilePayloadForTrackingModules,
  trackingModulesFromProfile,
  visibleTrackingModules,
} from '../lib/trackingPreferences.js'
import { colors } from '../theme/tokens.js'

export default function TrackingSetup() {
  const navigate = useNavigate()
  const { state, dispatch } = useStore()
  const [modules, setModules] = useState(() => trackingModulesFromProfile(state.profile))
  const [hideFoodContent, setHideFoodContent] = useState(state.profile.hideFoodContent === true)
  const [restoreFoodContent, setRestoreFoodContent] = useState(false)
  const availableModules = visibleTrackingModules()

  function continueToCheckin() {
    dispatch({
      type: 'SET_PROFILE',
      payload: profilePayloadForTrackingModules(modules, { hideFoodContent, restoreFoodContent }),
    })
    navigate('/checkin')
  }

  return (
    <div className="screen">
      <TopBar onBack={() => navigate('/personalize')} />
      <ProgressBar value={0.38} />
      <div style={{ marginTop: 24 }}>
        <p className="eyebrow">Make it yours</p>
        <h1 style={{ fontSize: 27 }}>What do you want to track?</h1>
        <p className="muted">Keep this quick or add more detail. You can change these choices later.</p>
      </div>

      <div style={{ display: 'grid', gap: 1, marginTop: 18, border: `1px solid ${colors.border}`, borderRadius: 14, overflow: 'hidden', background: colors.border }}>
        {availableModules.map((module) => {
          const enabled = module.locked || modules[module.id]
          return (
            <div key={module.id} style={{ minHeight: 72, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, background: colors.surface }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <strong style={{ display: 'block', color: colors.plum900, fontSize: 15 }}>{module.label}</strong>
                <span style={{ display: 'block', marginTop: 3, color: colors.textMuted, fontSize: 12.5, lineHeight: 1.4 }}>{module.description}</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(enabled)}
                aria-label={module.label}
                disabled={module.locked}
                onClick={() => {
                  const next = !modules[module.id]
                  setModules((current) => ({ ...current, [module.id]: next }))
                  if (module.id === 'food') {
                    setRestoreFoodContent(next)
                    if (next) setHideFoodContent(false)
                  }
                }}
                style={{
                  width: 52, height: 32, padding: 3, border: 0, borderRadius: 999,
                  background: enabled ? colors.sage700 : colors.lavender100,
                  display: 'flex', justifyContent: enabled ? 'flex-end' : 'flex-start', alignItems: 'center',
                  flex: '0 0 auto', opacity: module.locked ? 0.72 : 1,
                }}
              >
                <span style={{ width: 26, height: 26, borderRadius: '50%', background: colors.surface, boxShadow: '0 1px 4px rgba(63,8,36,.2)' }} />
              </button>
            </div>
          )
        })}
      </div>

      <div className="screen__actions">
        <Button block onClick={continueToCheckin}>Continue</Button>
      </div>
    </div>
  )
}
