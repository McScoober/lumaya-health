// Screen, Auth / Magic Link Login
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured, getAuthRedirectUrl, safeAuthNext } from '../lib/supabase.js'
import { saveSignupDraft } from '../lib/signupDraft.js'
import { useStore } from '../state/store.jsx'
import { Button, TopBar } from '../components/ui.jsx'
import MaisieLogo from '../components/MaisieLogo.jsx'
import { EnvelopeSimple, WarningCircle } from '@phosphor-icons/react'

export default function Auth() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const { state, authLoading } = useStore()
  const source = searchParams.get('source')
  const next = safeAuthNext(searchParams.get('next'))
  const isPostOnboarding = source === 'post-onboarding'
  const isExplicitSignIn = source === 'signin'

  useEffect(() => {
    if (isExplicitSignIn) return
    if (state.accountId && !authLoading) navigate(next === '/parent' || next.startsWith('/parent?') || state.onboarded ? next : '/age', { replace: true })
  }, [state.accountId, state.onboarded, authLoading, isExplicitSignIn, next, navigate])

  async function handleSendMagicLink(e) {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.')
      return
    }

    setLoading(true)
    setErrorMsg(null)

    if (!isSupabaseConfigured) {
      setLoading(false)
      setErrorMsg('Saving accounts is not configured in this preview.')
      return
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getAuthRedirectUrl(next),
        shouldCreateUser: isPostOnboarding,
      },
    })

    setLoading(false)

    if (error) {
      setErrorMsg(error.message)
    } else {
      if (isPostOnboarding) saveSignupDraft(window.localStorage, state, email)
      setSent(true)
    }
  }

  return (
    <div className="screen auth-screen">
      <TopBar onBack={() => navigate(-1)} />
      <main className="auth-screen__main">
        <MaisieLogo size={88} />

        <h1 style={{ fontSize: 28, margin: '20px 0 8px', textAlign: 'center' }}>
          {sent ? (isPostOnboarding ? 'Confirm your email' : 'Check your email') : isPostOnboarding ? 'Save your tracker' : 'Sign in'}
        </h1>

        <p className="muted center" style={{ maxWidth: 320, fontSize: 14, marginBottom: 24 }}>
          {sent
            ? isPostOnboarding
              ? `Open the email sent to ${email} and use the confirmation link to finish creating your account.`
              : `Open the email sent to ${email} and use the secure link to sign in.`
            : isPostOnboarding
              ? 'Add your email so your Maisie tracker can come with you across devices. No password needed.'
            : 'Enter your email to receive a secure sign-in link.'}
        </p>

        {sent ? (
          <div style={{ width: '100%', maxWidth: 340 }} aria-live="polite">
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <EnvelopeSimple size={28} weight="duotone" color="var(--pink-accent)" />
              <p style={{ margin: '8px 0 0', lineHeight: 1.5 }}>
                The link expires shortly and can only be used once.
              </p>
            </div>
            <button type="button" className="btn btn--ghost" onClick={() => setSent(false)}>
              Change email or send another link
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendMagicLink} style={{ width: '100%', maxWidth: 340 }}>
            {errorMsg && (
              <div style={{
                background: 'var(--red-soft)',
                color: 'var(--red)',
                padding: '10px 14px',
                borderRadius: '12px',
                fontSize: 13,
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <WarningCircle size={18} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div style={{ position: 'relative', marginBottom: 16 }}>
              <EnvelopeSimple
                size={20}
                weight="duotone"
                color="var(--text-secondary)"
                style={{ position: 'absolute', left: 14, top: 16 }}
              />
              <input
                type="email"
                className="input"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: 44 }}
                autoCapitalize="none"
                autoComplete="email"
                required
              />
            </div>

            <Button block disabled={loading} style={{ background: 'var(--pink-accent)', color: '#fff' }}>
              {loading ? 'Sending...' : isPostOnboarding ? 'Send confirmation email' : 'Send sign-in link'}
            </Button>
          </form>
        )}
      </main>

      <button
        onClick={() => navigate(next)}
        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', marginBottom: 12 }}
      >
        Skip for now
      </button>
    </div>
  )
}
