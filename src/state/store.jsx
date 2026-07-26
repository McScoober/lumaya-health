// ============================================================
// App state + persistence (TRD Section 14.5, identity/data separation)
//
// Identity-linked data (name, email, contacts, consent) is stored under a
// separate key from anonymized health-response data (answers, flags, scores,
// daily logs), joined only by an opaque userId, never by name or email.
// This mirrors the Supabase two-schema design without a real backend.
// ============================================================

import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import { scoreCheckIn } from '../engine/scoring.js'
import { addDays, buildCycleModel, dateKeyLocal, diffDays } from '../engine/cyclePredictor.js'
import { isSupabaseConfigured, ensureAuthUser } from '../lib/supabase.js'
import { pullFromSupabase, pushToSupabase } from '../lib/sync.js'

const IDENTITY_KEY = 'lumaya.identity'
const HEALTH_PREFIX = 'lumaya.health.' // + userId

function uid() {
  // Opaque internal user id (UUID-ish). Not derived from name/email.
  if (crypto?.randomUUID) return crypto.randomUUID()
  return 'u-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ---- default state ----------------------------------------
function freshState() {
  const userId = uid()
  return {
    userId,
    onboarded: false,
    step: 'welcome', // onboarding pointer

    // IDENTITY schema (locked-down in production)
    identity: {
      name: '',
      email: '',
      ageBand: null, // '13'..'17' | '18+'
      isMinor: false,
      consentedAt: null,
      privacyAckAt: null,
      parentEmail: '',
      // Parent / support dashboard
      dashboardActive: false,
      transparencyMode: 'full', // full | flags | digest
      supportContact: null, // { name, email } for 18+
    },

    // HEALTH schema (keyed by userId, no PII)
    profile: {
      studentAthlete: null,
      theme: 'calm',
      themeChoice: null,
      sleep: null,
      sport: '',
      cycleNickname: '',
      onBirthControl: false,
    },
    answers: {},
    result: null, // last scoring result
    pendingTier2: [], // stored Tier 2 rule ids awaiting confirmation (8.4)
    confirmedTier2: [],
    dailyLogs: {}, // 'YYYY-MM-DD' -> completed daily check-ins
    periodLogs: {}, // 'YYYY-MM-DD' -> period-only tracking
    streak: 0,
    lastCheckinDate: null,
    messages: [], // inbox
    advisorRequests: [],
    checkinHistory: [], // [{ date, level }]
    notifyPrefs: { periodCheckin: true, phaseTips: true },
  }
}

function parseCheckinDate(value) {
  if (!value || value === 'unknown') return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function seedPeriodLogsFromAnswers(periodLogs, answers) {
  const lastStart = parseCheckinDate(answers.lastStart)
  const lastEnd = parseCheckinDate(answers.lastEnd)
  const prevStart = parseCheckinDate(answers.prevStart)
  const next = { ...periodLogs }

  function seedRange(start, span, source) {
    if (!start) return
    for (let i = 0; i <= span; i++) {
      const key = dateKeyLocal(addDays(start, i))
      const existing = next[key] || {}
      const existingSource = String(existing.source || '')
      next[key] = {
        ...existing,
        period: true,
        periodStart: existing.periodStart === true || i === 0,
        source: existingSource && !existingSource.startsWith('onboarding') ? existing.source : source,
      }
    }
  }

  if (!lastStart) return periodLogs

  const safeLastEnd = lastEnd && diffDays(lastEnd, lastStart) >= 0 ? lastEnd : lastStart
  const lastSpan = Math.min(diffDays(safeLastEnd, lastStart), 9)
  seedRange(prevStart, lastSpan, 'onboarding-prev')
  seedRange(lastStart, lastSpan, 'onboarding-last')

  return next
}

function removeOnboardingPeriodLogs(periodLogs = {}) {
  return Object.fromEntries(
    Object.entries(periodLogs).filter(([, log]) => !String(log?.source || '').startsWith('onboarding')),
  )
}

function latestPeriodStartFromLogs(periodLogs = {}) {
  const periodKeys = Object.entries(periodLogs)
    .filter(([, log]) => log?.period === true)
    .map(([key]) => key)
    .sort()

  if (periodKeys.length === 0) return null

  const periodSet = new Set(periodKeys)
  const explicitStarts = Object.entries(periodLogs)
    .filter(([, log]) => log?.period === true && log?.periodStart === true)
    .map(([key]) => key)
    .sort()

  if (explicitStarts.length > 0) return explicitStarts[explicitStarts.length - 1]

  const derivedStarts = periodKeys.filter((key) => {
    const prevKey = dateKeyLocal(addDays(parseCheckinDate(key), -1))
    return !periodSet.has(prevKey)
  })

  return derivedStarts[derivedStarts.length - 1] || periodKeys[0]
}

function normalizeFlagId(id) {
  return id === `P${'COS'}-01` ? 'PMOS-01' : id
}

function extractPeriodLogsFromDailyLogs(dailyLogs = {}) {
  return Object.fromEntries(
    Object.entries(dailyLogs)
      .filter(([, log]) => log?.period !== undefined || log?.periodStart !== undefined || log?.periodPromptAnswered !== undefined)
      .map(([key, log]) => [
        key,
        {
          ...(log.period !== undefined ? { period: log.period } : {}),
          ...(log.periodStart !== undefined ? { periodStart: log.periodStart } : {}),
          ...(log.periodPromptAnswered !== undefined ? { periodPromptAnswered: log.periodPromptAnswered } : {}),
          ...(log.source ? { source: log.source } : {}),
        },
      ]),
  )
}

function stripPeriodFieldsFromDailyLogs(dailyLogs = {}) {
  return Object.fromEntries(
    Object.entries(dailyLogs).flatMap(([key, log]) => {
      const { period, periodStart, periodPromptAnswered, source, ...dailyLog } = log
      return Object.keys(dailyLog).length > 0 ? [[key, dailyLog]] : []
    }),
  )
}

function normalizeResult(result) {
  if (!result) return result
  return {
    ...result,
    flags: (result.flags || []).map((flag) => ({ ...flag, id: normalizeFlagId(flag.id) })),
    pendingTier2: (result.pendingTier2 || []).map(normalizeFlagId),
  }
}

function normalizeSavedHealth(payload = {}) {
  const answers = payload.answers || {}
  let dailyLogs = stripPeriodFieldsFromDailyLogs(payload.dailyLogs || {})
  let periodLogs = { ...(payload.periodLogs || {}), ...extractPeriodLogsFromDailyLogs(payload.dailyLogs || {}) }

  if (answers.lastStart && answers.lastStart !== 'unknown') {
    periodLogs = removeOnboardingPeriodLogs(periodLogs)
    periodLogs = seedPeriodLogsFromAnswers(periodLogs, answers)
  }

  return {
    ...payload,
    result: normalizeResult(payload.result),
    dailyLogs,
    periodLogs,
    pendingTier2: (payload.pendingTier2 || []).map(normalizeFlagId),
    confirmedTier2: (payload.confirmedTier2 || []).map(normalizeFlagId),
  }
}

// ---- theme mapping ----------------------------------------
export const THEME_MAP = {
  'Calm pastels': 'calm',
  'Bold & bright': 'bold',
  'Minimal & clean': 'minimal',
  'Surprise me': 'surprise',
}
const SURPRISE_POOL = ['calm', 'bold', 'minimal']

// ---- reducer ----------------------------------------------
function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...normalizeSavedHealth(action.payload) }

    case 'SET_STEP':
      return { ...state, step: action.step }

    case 'SET_AGE': {
      const band = action.band
      const isMinor = band !== '18+'
      return {
        ...state,
        identity: { ...state.identity, ageBand: band, isMinor },
        answers: { ...state.answers, age: band },
      }
    }

    case 'SET_CONSENT':
      return {
        ...state,
        identity: {
          ...state.identity,
          ...(action.payload || {}),
          consentedAt: state.identity.isMinor ? new Date().toISOString() : state.identity.consentedAt,
          privacyAckAt: new Date().toISOString(),
        },
      }

    case 'SET_PROFILE': {
      const merged = { ...state.profile, ...action.payload }
      // Resolve theme. Surprise me picks one deterministic theme per user.
      if (action.payload.themeChoice) {
        const mapped = THEME_MAP[action.payload.themeChoice]
        merged.theme =
          mapped === 'surprise'
            ? SURPRISE_POOL[state.userId.charCodeAt(0) % SURPRISE_POOL.length]
            : mapped
      }
      return { ...state, profile: merged }
    }

    case 'SET_IDENTITY':
      return { ...state, identity: { ...state.identity, ...action.payload } }

    case 'SAVE_CHECKIN': {
      const answers = action.answers
      const onBC = answers.birthControl === 'Yes'
      const result = scoreCheckIn(answers, { priorTier2Ids: state.confirmedTier2 })
      const today = dateKeyLocal()
      const history = [...state.checkinHistory, { date: today, level: result.level }]
      const periodLogs = seedPeriodLogsFromAnswers(removeOnboardingPeriodLogs(state.periodLogs), answers)
      return {
        ...state,
        answers,
        profile: { ...state.profile, onBirthControl: onBC },
        result,
        periodLogs,
        pendingTier2: Array.from(new Set([...state.pendingTier2, ...result.pendingTier2])),
        checkinHistory: history,
        onboarded: true,
        step: 'result',
      }
    }

    case 'LOG_DAILY': {
      const { dateKey, mood, vibe, vibeLabel, symptoms, pain, impact } = action
      const prev = state.dailyLogs[dateKey] || {}
      const dailyLogs = {
        ...state.dailyLogs,
        [dateKey]: {
          ...prev,
          checkinCompleted: true,
          ...(mood !== undefined ? { mood } : {}),
          ...(vibe !== undefined ? { vibe } : {}),
          ...(vibeLabel !== undefined ? { vibeLabel } : {}),
          ...(symptoms !== undefined ? { symptoms } : {}),
          ...(pain !== undefined ? { pain } : {}),
          ...(impact !== undefined ? { impact } : {}),
        },
      }

      // streak: consecutive days with any completed check-in
      let streak = state.streak
      let lastCheckinDate = state.lastCheckinDate
      if (state.lastCheckinDate !== dateKey) {
        const yesterday = dateKeyLocal(new Date(Date.now() - 86400000))
        streak = state.lastCheckinDate === yesterday ? state.streak + 1 : 1
        lastCheckinDate = dateKey
      }

      let next = { ...state, dailyLogs, streak, lastCheckinDate }

      return next
    }

    case 'UPDATE_PERIOD_STATUS': {
      const { dateKey, period, periodPromptAnswered } = action
      const prev = state.periodLogs[dateKey] || {}
      const periodLogs = {
        ...state.periodLogs,
        [dateKey]: {
          ...prev,
          ...(period !== undefined ? { period } : {}),
          ...(period === true ? { periodStart: true, source: 'manual' } : {}),
          ...(periodPromptAnswered !== undefined ? { periodPromptAnswered } : {}),
        },
      }

      let next = { ...state, periodLogs }

      // Passive Tier 2 confirmation: when a new period is logged on a later
      // date than onboarding, re-run the relevant rules against the user's data.
      const onboardDate = state.checkinHistory[0]?.date
      const startsNewCycle = period === true && onboardDate && dateKey > onboardDate
      if (startsNewCycle && state.pendingTier2.length > 0) {
        const rescored = scoreCheckIn(state.answers, { priorTier2Ids: state.pendingTier2 })
        const nowConfirmed = rescored.flags
          .filter((f) => f.tier === 2 && state.pendingTier2.includes(f.id))
          .map((f) => f.id)
        if (nowConfirmed.length > 0) {
          const confirmedTier2 = Array.from(new Set([...state.confirmedTier2, ...nowConfirmed]))
          const result = scoreCheckIn(state.answers, { priorTier2Ids: confirmedTier2 })
          next = {
            ...next,
            confirmedTier2,
            pendingTier2: state.pendingTier2.filter((id) => !nowConfirmed.includes(id)),
            result,
            messages: [
              {
                id: 'conf-' + Date.now(),
                at: new Date().toISOString(),
                channel: 'system',
                title: 'We noticed the same pattern again',
                body: "A pattern we were quietly watching showed up again this cycle. It might be worth talking to a Lumaya advisor, no pressure, whenever you're ready.",
                read: false,
                cta: '/advisor',
              },
              ...state.messages,
            ],
          }
        }
      }
      return next
    }

    case 'ADD_MESSAGE':
      return { ...state, messages: [action.message, ...state.messages] }

    case 'MARK_MESSAGES_READ':
      return { ...state, messages: state.messages.map((m) => ({ ...m, read: true })) }

    case 'CONNECT_ADVISOR': {
      const req = {
        id: uid(),
        at: new Date().toISOString(),
        level: state.result?.level,
        flagIds: (state.result?.flags || []).map((f) => f.id),
        status: 'submitted',
      }
      return { ...state, advisorRequests: [req, ...state.advisorRequests] }
    }

    case 'SET_TRANSPARENCY':
      return { ...state, identity: { ...state.identity, transparencyMode: action.mode } }

    case 'ACTIVATE_DASHBOARD':
      return { ...state, identity: { ...state.identity, dashboardActive: true, parentEmail: action.email ?? state.identity.parentEmail } }

    case 'DEACTIVATE_DASHBOARD':
      return { ...state, identity: { ...state.identity, dashboardActive: false } }

    case 'INVITE_SUPPORT':
      return { ...state, identity: { ...state.identity, supportContact: action.contact, dashboardActive: true } }

    case 'REVOKE_SUPPORT':
      return { ...state, identity: { ...state.identity, supportContact: null, dashboardActive: false } }

    case 'SET_NOTIFY':
      return { ...state, notifyPrefs: { ...state.notifyPrefs, ...action.payload } }

    case 'RESET':
      return freshState()

    default:
      return state
  }
}

