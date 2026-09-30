const SIGNUP_DRAFT_KEY = 'maisie.pendingSignup.v1'
const SIGNUP_DRAFT_TTL_MS = 60 * 60 * 1000

function normalizedEmail(value) {
  return String(value || '').trim().toLowerCase()
}

function draftState(state) {
  return {
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

export function saveSignupDraft(storage, state, email, now = Date.now()) {
  if (!storage || !state?.onboarded || !normalizedEmail(email)) return false
  storage.setItem(SIGNUP_DRAFT_KEY, JSON.stringify({
    email: normalizedEmail(email),
    expiresAt: now + SIGNUP_DRAFT_TTL_MS,
    state: draftState(state),
  }))
  return true
}

export function readSignupDraft(storage, email, now = Date.now()) {
  if (!storage) return null
  try {
    const draft = JSON.parse(storage.getItem(SIGNUP_DRAFT_KEY) || 'null')
    if (!draft || draft.expiresAt <= now || draft.email !== normalizedEmail(email)) {
      storage.removeItem(SIGNUP_DRAFT_KEY)
      return null
    }
    return draft.state || null
  } catch {
    storage.removeItem(SIGNUP_DRAFT_KEY)
    return null
  }
}

export function clearSignupDraft(storage) {
  storage?.removeItem(SIGNUP_DRAFT_KEY)
}
