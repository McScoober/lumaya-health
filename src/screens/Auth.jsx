// Screen, Auth / Magic Link Login
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured, getAuthRedirectUrl } from '../lib/supabase.js'
import { Button, TopBar, Card } from '../components/ui.jsx'
import MaisieLogo from '../components/MaisieLogo.jsx'
import { EnvelopeSimple, CheckCircle, WarningCircle } from '@phosphor-icons/react'

export default function Auth() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  async function handleSendMagicLink(e) {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.')
      return
    }

    setLoading(true)
    setErrorMsg(null)

    if (!isSupabaseConfigured) {
      // Demo mode fallback
      setTimeout(() => {
        setLoading(false)
        setSent(true)
      }, 800)
      return
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getAuthRedirectUrl('/home'),
      },
    })

    setLoading(false)

    if (error) {
      setErrorMsg(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="screen center">
      <TopBar onBack={() => navigate(-1)} />
      <div className="spacer" />

      <MaisieLogo size={88} />

      <h1 style={{ fontSize: 28, margin: '20px 0 8px', textAlign: 'center' }}>
        {sent ? 'Check your email' : 'Sign in with Magic Link'}
      </h1>

      <p className="muted center" style={{ maxWidth: 320, fontSize: 14, marginBottom: 24 }}>
        {sent
          ? `We sent a magic link to ${email}. Tap the link in your email to instantly log in!`
          : 'No passwords needed. Enter your email and we will send you a 1-click magic login link.'}
      </p>

      {sent ? (
        <Card accent style={{ width: '100%', maxWidth: 340, textAlign: 'center', padding: '24px 16px' }}>
          <CheckCircle size={48} weight="duotone" color="var(--pink-accent)" style={{ margin: '0 auto 12px' }} />
          <p style={{ margin: 0, fontWeight: 500, fontSize: 14 }}>
            Link sent! You can close this window and open the email on your phone.
          </p>
        </Card>
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
            {loading ? 'Sending link...' : 'Send Magic Link ✨'}
          </Button>
        </form>
      )}

      <div className="spacer" />

      <button
        onClick={() => navigate('/home')}
        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', marginBottom: 12 }}
      >
        Skip for now
      </button>
    </div>
  )
}
