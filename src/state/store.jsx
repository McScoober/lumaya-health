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
import { addDays, buildCycleModel, dateKeyLocal, diffDays, fullCycleCount, hasThreeFullCycles } from '../engine/cyclePredictor.js'
import { isSupabaseConfigured, ensureAuthUser, getExistingAuthUserId } from '../lib/supabase.js'
import { pullFromSupabase, pushToSupabase } from '../lib/sync.js'

const IDENTITY_KEY = 'maisie.identity'
const HEALTH_PREFIX = 'maisie.health.' // + userId
const LEGACY_STORAGE_PREFIX = ['lu', 'maya'].join('')
const LEGACY_IDENTITY_KEY = `${LEGACY_STORAGE_PREFIX}.identity`
const LEGACY_HEALTH_PREFIX = `${LEGACY_STORAGE_PREFIX}.health.` // + userId

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
      sleep: null,
      sport: '',
      onBirthControl: false,
    },
    answers: {},
    result: null, // last scoring result
    pendingTier2: [], // stored Tier 2 rule ids awaiting confirmation (8.4)
    confirmedTier2: [],
    progressiveQIndex: 0, // how many deferred check-in Qs have been answered
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
        status: 'confirmed',
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

function estimatedPeriodLength(periodLogs = {}) {
  const periodKeys = Object.entries(periodLogs)
    .filter(([, log]) => log?.period === true)
    .map(([key]) => key)
    .sort()

  if (periodKeys.length === 0) return 5

  const runs = []
  let currentRun = [periodKeys[0]]

  for (let i = 1; i < periodKeys.length; i++) {
    const prev = parseCheckinDate(periodKeys[i - 1])
    const current = parseCheckinDate(periodKeys[i])
    if (prev && current && diffDays(current, prev) === 1) {
      currentRun.push(periodKeys[i])
    } else {
      runs.push(currentRun)
      currentRun = [periodKeys[i]]
    }
  }
  runs.push(currentRun)

  const average = runs.reduce((sum, run) => sum + run.length, 0) / runs.length
  return Math.max(3, Math.min(7, Math.round(average || 5)))
}

function hasMeaningfulPeriodFields(log = {}) {
  const { period, periodStart, periodPromptAnswered, source, status, estimatedFrom, ...rest } = log
  return Object.keys(rest).length > 0
}

function clearPossibleDaysFromStart(periodLogs = {}, startKey) {
  const next = { ...periodLogs }
  Object.entries(next).forEach(([key, log]) => {
    if (log?.status !== 'possible' || log?.estimatedFrom !== startKey) return
    if (hasMeaningfulPeriodFields(log)) {
      const { period, periodStart, source, status, estimatedFrom, ...rest } = log
      next[key] = rest
    } else {
      delete next[key]
    }
  })
  return next
}

function addPossiblePeriodDays(periodLogs = {}, startKey) {
  const startDate = parseCheckinDate(startKey)
  if (!startDate) return periodLogs

  const next = { ...periodLogs }
  const possibleLength = estimatedPeriodLength(next)
  for (let i = 1; i < possibleLength; i++) {
    const key = dateKeyLocal(addDays(startDate, i))
    const existing = next[key] || {}
    if (existing.period === true || existing.status === 'not_period') continue
    next[key] = {
      ...existing,
      period: false,
      periodStart: false,
      status: 'possible',
      source: 'estimated',
      estimatedFrom: startKey,
    }
  }
  return next
}

