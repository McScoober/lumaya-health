import { getAuthRedirectUrl, supabase } from './supabase.js'
import { diffRecords, trackerRecords } from './trackerRecords.js'

const snapshots = new Map()
export function clearSyncCache() { snapshots.clear() }

function requireClient() {
  if (!supabase) throw new Error('Account services are not configured.')
}
async function rpc(name, args = {}) {
  requireClient()
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw new Error(error.message)
  return data
}
async function ownRows(table, userId) {
  const { data, error } = await supabase.from(table).select('*').eq('user_id', userId)
  if (error) throw new Error(`Could not load ${table}. ${error.message}`)
  return data || []
}

export async function pullFromSupabase(userId) {
  requireClient()
  const [profiles, settings, daily, periods, answers] = await Promise.all([
    ownRows('profiles', userId), ownRows('tracker_settings', userId), ownRows('daily_logs', userId),
    ownRows('period_days', userId), ownRows('questionnaire_answers', userId),
  ])
  const profile = profiles[0] || {}
  const setting = settings[0]
  if (!setting) { snapshots.delete(userId); return null }
  const result = await rpc('save_tracker_changes', { changes: {}, expected_user_id: userId })
  const state = {
    userId, onboarded: setting.onboarded, profile: setting.profile, notifyPrefs: setting.preferences,
    identity: {
      name: profile.name || '', email: profile.email || '', ageBand: profile.age_band,
      isMinor: !!profile.is_minor, privacyAckAt: profile.privacy_ack_at,
    },
    dailyLogs: Object.fromEntries(daily.map((row) => [row.log_date, row.data])),
    periodLogs: Object.fromEntries(periods.map((row) => [row.log_date, row.data])),
    answers: Object.fromEntries(answers.map((row) => [row.question_key, row.answer])),
    lastCheckinDate: daily.map((row) => row.log_date).sort().at(-1) || null,
    result, pendingTier2: [], confirmedTier2: [],
  }
  snapshots.set(userId, trackerRecords(state))
  return state
}

export async function pushToSupabase(userId, state) {
  requireClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || data.user?.id !== userId) throw new Error('Sign in again before saving.')
  const current = trackerRecords(state)
  const changes = diffRecords(snapshots.get(userId), current)
  const identity = state.identity || {}
  const { error: profileError } = await supabase.from('profiles').upsert({
    user_id: userId, name: identity.name?.trim().slice(0, 80) || null,
    email: data.user.email, age_band: identity.ageBand || null,
    is_minor: !!identity.isMinor, privacy_ack_at: identity.privacyAckAt || null,
  }, { onConflict: 'user_id' })
  if (profileError) throw new Error(profileError.message)
  const result = await rpc('save_tracker_changes', { changes, expected_user_id: userId })
  snapshots.set(userId, current)
  return result
}

export const listSupportAccess = () => rpc('list_support_access')
export const pendingSupportInvitations = () => rpc('pending_support_invitations')
export const acceptSupportInvitation = (id) => rpc('accept_support_invitation', { invitation_id: id })
export const manageSupportAccess = (id, kind, mode = null) => rpc('manage_support_access', { record_id: id, record_kind: kind, mode })

export const createSupportInvite = (email, mode) => rpc('create_support_invitation', { invited_email: email.trim().toLowerCase(), mode })

export async function sendSupportInviteLink(email, invitationId) {
  if (!supabase) return { ok: false, error: new Error('Account services are not configured.') }
  const next = invitationId ? `/parent?invite=${encodeURIComponent(invitationId)}` : '/parent'
  const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { emailRedirectTo: getAuthRedirectUrl(next) } })
  return { ok: !error, error }
}

export async function fetchParentSupportSummaries() {
  try { return { ok: true, summaries: await rpc('read_support_summaries') } }
  catch (error) { return { ok: false, error, summaries: [] } }
}
