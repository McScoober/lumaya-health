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
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null

/**
 * Ensure we have a user id to key data by. Uses Supabase anonymous auth so each
 * device gets a stable auth.uid() that RLS policies can scope rows to, no
 * password, no email required from the user.
 * Returns the uid, or null if Supabase isn't configured / sign-in fails.
 */
let currentUserId = null
export function getCurrentUserId() {
  return currentUserId
}

function hasPendingEmailAuthCallback() {
  if (typeof window === 'undefined') return false
  const isCallbackRoute = window.location.pathname === '/auth/callback' ||
    window.location.hash.startsWith('#/auth/callback')
  return isCallbackRoute &&
    (window.location.search.includes('code=') ||
      window.location.hash.includes('code=') ||
      window.location.hash.includes('access_token='))
}

export function getAuthRedirectUrl(next = '/home') {
  if (typeof window === 'undefined') return undefined

  const nextParam = encodeURIComponent(next)
  if (import.meta.env.VITE_ROUTER === 'hash') {
    return `${window.location.origin}/#/auth/callback?next=${nextParam}`
  }
  return `${window.location.origin}/auth/callback?next=${nextParam}`
}

export function getAuthCallbackParams() {
  if (typeof window === 'undefined') return new URLSearchParams()

  const params = new URLSearchParams(window.location.search)
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash

  if (hash) {
    const hashQuery = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : hash
    const hashParams = new URLSearchParams(hashQuery)
    hashParams.forEach((value, key) => {
      if (!params.has(key)) params.set(key, value)
    })
  }

  return params
}

export async function ensureAuthUser() {
  if (!supabase) return null
  if (hasPendingEmailAuthCallback()) return null

  const existingUserId = await getExistingAuthUserId()
  if (existingUserId) return existingUserId

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) {
    console.warn('[lumaya] anonymous sign-in failed:', error.message)
    return null
  }
  currentUserId = data?.user?.id ?? null
  return currentUserId
}

export async function getExistingAuthUserId() {
  if (!supabase) return null
  if (hasPendingEmailAuthCallback()) return null

  const { data: sessionData } = await supabase.auth.getSession()
  if (sessionData?.session?.user) {
    currentUserId = sessionData.session.user.id
    return currentUserId
  }
  return null
}
