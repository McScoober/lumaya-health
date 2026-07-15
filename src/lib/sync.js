// ============================================================
// Sync layer between the app store and Supabase.
// Maps app state <-> the profiles (identity) + health_records (health) tables,
// preserving the §14.5 separation. All functions no-op if Supabase isn't set up.
// ============================================================
import { supabase } from './supabase.js'

// App identity -> profiles row
function identityToRow(userId, identity) {
  return {
    user_id: userId,
    name: identity.name || null,
    email: identity.email || null,
    age_band: identity.ageBand || null,
    is_minor: !!identity.isMinor,
    consented_at: identity.consentedAt || null,
    privacy_ack_at: identity.privacyAckAt || null,
    parent_email: identity.parentEmail || null,
    dashboard_active: !!identity.dashboardActive,
    transparency_mode: identity.transparencyMode || 'full',
    support_contact: identity.supportContact || null,
  }
}

// App health slice -> health_records row (NO name/email here)
function healthToRow(userId, state) {
  return {
    user_id: userId,
    onboarded: !!state.onboarded,
    result_level: state.result?.level || null,
    streak: state.streak || 0,
    data: {
      step: state.step,
      profile: state.profile,
      answers: state.answers,
      result: state.result,
      pendingTier2: state.pendingTier2,
      confirmedTier2: state.confirmedTier2,
      dailyLogs: state.dailyLogs,
      lastCheckinDate: state.lastCheckinDate,
      messages: state.messages,
      advisorRequests: state.advisorRequests,
      checkinHistory: state.checkinHistory,
      notifyPrefs: state.notifyPrefs,
    },
  }
}

// profiles + health_records rows -> partial app state
function rowsToState(userId, profile, health) {
  const identity = profile
    ? {
        name: profile.name || '',
        email: profile.email || '',
        ageBand: profile.age_band || null,
        isMinor: !!profile.is_minor,
        consentedAt: profile.consented_at || null,
        privacyAckAt: profile.privacy_ack_at || null,
        parentEmail: profile.parent_email || '',
        dashboardActive: !!profile.dashboard_active,
        transparencyMode: profile.transparency_mode || 'full',
        supportContact: profile.support_contact || null,
      }
    : null
  const healthState = health?.data ? { ...health.data, onboarded: !!health.onboarded, streak: health.streak || 0 } : null
  return { userId, ...(identity ? { identity } : {}), ...(healthState || {}) }
}

/** Pull this user's rows from Supabase. Returns partial state or null. */
export async function pullFromSupabase(userId) {
  if (!supabase || !userId) return null
  const [{ data: profile }, { data: health }] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('health_records').select('*').eq('user_id', userId).maybeSingle(),
  ])
  if (!profile && !health) return null
  return rowsToState(userId, profile, health)
}

/** Upsert the current state to Supabase. Fire-and-forget; logs on failure. */
export async function pushToSupabase(userId, state) {
  if (!supabase || !userId) return
  const results = await Promise.allSettled([
    supabase.from('profiles').upsert(identityToRow(userId, state.identity), { onConflict: 'user_id' }),
    supabase.from('health_records').upsert(healthToRow(userId, state), { onConflict: 'user_id' }),
  ])
  for (const r of results) {
    if (r.status === 'rejected' || r.value?.error) {
      console.warn('[lumaya] Supabase sync failed:', r.value?.error?.message || r.reason)
    }
  }
}

/** Record an advisor request row (best-effort). */
export async function pushAdvisorRequest(userId, req) {
  if (!supabase || !userId) return
  const { error } = await supabase.from('advisor_requests').insert({
    user_id: userId,
    result_level: req.level || null,
    flag_ids: req.flagIds || [],
    status: req.status || 'submitted',
  })
  if (error) console.warn('[lumaya] advisor request sync failed:', error.message)
}