// ---- persistence ------------------------------------------
function persist(state) {
  try {
    // Identity schema includes join key (userId) only.
    const identity = { userId: state.userId, ...state.identity }
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity))

    // Health schema is keyed by userId, with no name/email columns.
    const health = {
      onboarded: state.onboarded,
      step: state.step,
      profile: state.profile,
      answers: state.answers,
      result: state.result,
      pendingTier2: state.pendingTier2,
      confirmedTier2: state.confirmedTier2,
      dailyLogs: state.dailyLogs,
      periodLogs: state.periodLogs,
      streak: state.streak,
      lastCheckinDate: state.lastCheckinDate,
      messages: state.messages,
      advisorRequests: state.advisorRequests,
      checkinHistory: state.checkinHistory,
      notifyPrefs: state.notifyPrefs,
    }
    localStorage.setItem(HEALTH_PREFIX + state.userId, JSON.stringify(health))
  } catch (e) {
    /* storage full / disabled, non-fatal for the demo */
  }
}

function hydrate() {
  try {
    const idRaw = localStorage.getItem(IDENTITY_KEY)
    if (!idRaw) return null
    const identity = JSON.parse(idRaw)
    const userId = identity.userId
    const healthRaw = localStorage.getItem(HEALTH_PREFIX + userId)
    const health = healthRaw ? JSON.parse(healthRaw) : {}
    const { userId: _u, ...identityRest } = identity
    return {
      userId,
      identity: { ...freshState().identity, ...identityRest },
      ...health,
    }
  } catch (e) {
    return null
  }
}

