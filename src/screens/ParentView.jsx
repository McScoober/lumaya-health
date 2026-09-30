import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, TopBar } from '../components/ui.jsx'
import { SHARING_MODES } from '../components/SupportAccess.jsx'
import { useStore } from '../state/store.jsx'
import { supabase } from '../lib/supabase.js'
import { acceptSupportInvitation, fetchParentSupportSummaries, pendingSupportInvitations } from '../lib/sync.js'

export default function ParentView() {
  const navigate = useNavigate()
  const { state, authLoading } = useStore()
  const [invitations, setInvitations] = useState([])
  const [summaries, setSummaries] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const generation = useRef(0)
  async function refresh() {
    const request = ++generation.current
    try {
      const [pending, result] = await Promise.all([pendingSupportInvitations(), fetchParentSupportSummaries()])
      if (request !== generation.current) return
      if (!result.ok) throw result.error
      setInvitations(pending); setSummaries(result.summaries); setError('')
    } catch {
      if (request !== generation.current) return
      setInvitations([]); setSummaries([]); setError('Shared information could not be loaded. Please try again.')
    }
  }
  useEffect(() => {
    setInvitations([]); setSummaries([])
    if (!state.accountId || authLoading) return
    refresh()
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    const interval = setInterval(refresh, 30000)
    return () => { ++generation.current; clearInterval(interval); window.removeEventListener('focus', onFocus) }
  }, [state.accountId, authLoading])
  async function accept(id) {
    setBusy(true)
    try { await acceptSupportInvitation(id); await refresh() }
    catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }
  if (authLoading) return <div className="screen"><TopBar onBack={() => navigate('/')} /><p>Checking access...</p></div>
  return <div className="screen screen--pad-bottom stack-16">
    <TopBar onBack={() => navigate(state.onboarded ? '/profile' : '/')} />
    <h1>Shared with you</h1>
    {!state.accountId ? <>
      <p>Sign in with the email that was invited. Each person chooses what they share with you.</p>
      <Button onClick={() => navigate('/auth?next=/parent')}>Sign in</Button>
    </> : <>
      <p className="muted">{state.identity.email}</p>
      {error && <p role="alert">{error}</p>}
      {invitations.map((invite) => <article key={invite.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
        <h2 style={{ fontSize: 20 }}>{invite.display_name} invited you</h2>
        <p>{SHARING_MODES.find((mode) => mode.id === invite.access_level)?.description}</p>
        <p className="muted">Expires {new Date(invite.expires_at).toLocaleDateString()}</p>
        <Button disabled={busy} onClick={() => accept(invite.id)}>Accept invitation</Button>
      </article>)}
      {!summaries.length && !invitations.length && !error && <p>No active sharing invitations or summaries for this account.</p>}
      {summaries.map((summary) => <article key={summary.teen_user_id} style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
        <h2 style={{ fontSize: 22 }}>{summary.display_name}'s overview</h2>
        <p className="muted">{SHARING_MODES.find((mode) => mode.id === summary.transparency_mode)?.label}</p>
        {summary.result_level && <Badge level={summary.result_level} />}
        {summary.transparency_mode === 'flags' && !summary.result_level && <p>No current support signal shared.</p>}
        {summary.last_checkin && <p>Last check-in: {new Date(`${summary.last_checkin}T00:00:00`).toLocaleDateString()}</p>}
        {summary.summary?.recentLogs !== undefined && <p>{summary.summary.recentLogs} check-in days in the last 30 days.</p>}
        {summary.summary?.activeFlagCount !== undefined && <p>{summary.summary.activeFlagCount} active support signals.</p>}
        {summary.summary?.hasUrgent && <p>A signal needing prompt support was shared. Help them contact a clinician.</p>}
      </article>)}
      <p className="muted">Maisie does not diagnose. Private answers and daily health details are not included. Sharing can be changed or revoked at any time.</p>
      <Button variant="ghost" onClick={refresh}>Refresh</Button>
      <Button variant="ghost" onClick={async () => {
        const { error } = await supabase.auth.signOut({ scope: 'local' })
        if (error) setError('Could not sign out. Try again.')
        else { ++generation.current; setSummaries([]); setInvitations([]) }
      }}>Sign out</Button>
    </>}
  </div>
}
