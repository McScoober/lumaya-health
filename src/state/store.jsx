// In-memory tracker state. Signed-in observations are saved through authenticated RPCs.
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { addDays, buildCycleModel, dateKeyLocal, diffDays, periodStartKeys } from '../engine/cyclePredictor.js'
import { isSupabaseConfigured, supabase } from '../lib/supabase.js'
import { pullFromSupabase, pushToSupabase, clearSyncCache, loadHistoryPage, loadHistoryRange } from '../lib/sync.js'
import { clearLegacyHealthStorage, trackerRecords } from '../lib/trackerRecords.js'
import { clearSignupDraft, readSignupDraft } from '../lib/signupDraft.js'
import { bufferedMonthRange, monthCacheKey } from '../lib/historyWindow.js'
import { ageBandFromBirthMonthYear } from '../lib/age.js'
import { clearGuestTracker, readGuestTracker, saveGuestTracker } from '../lib/guestTracker.js'
import { clearLegacyRoutePreferences, hasLegacyRoutePreferences, readRoutePreferences } from '../lib/routePreferences.js'
import {
  accountStateFromGuest,
  DEFAULT_CHECKLISTS_V3,
  DEFAULT_HISTORY_V3,
  DEFAULT_NUTRITION_V3,
  DEFAULT_TRACKING_V3,
  migrateStoreV3,
  STORE_VERSION,
} from './storeMigration.js'

