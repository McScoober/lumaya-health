// ============================================================
// Supabase client (TRD §14.3 / §14.5)
// Optional: if the env vars aren't set, the app runs fully offline
// (localStorage only) and everything below no-ops gracefully.
// ============================================================
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('YOUR-PROJECT'))

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null

/**
 * Ensure we have a user id to key data by. Uses Supabase anonymous auth so each
 * device gets a stable auth.uid() that RLS policies can scope rows to — no
 * password, no email required from the user.
 * Returns the uid, or null if Supabase isn't configured / sign-in fails.
 */
let currentUserId = null
export function getCurrentUserId() {
  return currentUserId
}

export async function ensureAuthUser() {
  if (!supabase) return null
  const { data: sessionData } = await supabase.auth.getSession()
  if (sessionData?.session?.user) {
    currentUserId = sessionData.session.user.id
    return currentUserId
  }
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) {
    console.warn('[lumaya] anonymous sign-in failed:', error.message)
    return null
  }
  currentUserId = data?.user?.id ?? null
  return currentUserId
}
