// ============================================================
// App state + persistence (TRD Section 14.5 — identity/data separation)
//
// Identity-linked data (name, email, contacts, consent) is stored under a
// separate key from anonymized health-response data (answers, flags, scores,
// daily logs), joined only by an opaque userId — never by name or email.
// This mirrors the Supabase two-schema design without a real backend.
// ============================================================

import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import { scoreCheckIn } from '../engine/scoring.js'
import { buildCycleModel } from '../engine/cyclePredictor.js'
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
    dailyLogs: {}, // 'YYYY-MM-DD' -> { period, mood }
    streak: 0,
    lastCheckinDate: null,
    messages: [], // inbox
    advisorRequests: [],
    checkinHistory: [], // [{ date, level }]
    notifyPrefs: { periodCheckin: true, phaseTips: true },
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
      return { ...state, ...action.payload }

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
      // resolve theme (Surprise me -> pick one, deterministic per user)
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
      const today = new Date().toISOString().slice(0, 10)
      const history = [...state.checkinHistory, { date: today, level: result.level }]
      return {
        ...state,
        answers,
        profile: { ...state.profile, onBirthControl: onBC },
        result,
        pendingTier2: Array.from(new Set([...state.pendingTier2, ...result.pendingTier2])),
        checkinHistory: history,
        onboarded: true,
        step: 'result',
      }
    }

    case 'LOG_DAILY': {
      const { dateKey, period, mood } = action
      const prev = state.dailyLogs[dateKey] || {}
      const dailyLogs = { ...state.dailyLogs, [dateKey]: { ...prev, ...(period !== undefined ? { period } : {}), ...(mood !== undefined ? { mood } : {}) } }

      // streak: consecutive days with any completed check-in
      let streak = state.streak
      let lastCheckinDate = state.lastCheckinDate
      if (state.lastCheckinDate !== dateKey) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
        streak = state.lastCheckinDate === yesterday ? state.streak + 1 : 1
        lastCheckinDate = dateKey
      }

      let next = { ...state, dailyLogs, streak, lastCheckinDate }

      // Passive Tier 2 confirmation (Section 8.4): when a NEW period is logged
      // on a later date than the onboarding check-in, re-run the relevant rules
      // against the user's data (no re-survey). If a pending flag fires again,
      // it's confirmed → escalate + trigger the advisor CTA.
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
                body: 'A pattern we were quietly watching showed up again this cycle. It might be worth talking to a Lumaya advisor — no pressure, whenever you’re ready.',
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
    // Identity schema — includes join key (userId) only.
    const identity = { userId: state.userId, ...state.identity }
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity))

    // Health schema — keyed by userId, no name/email columns.
    const health = {
      onboarded: state.onboarded,
      step: state.step,
      profile: state.profile,
      answers: state.answers,
      result: state.result,
      pendingTier2: state.pendingTier2,
      confirmedTier2: state.confirmedTier2,
      dailyLogs: state.dailyLogs,
      streak: state.streak,
      lastCheckinDate: state.lastCheckinDate,
      messages: state.messages,
      advisorRequests: state.advisorRequests,
      checkinHistory: state.checkinHistory,
      notifyPrefs: state.notifyPrefs,
    }
    localStorage.setItem(HEALTH_PREFIX + state.userId, JSON.stringify(health))
  } catch (e) {
    /* storage full / disabled — non-fatal for the demo */
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
    return restored ? { ...freshState(), ...restored } : freshState()
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
        // Server has data → adopt it (server is source of truth across devices).
        dispatch({ type: 'HYDRATE', payload: { ...remote, userId: uidFromAuth } })
      } else {
        // No server row yet → key local state to the auth uid and push it up.
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
    // lastStart: prefer the most recent logged period, else the check-in date.
    const loggedStarts = Object.entries(state.dailyLogs)
      .filter(([, v]) => v.period)
      .map(([k]) => k)
      .sort()
    const lastStart = loggedStarts.length ? loggedStarts[loggedStarts.length - 1] : state.answers.lastStart
    return buildCycleModel({
      lastStart: lastStart && lastStart !== 'unknown' ? lastStart : null,
      cycleLength: state.result?.cycleLength,
      onBirthControl: state.profile.onBirthControl,
    })
  }, [state.dailyLogs, state.answers.lastStart, state.result, state.profile.onBirthControl])

  const value = useMemo(() => ({ state, dispatch, cycleModel }), [state, cycleModel])
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
