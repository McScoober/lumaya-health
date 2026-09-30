// ============================================================
// Supabase client (TRD §14.3 / §14.5)
// Optional: if the env vars aren't set, the app runs fully offline
// (in-memory preview only).
// ============================================================
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('YOUR-PROJECT'))

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'implicit',
      },
    })
  : null

/**
 * Supabase sync only starts after the user has an existing non-anonymous auth
 * session. Pre-signup tracker data stays local on the device.
 */
let currentUserId = null
export function getCurrentUserId() {
  return currentUserId
}

function isAnonymousUser(user) {
  return Boolean(
    user?.is_anonymous === true ||
      (!user?.email && user?.app_metadata?.provider === 'anonymous') ||
      (!user?.email && user?.identities?.some((identity) => identity.provider === 'anonymous')),
  )
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

  const nextParam = encodeURIComponent(safeAuthNext(next))
  if (import.meta.env.VITE_ROUTER === 'hash') {
    return `${window.location.origin}/#/auth/callback?next=${nextParam}`
  }
  return `${window.location.origin}/auth/callback?next=${nextParam}`
}

export function safeAuthNext(value) {
  if (typeof value !== 'string' || !/^\/(home|profile|parent|age|patterns)(\?|$)/.test(value)) return '/home'
  return value
}

export function getAuthCallbackParams() {
  if (typeof window === 'undefined') return new URLSearchParams()

  const params = new URLSearchParams(window.location.search)
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash

  function mergeParams(searchLike) {
    if (!searchLike) return
    const normalized = searchLike.startsWith('?') || searchLike.startsWith('#')
      ? searchLike.slice(1)
      : searchLike
    const hashParams = new URLSearchParams(normalized)
    hashParams.forEach((value, key) => {
      if (!params.has(key)) params.set(key, value)
    })
  }

  if (hash) {
    const [hashBeforeNestedFragment, nestedFragment] = hash.split('#')
    if (hashBeforeNestedFragment.includes('?')) {
      mergeParams(hashBeforeNestedFragment.slice(hashBeforeNestedFragment.indexOf('?') + 1))
    } else {
      mergeParams(hashBeforeNestedFragment)
    }
    mergeParams(nestedFragment)
  }

  return params
}

export async function ensureAuthUser() {
  if (!supabase) return null
  if (hasPendingEmailAuthCallback()) return null

  return getExistingAuthUserId()
}

export async function getExistingAuthUserId() {
  if (!supabase) return null
  if (hasPendingEmailAuthCallback()) return null

  const { data: sessionData } = await supabase.auth.getSession()
  const user = sessionData?.session?.user
  if (user && !isAnonymousUser(user)) {
    currentUserId = user.id
    return currentUserId
  }
  currentUserId = null
  return null
}
