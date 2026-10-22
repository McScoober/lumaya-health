function envFlag(name, fallback) {
  const value = import.meta.env?.[`VITE_FEATURE_${name}`]
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

function developmentOverrides() {
  if (import.meta.env?.PROD || typeof window === 'undefined') return new Set()
  return new Set(new URLSearchParams(window.location.search).get('ff')?.split(',').filter(Boolean) || [])
}

const overrides = developmentOverrides()

function feature(name, fallback) {
  return overrides.has(name.toLowerCase()) || envFlag(name, fallback)
}

export const features = Object.freeze({
  food: feature('FOOD', true),
  routeSummary: feature('ROUTE_SUMMARY', true),
  routeCare: feature('ROUTE_CARE', true),
  routeCareReviewed: feature('ROUTE_CARE_REVIEWED', false),
  periodicCheckins: feature('PERIODIC_CHECKINS', false),
  history: feature('HISTORY', false),
  compoundFlags: feature('COMPOUND_FLAGS', false),
})
