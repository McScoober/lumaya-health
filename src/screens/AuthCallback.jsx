import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'
import { pullFromSupabase } from '../lib/sync.js'
import { useStore } from '../state/store.jsx'

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

      const next = searchParams.get('next') || '/home'
      const hasCode = window.location.search.includes('code=')

      if (hasCode) {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)
        if (error) {
          if (!cancelled) setMessage(error.message || 'This sign-in link did not work. Please request a new one.')
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