// ---- context ----------------------------------------------
const StoreCtx = createContext(null)

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const restored = hydrate()
    return restored ? { ...freshState(), ...normalizeSavedHealth(restored) } : freshState()
  })

  // Track the Supabase user id + whether the initial pull has finished, so we
  // don't push local (possibly empty) state over server data before hydrating.
  const authUserId = useRef(null)
  const syncReady = useRef(!isSupabaseConfigured) // if unconfigured, "ready" immediately
  const pushTimer = useRef(null)

  // On mount: sign in anonymously and pull this user's rows from Supabase.
  useEffect(() => {
    let cancelled = false
    if (!isSupabaseConfigured) return
    ;(async () => {
      const uidFromAuth = await ensureAuthUser()
      if (cancelled || !uidFromAuth) {
        syncReady.current = true
        return
      }
      authUserId.current = uidFromAuth
      const remote = await pullFromSupabase(uidFromAuth)
      if (cancelled) return
      if (remote) {
        // Server has data, so adopt it. Server is source of truth across devices.
        dispatch({ type: 'HYDRATE', payload: { ...remote, userId: uidFromAuth } })
      } else {
        // No server row yet, so key local state to the auth uid and push it up.
        dispatch({ type: 'HYDRATE', payload: { userId: uidFromAuth } })
      }
      syncReady.current = true
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Persist on every change: localStorage always; Supabase (debounced) when ready.
  useEffect(() => {
    persist(state)
    if (isSupabaseConfigured && syncReady.current && authUserId.current) {
      clearTimeout(pushTimer.current)
      pushTimer.current = setTimeout(() => {
        pushToSupabase(authUserId.current, state)
      }, 700)
    }
  }, [state])

  // Apply theme to <html> so CSS variables cascade.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.profile.theme || 'calm')
  }, [state.profile.theme])

  const cycleModel = useMemo(() => {
    const lastStart = latestPeriodStartFromLogs(state.periodLogs) || state.answers.lastStart
    return buildCycleModel({
      lastStart: lastStart && lastStart !== 'unknown' ? lastStart : null,
      cycleLength: state.result?.cycleLength,
      onBirthControl: state.profile.onBirthControl,
    })
  }, [state.periodLogs, state.answers.lastStart, state.result, state.profile.onBirthControl])

  const value = useMemo(() => ({ state, dispatch, cycleModel }), [state, cycleModel])
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
