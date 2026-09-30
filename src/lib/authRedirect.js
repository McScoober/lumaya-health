export function implicitAuthCallbackUrl(location) {
  if (!location?.hash?.startsWith('#') || location.pathname === '/auth/callback') return null

  const params = new URLSearchParams(location.hash.slice(1))
  const hasSession = Boolean(params.get('access_token') && params.get('refresh_token'))
  const hasAuthError = Boolean(params.get('error') || params.get('error_code') || params.get('error_description'))
  if (!hasSession && !hasAuthError) return null

  return `/auth/callback${location.search || ''}${location.hash}`
}

export function buildAuthRedirectUrl(origin, next = '/home', useHashRouter = false) {
  const callbackPath = useHashRouter ? '/#/auth/callback' : '/auth/callback'
  const callbackUrl = `${origin}${callbackPath}`

  return next === '/home'
    ? callbackUrl
    : `${callbackUrl}?next=${encodeURIComponent(next)}`
}