function normalizeFlagId(id) {
  return id
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
  const {
    theme: _savedTheme,
    themeChoice: _savedThemeChoice,
    cycleNickname: _savedCycleNickname,
    ...profile
  } = payload.profile || {}
  let dailyLogs = stripPeriodFieldsFromDailyLogs(payload.dailyLogs || {})
  let periodLogs = { ...(payload.periodLogs || {}), ...extractPeriodLogsFromDailyLogs(payload.dailyLogs || {}) }

  if (answers.lastStart && answers.lastStart !== 'unknown') {
    periodLogs = removeOnboardingPeriodLogs(periodLogs)
    periodLogs = seedPeriodLogsFromAnswers(periodLogs, answers)
  }

  return {
    ...payload,
    profile,
    result: normalizeResult(payload.result),
    dailyLogs,
    periodLogs,
    pendingTier2: (payload.pendingTier2 || []).map(normalizeFlagId),
    confirmedTier2: (payload.confirmedTier2 || []).map(normalizeFlagId),
  }
}

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
      const {
        theme: _theme,
        themeChoice: _themeChoice,
        cycleNickname: _cycleNickname,
        ...payload
      } = action.payload || {}
      return { ...state, profile: { ...state.profile, ...payload } }
    }

    case 'SET_IDENTITY':
      return { ...state, identity: { ...state.identity, ...action.payload } }

    case 'SAVE_CHECKIN': {
      const answers = action.answers
      const onBC = answers.birthControl === 'Yes'
      const today = dateKeyLocal()
      const periodLogs = seedPeriodLogsFromAnswers(removeOnboardingPeriodLogs(state.periodLogs), answers)
      const result = scoreCheckIn(answers, {
        priorTier2Ids: state.confirmedTier2,
        observedFullCycleCount: fullCycleCount(periodLogs),
      })
      const history = [...state.checkinHistory, { date: today, level: result.level }]
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

    case 'ANSWER_PROGRESSIVE': {
      // Saves a single deferred onboarding answer and advances the progress index.
      const updatedAnswers = { ...state.answers, [action.key]: action.value }
      const onBC = updatedAnswers.birthControl === 'Yes'
      // Re-score with the new answer so result stays current.
      const updatedResult = scoreCheckIn(updatedAnswers, {
        priorTier2Ids: state.confirmedTier2,
        observedFullCycleCount: fullCycleCount(state.periodLogs),
      })
      return {
        ...state,
        answers: updatedAnswers,
        profile: { ...state.profile, onBirthControl: onBC },
        result: updatedResult,
        progressiveQIndex: state.progressiveQIndex + 1,
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
      const { status: _status, estimatedFrom: _estimatedFrom, ...cleanPrev } = prev
      const source = action.source || 'manual'
      let periodLogs = clearPossibleDaysFromStart(state.periodLogs, dateKey)
      const prevKey = dateKeyLocal(addDays(parseCheckinDate(dateKey), -1))
      const prevConfirmed = periodLogs[prevKey]?.period === true

      periodLogs = {
        ...periodLogs,
        [dateKey]: {
          ...(period === undefined ? prev : cleanPrev),
          ...(period !== undefined ? { period } : {}),
          ...(period === true ? {
            periodStart: !prevConfirmed,
            source,
            status: 'confirmed',
          } : {}),
          ...(period === false ? {
            periodStart: false,
            source,
            status: 'not_period',
          } : {}),
          ...(periodPromptAnswered !== undefined ? { periodPromptAnswered } : {}),
        },
      }

      if (period === true) {
        periodLogs = addPossiblePeriodDays(periodLogs, dateKey)
      }

      let next = { ...state, periodLogs }

      // Passive Tier 2 confirmation: when a new period is logged on a later
      // date than onboarding, re-run the relevant rules against the user's data.
      const onboardDate = state.checkinHistory[0]?.date
      const startsNewCycle = period === true && onboardDate && dateKey > onboardDate
      if (startsNewCycle && state.pendingTier2.length > 0) {
        const observedFullCycleCount = fullCycleCount(periodLogs)
        const rescored = scoreCheckIn(state.answers, {
          priorTier2Ids: state.pendingTier2,
          observedFullCycleCount,
        })
        const nowConfirmed = rescored.flags
          .filter((f) => f.tier === 2 && state.pendingTier2.includes(f.id))
          .map((f) => f.id)
        if (nowConfirmed.length > 0) {
          const confirmedTier2 = Array.from(new Set([...state.confirmedTier2, ...nowConfirmed]))
          const result = scoreCheckIn(state.answers, {
            priorTier2Ids: confirmedTier2,
            observedFullCycleCount,
          })
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
                body: "A pattern we were quietly watching showed up again this cycle. It might be worth talking to a Maisie advisor, no pressure, whenever you're ready.",
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
      progressiveQIndex: state.progressiveQIndex,
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

function hasEntries(value) {
  return Object.keys(value || {}).length > 0
}

function hasSupabaseSyncableData(state) {
  const identity = state.identity || {}
  const profile = state.profile || {}
  return Boolean(
    state.onboarded ||
      identity.name?.trim() ||
      identity.email?.trim() ||
      identity.ageBand ||
      identity.consentedAt ||
      identity.privacyAckAt ||
      identity.parentEmail?.trim() ||
      identity.dashboardActive ||
      identity.supportContact ||
      profile.studentAthlete !== null ||
      profile.sleep !== null ||
      profile.sport?.trim() ||
      profile.onBirthControl ||
      hasEntries(state.answers) ||
      state.result ||
      state.pendingTier2?.length > 0 ||
      state.confirmedTier2?.length > 0 ||
      state.progressiveQIndex > 0 ||
      hasEntries(state.dailyLogs) ||
      hasEntries(state.periodLogs) ||
      state.streak > 0 ||
      state.lastCheckinDate ||
      state.messages?.length > 0 ||
      state.advisorRequests?.length > 0 ||
      state.checkinHistory?.length > 0 ||
      state.notifyPrefs?.periodCheckin === false ||
      state.notifyPrefs?.phaseTips === false
  )
}

function hydrate() {
  try {
    const idRaw = localStorage.getItem(IDENTITY_KEY) || localStorage.getItem(LEGACY_IDENTITY_KEY)
    if (!idRaw) return null
    const identity = JSON.parse(idRaw)
    const userId = identity.userId
    const healthRaw = localStorage.getItem(HEALTH_PREFIX + userId) || localStorage.getItem(LEGACY_HEALTH_PREFIX + userId)
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

  // On mount: recover an existing Supabase session and pull its rows. Do not
  // create anonymous auth users for visitors who only open the app.
  useEffect(() => {
    let cancelled = false
    if (!isSupabaseConfigured) return
    ;(async () => {
      const uidFromAuth = await getExistingAuthUserId()
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
    if (isSupabaseConfigured && syncReady.current && hasSupabaseSyncableData(state)) {
      clearTimeout(pushTimer.current)
      pushTimer.current = setTimeout(async () => {
        const uid = authUserId.current || await ensureAuthUser()
        if (!uid) return
        authUserId.current = uid
        pushToSupabase(uid, { ...state, userId: uid })
      }, 700)
    }
  }, [state])

  const cycleModel = useMemo(() => {
    const lastStart = latestPeriodStartFromLogs(state.periodLogs) || state.answers.lastStart
    return buildCycleModel({
      lastStart: lastStart && lastStart !== 'unknown' ? lastStart : null,
      cycleLength: state.result?.cycleLength,
      onBirthControl: state.profile.onBirthControl,
      predictionsReady: hasThreeFullCycles(state.periodLogs),
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
