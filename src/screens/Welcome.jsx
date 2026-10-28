import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { Button } from '../components/ui.jsx'
import MaisieLogo from '../components/MaisieLogo.jsx'
import InlineDropdown from '../components/InlineDropdown.jsx'
import { supabase } from '../lib/supabase.js'
import { Wrench } from '@phosphor-icons/react'
import { LOCAL_TEST_PROFILES } from '../config/localTestProfiles.js'

const LOCAL_TEST_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

function canUseLocalTestLogin() {
  return import.meta.env.DEV && LOCAL_TEST_HOSTS.has(window.location.hostname)
}

export default function Welcome() {
  const navigate = useNavigate()
  const { state } = useStore()
  const [selectedTestProfile, setSelectedTestProfile] = useState(LOCAL_TEST_PROFILES[0].id)
  const [testLoginLoading, setTestLoginLoading] = useState('')
  const [testLoginError, setTestLoginError] = useState('')
  const showLocalTestLogin = canUseLocalTestLogin()

  useEffect(() => {
    if (state.onboarded) {
      navigate('/home', { replace: true })
    }
  }, [state.onboarded, navigate])

  async function openTestAccount(profileId) {
    if (!showLocalTestLogin || !supabase || testLoginLoading) return
    setTestLoginLoading(profileId)
    setTestLoginError('')
    try {
      const response = await fetch(`/__maisie/test-login?profile=${encodeURIComponent(profileId)}`, {
        method: 'POST',
        headers: { 'x-maisie-local-test': '1' },
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'The test account could not be opened.')

      const { error } = payload.accessToken && payload.refreshToken
        ? await supabase.auth.setSession({
          access_token: payload.accessToken,
          refresh_token: payload.refreshToken,
        })
        : await supabase.auth.verifyOtp({
          token_hash: payload.tokenHash,
          type: payload.verificationType,
        })
      if (error) throw error
      navigate('/home')
    } catch (error) {
      setTestLoginError(error?.message || 'The test account could not be opened.')
    } finally {
      setTestLoginLoading('')
    }
  }

  return (
    <div className="screen center" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="spacer" />
      <div style={{ display: 'grid', placeItems: 'center' }}>
        <MaisieLogo variant="wordmark" width={280} />
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

        {showLocalTestLogin && (
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12, marginTop: 2, display: 'grid', gap: 8 }}>
            <label htmlFor="local-test-profile" style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700 }}>Test profile</label>
            <InlineDropdown
              id="local-test-profile"
              value={selectedTestProfile}
              options={LOCAL_TEST_PROFILES.map((profile) => ({ value: profile.id, label: profile.label }))}
              onChange={setSelectedTestProfile}
              disabled={Boolean(testLoginLoading)}
            />
            <Button variant="soft" block disabled={Boolean(testLoginLoading)} onClick={() => openTestAccount(selectedTestProfile)}>
              <Wrench size={18} weight="bold" aria-hidden="true" />
              {testLoginLoading ? 'Opening profile...' : 'Open test profile'}
            </Button>
            {testLoginError && (
              <p role="alert" style={{ margin: '8px 0 0', color: '#B42318', fontSize: 12.5 }}>
                {testLoginError}
              </p>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
