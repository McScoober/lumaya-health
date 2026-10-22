const GUEST_TRACKER_KEY = 'maisie.guestTracker.v3'

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
  }
}

export function saveGuestTracker(storage, state) {
  if (!storage || !state || state.accountId) return false
  storage.setItem(GUEST_TRACKER_KEY, JSON.stringify(guestSnapshot(state)))
  return true
}

export function readGuestTracker(storage) {
  if (!storage) return null
  try {
    const saved = JSON.parse(storage.getItem(GUEST_TRACKER_KEY) || 'null')
    return saved?.version === 3 ? saved : null
  } catch {
    storage.removeItem(GUEST_TRACKER_KEY)
    return null
  }
}

export function clearGuestTracker(storage) {
  storage?.removeItem(GUEST_TRACKER_KEY)
}