function uid() {
  // Opaque internal user id (UUID-ish). Not derived from name/email.
  if (crypto?.randomUUID) return crypto.randomUUID()
  return 'u-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const DEFAULT_NOTIFY_PREFS = { periodCheckin: true, phaseTips: true, reminderTime: '20:30' }

// ---- default state ----------------------------------------
export function freshState() {
  const userId = uid()
  return {
    version: STORE_VERSION,
    userId,
    accountId: null,
    onboarded: false,
    step: 'welcome', // onboarding pointer

    // IDENTITY schema (locked-down in production)
    identity: {
      name: '',
      email: '',
      ageBand: null, // '13'..'17' | '18+'
      birthMonth: null,
      birthYear: null,
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
      menarcheDate: null,
      periodProduct: null,
      goals: [],
    },
    tracking: { modules: { ...DEFAULT_TRACKING_V3.modules }, reminderTime: DEFAULT_TRACKING_V3.reminderTime },
    nutrition: { dietPattern: [...DEFAULT_NUTRITION_V3.dietPattern], foodTipsEnabled: DEFAULT_NUTRITION_V3.foodTipsEnabled },
    history: {
      conditions: [...DEFAULT_HISTORY_V3.conditions],
      family: [...DEFAULT_HISTORY_V3.family],
      medications: [...DEFAULT_HISTORY_V3.medications],
      consentedAt: null,
      shareInExport: { ...DEFAULT_HISTORY_V3.shareInExport },
    },
    periodicCheckins: [],
    checklists: { talkToDoctor: { ...DEFAULT_CHECKLISTS_V3.talkToDoctor } },
    routePreferences: {
      selectedQuestions: [], personalNote: '', nameMode: 'first',
      exportSections: { overview: true, cycles: true, pain: true, impact: true, mood: true, symptoms: true },
      privacyWarningSeen: false, lastExportedAt: null,
    },
    answers: {},
    result: null, // last scoring result
    pendingTier2: [], // stored Tier 2 rule ids awaiting confirmation (8.4)
    confirmedTier2: [],
    progressiveQIndex: 0, // how many deferred check-in Qs have been answered
    dailyLogs: {}, // 'YYYY-MM-DD' -> completed daily check-ins
    periodLogs: {}, // 'YYYY-MM-DD' -> period-only tracking
    cycles: [], // compact server-derived cycle summaries
    streak: 0,
    lastCheckinDate: null,
    messages: [], // inbox
    advisorRequests: [],
    checkinHistory: [], // [{ date, level }]
    notifyPrefs: { ...DEFAULT_NOTIFY_PREFS },
    tipHistory: {},
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
  seedRange(prevStart, 0, 'onboarding-prev')
  seedRange(lastStart, lastSpan, 'onboarding-last')

  return next
}

function removeOnboardingPeriodLogs(periodLogs = {}) {
  return Object.fromEntries(
    Object.entries(periodLogs).filter(([, log]) => !String(log?.source || '').startsWith('onboarding')),
  )
}

function latestPeriodStartFromLogs(periodLogs = {}) {
  return periodStartKeys(periodLogs).at(-1) || null
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

function confirmedPeriodRunStart(periodLogs = {}, dateKey) {
  const explicit = periodStartKeys(periodLogs).filter((key) => key <= dateKey).at(-1)
  if (explicit) return explicit
  return Object.keys(periodLogs).filter((key) => key <= dateKey && periodLogs[key].period === true).sort()[0] || dateKey
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
  const migrated = migrateStoreV3(payload)
  const answers = migrated.answers || {}
  const {
    theme: _savedTheme,
    themeChoice: _savedThemeChoice,
    cycleNickname: _savedCycleNickname,
    ...profile
  } = migrated.profile || {}
  let dailyLogs = stripPeriodFieldsFromDailyLogs(migrated.dailyLogs || {})
  let periodLogs = { ...(migrated.periodLogs || {}), ...extractPeriodLogsFromDailyLogs(migrated.dailyLogs || {}) }

  for (const start of periodStartKeys(periodLogs)) {
    periodLogs = addPossiblePeriodDays(periodLogs, start)
  }

  return {
    ...migrated,
    profile,
    notifyPrefs: { ...DEFAULT_NOTIFY_PREFS, ...(payload.notifyPrefs || {}) },
    tipHistory: payload.tipHistory || {},
    result: normalizeResult(payload.result),
    dailyLogs,
    periodLogs,
    pendingTier2: (payload.pendingTier2 || []).map(normalizeFlagId),
    confirmedTier2: (payload.confirmedTier2 || []).map(normalizeFlagId),
  }
}

// ---- reducer ----------------------------------------------
export function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return { ...freshState(), ...normalizeSavedHealth(action.payload), accountId: action.payload.userId }

    case 'MERGE_HISTORY': {
      const dailyLogs = { ...state.dailyLogs, ...(action.dailyLogs || {}) }
      let periodLogs = { ...state.periodLogs, ...(action.periodLogs || {}) }
      for (const start of periodStartKeys(periodLogs)) periodLogs = addPossiblePeriodDays(periodLogs, start)
      return { ...state, dailyLogs, periodLogs }
    }

    case 'SET_AUTH_USER':
      return {
        ...state,
        userId: action.userId || state.userId,
        accountId: action.userId,
        identity: {
          ...state.identity,
          ...(action.email ? { email: action.email } : {}),
        },
      }

    case 'SERVER_RESULT':
      return { ...state, result: action.result }

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

    case 'SET_BIRTH_MONTH_YEAR': {
      const birthMonth = Number(action.birthMonth)
      const birthYear = Number(action.birthYear)
      const ageBand = ageBandFromBirthMonthYear(birthMonth, birthYear)
      if (!ageBand) return state
      return {
        ...state,
        identity: {
          ...state.identity,
          birthMonth,
          birthYear,
          ageBand,
          isMinor: ageBand !== '18+',
        },
        answers: { ...state.answers, age: ageBand },
      }
    }

    case 'SET_CONSENT':
      return {
        ...state,
        identity: {
          ...state.identity,
          ...(action.payload || {}),
          consentedAt: state.identity.consentedAt,
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
      const savedModules = payload.trackingModules
      const modules = savedModules ? {
        ...state.tracking.modules,
        core: true,
        symptoms: savedModules.symptoms ?? state.tracking.modules.symptoms,
        sleep: savedModules.sleep ?? state.tracking.modules.sleep,
        skin: savedModules.skinHair ?? savedModules.skin ?? state.tracking.modules.skin,
        fuel: savedModules.food ?? savedModules.fuel ?? state.tracking.modules.fuel,
        movement: savedModules.movement ?? state.tracking.modules.movement,
        painRelief: savedModules.painRelief ?? state.tracking.modules.painRelief,
        bleedingDetail: savedModules.bleedingDetail ?? state.tracking.modules.bleedingDetail,
        moodPms: savedModules.moodPms ?? state.tracking.modules.moodPms,
        labs: savedModules.labs ?? state.tracking.modules.labs,
      } : state.tracking.modules
      const foodTipsEnabled = payload.hideFoodContent !== undefined
        ? payload.hideFoodContent !== true
        : state.nutrition.foodTipsEnabled
      const periodProductLabels = {
        Pads: 'pads', Tampons: 'tampons', Cup: 'cup', 'Period underwear': 'period-underwear', 'A mix': 'mix',
      }
      const periodProduct = payload.periodProducts
        ? periodProductLabels[payload.periodProducts[0]] || null
        : state.profile.periodProduct
      return {
        ...state,
        profile: { ...state.profile, ...payload, periodProduct },
        tracking: { ...state.tracking, modules },
        nutrition: {
          ...state.nutrition,
          ...(payload.dietPreferences ? { dietPattern: payload.dietPreferences } : {}),
          foodTipsEnabled,
        },
      }
    }

    case 'SET_IDENTITY':
      return { ...state, identity: { ...state.identity, ...action.payload } }

    case 'SAVE_CHECKIN': {
      const answers = action.answers
      const onBC = answers.birthControl === 'Yes'
      const periodLogs = seedPeriodLogsFromAnswers(removeOnboardingPeriodLogs(state.periodLogs), answers)
      const result = null
      const history = state.checkinHistory
      return {
        ...state,
        answers,
        profile: { ...state.profile, onBirthControl: onBC },
        result,
        periodLogs,
        pendingTier2: [],
        checkinHistory: history,
        onboarded: true,
        step: 'result',
      }
    }

    case 'ANSWER_PROGRESSIVE': {
      // Saves a single deferred onboarding answer and advances the progress index.
      const updatedAnswers = { ...state.answers, [action.key]: action.value }
      const onBC = updatedAnswers.birthControl === 'Yes'
      // Clear the old result until the server processes the changed answer.
      const updatedResult = null
      return {
        ...state,
        answers: updatedAnswers,
        profile: { ...state.profile, onBirthControl: onBC },
        result: updatedResult,
        progressiveQIndex: state.progressiveQIndex + 1,
      }
    }

    case 'LOG_DAILY': {
      const {
        dateKey, mood, vibe, vibeLabel, symptoms, pain, impact, clearPain,
        painTiming, reliefAttempted, reliefReceived, bleedingExperience, bleedingDuration,
        energy, sleepHours, rested, movement, fuel, bleeding, medicineTaken, medicineRelief,
        editedAt,
        clearOptionalDetails, clearOptionalFields = [],
      } = action
      const prev = state.dailyLogs[dateKey] || {}
      const wasLogged = prev.checkinCompleted === true ||
        prev.mood !== undefined ||
        prev.vibe !== undefined ||
        prev.symptoms !== undefined ||
        prev.pain !== undefined ||
        prev.impact !== undefined
      const savedEditedAt = editedAt || (wasLogged || dateKey !== dateKeyLocal() ? new Date().toISOString() : undefined)
      const updatedLog = {
        ...prev,
        checkinCompleted: true,
        ...(mood !== undefined ? { mood } : {}),
        ...(vibe !== undefined ? { vibe } : {}),
        ...(vibeLabel !== undefined ? { vibeLabel } : {}),
        ...(symptoms !== undefined ? { symptoms } : {}),
        ...(pain !== undefined ? { pain } : {}),
        ...(impact !== undefined ? { impact } : {}),
        ...(painTiming ? { painTiming } : {}),
        ...(reliefAttempted?.length ? { reliefAttempted } : {}),
        ...(reliefReceived ? { reliefReceived } : {}),
        ...(bleedingExperience ? { bleedingExperience } : {}),
        ...(bleedingDuration ? { bleedingDuration } : {}),
        ...(energy !== undefined ? { energy } : {}),
        ...(sleepHours ? { sleepHours } : {}),
        ...(rested ? { rested } : {}),
        ...(movement ? { movement } : {}),
        ...(fuel ? { fuel } : {}),
        ...(bleeding ? { bleeding } : {}),
        ...(medicineTaken !== undefined ? { medicineTaken } : {}),
        ...(medicineRelief ? { medicineRelief } : {}),
        ...(savedEditedAt ? { editedAt: savedEditedAt } : {}),
      }
      if (clearPain) delete updatedLog.pain
      const fieldsToClear = new Set(clearOptionalDetails
        ? ['painTiming', 'reliefAttempted', 'reliefReceived', 'bleedingExperience', 'bleedingDuration']
        : clearOptionalFields)
      if (fieldsToClear.has('painTiming') && !painTiming) delete updatedLog.painTiming
      if (fieldsToClear.has('reliefAttempted') && !reliefAttempted?.length) delete updatedLog.reliefAttempted
      if (fieldsToClear.has('reliefReceived') && (
        !reliefReceived || !reliefAttempted?.some((option) => !['Nothing yet', 'Not sure', 'Prefer not to say'].includes(option))
      )) {
        delete updatedLog.reliefReceived
      }
      if (fieldsToClear.has('bleedingExperience') && !bleedingExperience) delete updatedLog.bleedingExperience
      if (fieldsToClear.has('bleedingDuration') && !bleedingDuration) delete updatedLog.bleedingDuration
      for (const field of ['energy', 'sleepHours', 'rested', 'movement', 'fuel', 'bleeding', 'medicineTaken', 'medicineRelief']) {
        if (!fieldsToClear.has(field)) continue
        const value = { energy, sleepHours, rested, movement, fuel, bleeding, medicineTaken, medicineRelief }[field]
        const emptyObject = value && typeof value === 'object' && !Array.isArray(value) && Object.values(value).every((item) => (
          item === '' || item === null || item === undefined ||
          (typeof item === 'object' && Object.values(item).every((nested) => !nested))
        ))
        if (value === '' || value === null || value === undefined || emptyObject) delete updatedLog[field]
      }
      if (medicineTaken !== undefined || medicineRelief) {
        delete updatedLog.reliefAttempted
        delete updatedLog.reliefReceived
      }
      if (bleeding) delete updatedLog.bleedingExperience
      const dailyLogs = {
        ...state.dailyLogs,
        [dateKey]: updatedLog,
      }

      // streak: consecutive days with any completed check-in
      let streak = state.streak
      let lastCheckinDate = state.lastCheckinDate
      if (!wasLogged && state.lastCheckinDate !== dateKey) {
        const yesterday = dateKeyLocal(new Date(Date.now() - 86400000))
        streak = state.lastCheckinDate === yesterday ? state.streak + 1 : 1
        lastCheckinDate = dateKey
      }

      let next = { ...state, dailyLogs, streak, lastCheckinDate, result: null }

      return next
    }

    case 'UPDATE_PERIOD_STATUS': {
      const { dateKey, period, periodPromptAnswered, flow, editedAt } = action
      const prev = state.periodLogs[dateKey] || {}
      const savedEditedAt = editedAt || (Object.keys(prev).length > 0 || dateKey !== dateKeyLocal() ? new Date().toISOString() : undefined)
      const { status: _status, estimatedFrom: _estimatedFrom, ...cleanPrev } = prev
      const source = action.source || 'manual'
      let periodLogs = clearPossibleDaysFromStart(state.periodLogs, dateKey)

      const updatedPeriodLog = {
        ...(period === undefined ? prev : cleanPrev),
        ...(period !== undefined ? { period } : {}),
        ...(period === true ? {
          source,
          status: 'confirmed',
        } : {}),
        ...(period === false ? {
          periodStart: false,
          source,
          status: 'not_period',
        } : {}),
        ...(periodPromptAnswered !== undefined ? { periodPromptAnswered } : {}),
        ...(period === true && flow ? { flow } : {}),
        ...(savedEditedAt ? { editedAt: savedEditedAt } : {}),
      }
      if (period === false || flow === '') delete updatedPeriodLog.flow

      periodLogs = {
        ...periodLogs,
        [dateKey]: updatedPeriodLog,
      }

      if (period === true) {
        const runStartKey = confirmedPeriodRunStart(periodLogs, dateKey)
        periodLogs = addPossiblePeriodDays(clearPossibleDaysFromStart(periodLogs, runStartKey), runStartKey)
      }

      let next = {
        ...state,
        periodLogs,
        ...(period === true && state.answers.started === 'Not yet'
          ? { answers: { ...state.answers, started: 'Yes', lastStart: dateKey } }
          : {}),
      }

      // Refresh eligibility on additions and removals, without treating a new
      // period date as evidence that old symptom answers have recurred.
      if (period === undefined) return next
      const starts = periodStartKeys(periodLogs)
      const answers = {
        ...next.answers,
        lastStart: starts.at(-1) || undefined,
        prevStart: starts.at(-2) || undefined,
      }
      const result = null
      next = { ...next, answers, result, confirmedTier2: [], pendingTier2: [] }
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
      return {
        ...state,
        notifyPrefs: { ...state.notifyPrefs, ...action.payload },
        tracking: action.payload.reminderTime
          ? { ...state.tracking, reminderTime: action.payload.reminderTime }
          : state.tracking,
      }

    case 'SET_TRACKING': {
      const tracking = { ...state.tracking, ...action.payload, modules: { ...state.tracking.modules, ...(action.payload.modules || {}), core: true } }
      return {
        ...state,
        tracking,
        profile: {
          ...state.profile,
          trackingModules: {
            ...state.profile.trackingModules,
            core: true,
            symptoms: tracking.modules.symptoms,
            sleep: tracking.modules.sleep,
            skinHair: tracking.modules.skin,
            food: tracking.modules.fuel,
            movement: tracking.modules.movement,
            painRelief: tracking.modules.painRelief,
            bleedingDetail: tracking.modules.bleedingDetail,
            moodPms: tracking.modules.moodPms,
          },
          foodModule: tracking.modules.fuel,
        },
        notifyPrefs: action.payload.reminderTime
          ? { ...state.notifyPrefs, reminderTime: action.payload.reminderTime }
          : state.notifyPrefs,
      }
    }

    case 'SET_NUTRITION': {
      const nutrition = { ...state.nutrition, ...action.payload }
      return {
        ...state,
        nutrition,
        profile: {
          ...state.profile,
          dietPreferences: nutrition.dietPattern,
          hideFoodContent: nutrition.foodTipsEnabled === false,
        },
      }
    }

    case 'SET_HISTORY':
      return { ...state, history: { ...state.history, ...action.payload } }

    case 'ADD_PERIODIC_CHECKIN':
      return { ...state, periodicCheckins: [...state.periodicCheckins.filter((item) => item.id !== action.checkin.id), action.checkin] }

    case 'SET_ROUTE_PREFERENCES':
      return { ...state, routePreferences: { ...state.routePreferences, ...action.payload } }

    case 'SET_CHECKLISTS':
      return { ...state, checklists: { ...state.checklists, ...action.payload } }

    case 'RECORD_TIPS': {
      const ids = [...new Set(action.ids || [])].filter(Boolean)
      if (!action.dateKey || ids.length === 0) return state
      const entries = Object.entries({
        ...state.tipHistory,
        ...Object.fromEntries(ids.map((id) => [id, action.dateKey])),
      }).sort(([, left], [, right]) => right.localeCompare(left)).slice(0, 60)
      return { ...state, tipHistory: Object.fromEntries(entries) }
    }

    case 'RESET':
      return freshState()

    default:
      return state
  }
}

// Health history is held in memory. Authentication has its own SDK session store.
function isSupportOnlyRoute() {
  return typeof window !== 'undefined' && (
    window.location.pathname === '/parent' ||
    window.location.hash.startsWith('#/parent') ||
    window.location.href.includes('next=%2Fparent')
  )
}

const StoreCtx = createContext(null)

function initialState() {
  const base = freshState()
  if (typeof window === 'undefined') return base
  const saved = readGuestTracker(window.localStorage)
  return saved
    ? { ...base, ...normalizeSavedHealth(saved), accountId: null }
    : { ...base, ...normalizeSavedHealth(migrateStoreV3(base, { routePreferences: readRoutePreferences(window.localStorage) })) }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured)
  const [accountError, setAccountError] = useState('')
  const [syncStatus, setSyncStatus] = useState({ state: 'idle' })
  const [syncRetryNonce, setSyncRetryNonce] = useState(0)
  const [historyStatus, setHistoryStatus] = useState({ key: null, error: '' })
  const stateRef = useRef(state)
  stateRef.current = state
  const epoch = useRef(0)
  const readyAccount = useRef(null)
  const initializing = useRef(null)
  const saveQueue = useRef(Promise.resolve())
  const syncRetryTimer = useRef(null)
  const syncRetryAttempts = useRef(0)
  const loadedHistoryMonths = useRef(new Set())
  const historyRequests = useRef(new Map())

  useEffect(() => {
    // Old data is test data; explicitly excluded from the fresh-table rollout.
    clearLegacyHealthStorage(localStorage)
    if (!supabase) return
    let alive = true
    let scheduled
    async function adoptSession(session) {
      const user = session?.user
      const id = user && !user.is_anonymous ? user.id : null
      if (id && (readyAccount.current === id || initializing.current === id)) return
      const revision = ++epoch.current
      const previous = stateRef.current
      readyAccount.current = null
      initializing.current = id
      clearSyncCache()
      loadedHistoryMonths.current.clear()
      historyRequests.current.clear()
      setHistoryStatus({ key: null, error: '' })
      setAccountError('')
      setSyncStatus({ state: 'idle' })
      clearTimeout(syncRetryTimer.current)
      syncRetryAttempts.current = 0
      if (!id) {
        if (previous.accountId) dispatch({ type: 'RESET' })
        setAuthLoading(false)
        return
      }
      setAuthLoading(true)
      // An account switch must never retain the previous account's observations.
      if (previous.accountId && previous.accountId !== id) dispatch({ type: 'RESET' })
      try {
        const remote = await pullFromSupabase(id)
        if (!alive || revision !== epoch.current) return
        if (remote) {
          const hasLegacyRoute = hasLegacyRoutePreferences(localStorage)
          dispatch({
            type: 'HYDRATE',
            payload: hasLegacyRoute
              ? migrateStoreV3(remote, { routePreferences: readRoutePreferences(localStorage) })
              : remote,
          })
          if (hasLegacyRoute) clearLegacyRoutePreferences(localStorage)
        } else {
          const signupDraft = readSignupDraft(localStorage, user.email)
          if (!previous.accountId && previous.onboarded && !isSupportOnlyRoute()) {
            dispatch({ type: 'HYDRATE', payload: accountStateFromGuest(previous, id, user.email) })
          } else if (signupDraft && !isSupportOnlyRoute()) {
            dispatch({
              type: 'HYDRATE',
              payload: {
                ...signupDraft,
                userId: id,
                identity: { ...signupDraft.identity, email: user.email },
              },
            })
          } else {
            if (previous.accountId || isSupportOnlyRoute()) dispatch({ type: 'RESET' })
            dispatch({ type: 'SET_AUTH_USER', userId: id, email: user.email })
          }
        }
        readyAccount.current = id
      } catch {
        if (alive && revision === epoch.current) {
          dispatch({ type: 'RESET' })
          setAccountError('Your saved tracker could not be loaded. Please reload before continuing.')
        }
      } finally {
        if (alive && revision === epoch.current) {
          initializing.current = null
          setAuthLoading(false)
        }
      }
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      clearTimeout(scheduled)
      // Do not call Auth methods while its event callback holds the session lock.
      scheduled = setTimeout(() => adoptSession(session), 0)
    })
    return () => { alive = false; ++epoch.current; clearTimeout(scheduled); subscription.unsubscribe() }
  }, [])

  const retryAccountSync = useCallback(() => {
    clearTimeout(syncRetryTimer.current)
    setSyncRetryNonce((value) => value + 1)
  }, [])

  useEffect(() => {
    function retryWhenOnline() {
      if (readyAccount.current) retryAccountSync()
    }
    window.addEventListener('online', retryWhenOnline)
    return () => window.removeEventListener('online', retryWhenOnline)
  }, [retryAccountSync])

  useEffect(() => () => clearTimeout(syncRetryTimer.current), [])

  const loadHistoryMonth = useCallback(async (month) => {
    const userId = stateRef.current.accountId
    if (!userId || !(month instanceof Date) || Number.isNaN(month.getTime())) return
    const key = monthCacheKey(userId, month)
    if (loadedHistoryMonths.current.has(key)) return
    if (historyRequests.current.has(key)) return historyRequests.current.get(key)

    const revision = epoch.current
    const request = (async () => {
      setHistoryStatus({ key, error: '' })
      try {
        const range = bufferedMonthRange(month)
        const history = await loadHistoryRange(userId, range.start, range.end)
        if (revision !== epoch.current || stateRef.current.accountId !== userId) return
        loadedHistoryMonths.current.add(key)
        dispatch({ type: 'MERGE_HISTORY', ...history })
        setHistoryStatus({ key: null, error: '' })
      } catch {
        if (revision === epoch.current) {
          setHistoryStatus({ key: null, error: 'Saved days could not be loaded. Try this month again.' })
        }
      } finally {
        historyRequests.current.delete(key)
      }
    })()
    historyRequests.current.set(key, request)
    return request
  }, [])

  const loadOlderHistory = useCallback(async (beforeDate, months) => {
    const userId = stateRef.current.accountId
    if (!userId) return null
    const revision = epoch.current
    try {
      const page = await loadHistoryPage(userId, beforeDate, months)
      if (revision !== epoch.current || stateRef.current.accountId !== userId) return null
      dispatch({ type: 'MERGE_HISTORY', dailyLogs: page.dailyLogs, periodLogs: page.periodLogs })
      return page
    } catch {
      setHistoryStatus({ key: null, error: 'Older saved days could not be loaded. Please try again.' })
      return null
    }
  }, [])

  const fingerprint = JSON.stringify({ records: trackerRecords(state), identity: state.identity })
  useEffect(() => {
    if (!state.accountId || readyAccount.current !== state.accountId || authLoading || isSupportOnlyRoute()) return
    clearTimeout(syncRetryTimer.current)
    const snapshot = state
    const revision = epoch.current
    const timer = setTimeout(() => {
      saveQueue.current = saveQueue.current.catch(() => {}).then(async () => {
        if (revision !== epoch.current || readyAccount.current !== snapshot.accountId) return
        setSyncStatus({ state: 'saving' })
        try {
          const result = await pushToSupabase(snapshot.accountId, snapshot)
          if (revision !== epoch.current) return
          clearSignupDraft(localStorage)
          clearGuestTracker(localStorage)
          setAccountError('')
          setSyncStatus({ state: 'synced' })
          syncRetryAttempts.current = 0
          const currentFingerprint = JSON.stringify({ records: trackerRecords(stateRef.current), identity: stateRef.current.identity })
          if (currentFingerprint === fingerprint) dispatch({ type: 'SERVER_RESULT', result })
        } catch (error) {
          if (revision !== epoch.current) return
          const offline = typeof navigator !== 'undefined' && navigator.onLine === false
          const permanent = error?.retryable === false
          if (import.meta.env.DEV) {
            console.error('Tracker sync failed', {
              code: error?.code,
              status: error?.status,
              message: error?.message,
              details: error?.details,
            })
          }
          setSyncStatus({ state: offline ? 'offline' : permanent ? 'blocked' : 'error' })
          if (!offline && !permanent) {
            const delay = Math.min(30000, 5000 * (2 ** syncRetryAttempts.current))
            syncRetryAttempts.current += 1
            syncRetryTimer.current = setTimeout(
              () => setSyncRetryNonce((value) => value + 1),
              delay,
            )
          }
        }
      })
    }, 700)
    return () => clearTimeout(timer)
  }, [fingerprint, state.accountId, authLoading, syncRetryNonce])

  useEffect(() => {
    if (state.accountId || authLoading || isSupportOnlyRoute()) return
    const timer = setTimeout(() => saveGuestTracker(localStorage, state), 250)
    return () => clearTimeout(timer)
  }, [fingerprint, state.accountId, authLoading])

  const cycleModel = useMemo(() => {
    const summarizedStart = state.cycles?.at(-1)?.start_date
    const lastStart = latestPeriodStartFromLogs(state.periodLogs) || summarizedStart || state.answers.lastStart
    return buildCycleModel({
      lastStart: lastStart && lastStart !== 'unknown' ? lastStart : null,
      cycleLength: state.result?.cycleLength,
      onBirthControl: state.profile.onBirthControl,
      predictionsReady: state.result?.authoritative === true && state.result.patternsReady === true,
    })
  }, [state.periodLogs, state.cycles, state.answers.lastStart, state.result, state.profile.onBirthControl])

  const value = useMemo(() => ({
    state,
    dispatch,
    cycleModel,
    authLoading,
    accountError,
    syncStatus,
    retryAccountSync,
    historyStatus,
    loadHistoryMonth,
    loadOlderHistory,
  }), [state, cycleModel, authLoading, accountError, syncStatus, retryAccountSync, historyStatus, loadHistoryMonth, loadOlderHistory])
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
