import { getAuthRedirectUrl, supabase } from './supabase.js'
import { diffRecords, trackerRecords } from './trackerRecords.js'
import { historyPageRange, initialHistoryStart } from './historyWindow.js'
import { ageBandFromBirthMonthYear } from './age.js'

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

async function datedRows(table, userId, start, end) {
  let query = supabase
    .from(table)
    .select('log_date,data,updated_at')
    .eq('user_id', userId)
    .gte('log_date', start)
    .order('log_date', { ascending: true })
  if (end) query = query.lte('log_date', end)
  const { data, error } = await query
  if (error) throw new Error(`Could not load ${table}. ${error.message}`)
  return data || []
}

function rowsToLogs(rows) {
  return Object.fromEntries(rows.map((row) => [row.log_date, row.data]))
}

export function mergeLoadedHistorySnapshot(userId, history) {
  const snapshot = snapshots.get(userId)
  if (!snapshot) return
  snapshots.set(userId, {
    ...snapshot,
    dailyLogs: { ...snapshot.dailyLogs, ...(history.dailyLogs || {}) },
    periodLogs: { ...snapshot.periodLogs, ...(history.periodLogs || {}) },
  })
}

export async function loadHistoryRange(userId, start, end) {
  requireClient()
  const [daily, periods] = await Promise.all([
    datedRows('daily_logs', userId, start, end),
    datedRows('period_days', userId, start, end),
  ])
  const history = { dailyLogs: rowsToLogs(daily), periodLogs: rowsToLogs(periods) }
  mergeLoadedHistorySnapshot(userId, history)
  return history
}

export async function loadHistoryPage(userId, beforeDate, months) {
  const page = historyPageRange(beforeDate, months)
  return { ...(await loadHistoryRange(userId, page.start, page.end)), ...page }
}

export async function pullFromSupabase(userId) {
  requireClient()
  const historyStart = initialHistoryStart()
  const [profiles, settings, daily, periods, answers, cycles, screening] = await Promise.all([
    ownRows('profiles', userId), ownRows('tracker_settings', userId),
    datedRows('daily_logs', userId, historyStart), datedRows('period_days', userId, historyStart),
    ownRows('questionnaire_answers', userId), ownRows('cycles', userId), ownRows('screening_results', userId),
  ])
  const profile = profiles[0] || {}
  const setting = settings[0]
  if (!setting) { snapshots.delete(userId); return null }
  const result = screening[0]?.result || null
  const savedAnswers = Object.fromEntries(answers.map((row) => [row.question_key, row.answer]))
  const currentAgeBand = ageBandFromBirthMonthYear(profile.birth_month, profile.birth_year) || profile.age_band
  const state = {
    userId, onboarded: setting.onboarded, profile: setting.profile, notifyPrefs: setting.preferences,
    identity: {
      name: profile.name || '', email: profile.email || '', ageBand: currentAgeBand,
      birthMonth: profile.birth_month || null, birthYear: profile.birth_year || null,
      isMinor: currentAgeBand ? currentAgeBand !== '18+' : !!profile.is_minor,
      privacyAckAt: profile.privacy_ack_at,
    },
    dailyLogs: rowsToLogs(daily),
    periodLogs: rowsToLogs(periods),
    cycles: cycles.sort((a, b) => a.start_date.localeCompare(b.start_date)),
    answers: { ...savedAnswers, ...(currentAgeBand ? { age: currentAgeBand } : {}) },
    lastCheckinDate: daily.map((row) => row.log_date).sort().at(-1) || null,
    result, pendingTier2: [], confirmedTier2: [],
  }
  // Keep the server's saved age in the snapshot. If a birthday changed the
  // derived band, the normal save queue sends that one answer back and
  // recalculates age-sensitive screening rules.
  snapshots.set(userId, trackerRecords({ ...state, answers: savedAnswers }))
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
    birth_month: identity.birthMonth || null, birth_year: identity.birthYear || null,
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
