import { clearLegacyRoutePreferences, hasLegacyRoutePreferences, readRoutePreferences } from './routePreferences.js'
import { migrateStoreV3 } from '../state/storeMigration.js'

const GUEST_TRACKER_KEY = 'maisie.guestTracker.v3'
const LEGACY_GUEST_TRACKER_KEYS = ['maisie.guestTracker.v2', 'maisie.guestTracker.v1']

function guestSnapshot(state) {
  return {
    version: 3,
    onboarded: Boolean(state.onboarded),
    step: state.step,
    identity: state.identity,
    profile: state.profile,
    answers: state.answers,
    dailyLogs: state.dailyLogs,
    periodLogs: state.periodLogs,
    progressiveQIndex: state.progressiveQIndex,
    streak: state.streak,
    lastCheckinDate: state.lastCheckinDate,
    messages: state.messages,
    advisorRequests: state.advisorRequests,
    checkinHistory: state.checkinHistory,
    notifyPrefs: state.notifyPrefs,
    tracking: state.tracking,
    nutrition: state.nutrition,
    history: state.history,
    periodicCheckins: state.periodicCheckins,
    tipHistory: state.tipHistory,
    checklists: state.checklists,
    routePreferences: state.routePreferences,
  }
}

export function saveGuestTracker(storage, state) {
  if (!storage || !state || state.accountId) return false
  storage.setItem(GUEST_TRACKER_KEY, JSON.stringify(guestSnapshot(migrateStoreV3(state))))
  for (const key of LEGACY_GUEST_TRACKER_KEYS) storage.removeItem(key)
  clearLegacyRoutePreferences(storage)
  return true
}

export function readGuestTracker(storage) {
  if (!storage) return null
  try {
    const sourceKey = [GUEST_TRACKER_KEY, ...LEGACY_GUEST_TRACKER_KEYS].find((key) => storage.getItem(key))
    if (!sourceKey) return null
    const saved = JSON.parse(storage.getItem(sourceKey) || 'null')
    if (!saved) return null
    const migrated = migrateStoreV3(saved, hasLegacyRoutePreferences(storage)
      ? { routePreferences: readRoutePreferences(storage) }
      : undefined)
    storage.setItem(GUEST_TRACKER_KEY, JSON.stringify(guestSnapshot(migrated)))
    for (const key of LEGACY_GUEST_TRACKER_KEYS) storage.removeItem(key)
    clearLegacyRoutePreferences(storage)
    return migrated
  } catch {
    storage.removeItem(GUEST_TRACKER_KEY)
    for (const key of LEGACY_GUEST_TRACKER_KEYS) storage.removeItem(key)
    return null
  }
}

export function clearGuestTracker(storage) {
  storage?.removeItem(GUEST_TRACKER_KEY)
  for (const key of LEGACY_GUEST_TRACKER_KEYS) storage?.removeItem(key)
  clearLegacyRoutePreferences(storage)
}
