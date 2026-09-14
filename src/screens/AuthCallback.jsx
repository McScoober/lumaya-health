import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured, getAuthCallbackParams } from '../lib/supabase.js'
import { pullFromSupabase } from '../lib/sync.js'
import { useStore } from '../state/store.jsx'

function userFacingAuthError(error) {
  const message = error?.message || ''
  if (message.toLowerCase().includes('code verifier')) {
    return 'This sign-in link was created with an older browser-bound login flow. Please request a fresh magic link and open the newest email.'
  }
  return message || 'This sign-in link did not work. Please request a new one.'
}

export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { state, dispatch } = useStore()
  const [message, setMessage] = useState('Signing you in...')

  useEffect(() => {
    let cancelled = false

    async function finishSignIn() {
      if (!isSupabaseConfigured || !supabase) {
        navigate(state.onboarded ? '/home' : '/', { replace: true })
        return
      }

      const callbackParams = getAuthCallbackParams()
      const next = callbackParams.get('next') || searchParams.get('next') || '/home'
      const errorDescription = callbackParams.get('error_description')
      const errorCode = callbackParams.get('error_code')
      const code = callbackParams.get('code')
      const accessToken = callbackParams.get('access_token')
      const refreshToken = callbackParams.get('refresh_token')

      if (errorDescription) {
        const suffix = errorCode ? ` (${errorCode})` : ''
        if (!cancelled) setMessage(`${errorDescription}${suffix}`)
        return
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          if (!cancelled) setMessage(userFacingAuthError(error))
          return
        }
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (error) {
          if (!cancelled) setMessage(userFacingAuthError(error))
          return
        }
      }

      const { data, error } = await supabase.auth.getSession()
      const userId = data?.session?.user?.id
      if (error || !userId) {
        if (!cancelled) setMessage(error?.message || 'This sign-in link expired. Please request a new one.')
        return
      }

      const remoteState = await pullFromSupabase(userId)
      const signedInState = remoteState
        ? { ...remoteState, userId }
        : { userId }

      if (!cancelled) {
        dispatch({ type: 'HYDRATE', payload: signedInState })
        window.location.replace(remoteState?.onboarded || state.onboarded ? next : '/age')
      }
    }

    finishSignIn()

    return () => {
      cancelled = true
    }
  }, [navigate, searchParams, state.onboarded])

  return (
    <div className="screen center" style={{ justifyContent: 'center' }}>
      <h1 style={{
        margin: '0 0 10px',
        color: '#2C1810',
        fontFamily: "'Fraunces', serif",
        fontSize: 28,
        textAlign: 'center',
      }}>
        just a sec
      </h1>
      <p style={{ margin: 0, color: '#5C3D2E', fontSize: 14, lineHeight: 1.5, textAlign: 'center' }}>
        {message}
      </p>
    </div>
  )
}
