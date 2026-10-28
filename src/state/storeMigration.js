import { DEFAULT_ROUTE_PREFERENCES } from '../lib/routePreferences.js'

export const STORE_VERSION = 3

export const DEFAULT_TRACKING_V3 = Object.freeze({
  modules: Object.freeze({
    core: true,
    symptoms: true,
    sleep: true,
    skin: false,
    fuel: false,
    movement: true,
    painRelief: true,
    bleedingDetail: true,
    moodPms: false,
    labs: false,
  }),
  reminderTime: '20:30',
})

export const DEFAULT_NUTRITION_V3 = Object.freeze({ dietPattern: Object.freeze([]), foodTipsEnabled: true })
export const DEFAULT_HISTORY_V3 = Object.freeze({
  conditions: Object.freeze([]),
  family: Object.freeze([]),
  familyStatus: null,
  familyText: '',
  medications: Object.freeze([]),
  consentedAt: null,
  shareInExport: Object.freeze({ history: false, suppressed: false }),
})
export const DEFAULT_CHECKLISTS_V3 = Object.freeze({ talkToDoctor: Object.freeze({}) })

function array(value) {
  return Array.isArray(value) ? [...value] : []
}

function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function normalizePeriodProduct(value, legacyValues = []) {
  const raw = value || array(legacyValues)[0] || null
  const map = {
    Pads: 'pads', Tampons: 'tampons', Cup: 'cup', 'Period underwear': 'period-underwear',
    'A mix': 'mix', 'Prefer not to say': null,
  }
  return raw in map ? map[raw] : raw
}

function trackingModules(source = {}, profile = {}) {
  const legacy = object(profile.trackingModules)
  const modules = object(source.modules)
  const pick = (canonical, oldName, fallback) => modules[canonical] ?? modules[oldName] ?? legacy[canonical] ?? legacy[oldName] ?? fallback
  return {
    core: true,
    symptoms: Boolean(pick('symptoms', 'symptoms', DEFAULT_TRACKING_V3.modules.symptoms)),
    sleep: Boolean(pick('sleep', 'sleep', DEFAULT_TRACKING_V3.modules.sleep)),
    skin: Boolean(pick('skin', 'skinHair', DEFAULT_TRACKING_V3.modules.skin)),
    fuel: Boolean(pick('fuel', 'food', profile.foodModule ?? DEFAULT_TRACKING_V3.modules.fuel)),
    movement: Boolean(pick('movement', 'movement', DEFAULT_TRACKING_V3.modules.movement)),
    painRelief: Boolean(pick('painRelief', 'pain', DEFAULT_TRACKING_V3.modules.painRelief)),
    bleedingDetail: Boolean(pick('bleedingDetail', 'period', DEFAULT_TRACKING_V3.modules.bleedingDetail)),
    moodPms: Boolean(pick('moodPms', 'moodPms', DEFAULT_TRACKING_V3.modules.moodPms)),
    labs: Boolean(pick('labs', 'labs', DEFAULT_TRACKING_V3.modules.labs)),
  }
}

function migrateDailyLogs(dailyLogs, fromVersion) {
  return Object.fromEntries(Object.entries(object(dailyLogs)).map(([date, value]) => {
    const log = { ...object(value) }
    if (fromVersion < 3 && log.painNrs === undefined && typeof log.pain === 'number') {
      log.painNrs = Math.max(0, Math.min(10, log.pain * 2))
    }
    if (log.medicineTaken === undefined && Array.isArray(log.reliefAttempted)) {
      log.medicineTaken = log.reliefAttempted.includes('Pain medicine') || undefined
    }
    if (log.medicineRelief === undefined && log.reliefReceived) {
      log.medicineRelief = { Helped: 'full', 'Helped a little': 'partial', 'Did not help': 'none' }[log.reliefReceived]
    }
    return [date, log]
  }))
}

function routePreferences(value = {}) {
  const saved = object(value)
  return {
    selectedQuestions: array(saved.selectedQuestions),
    personalNote: typeof saved.personalNote === 'string' ? saved.personalNote : '',
    nameMode: ['first', 'initials', 'none'].includes(saved.nameMode) ? saved.nameMode : DEFAULT_ROUTE_PREFERENCES.nameMode,
    exportSections: { ...DEFAULT_ROUTE_PREFERENCES.exportSections, ...object(saved.exportSections) },
    privacyWarningSeen: saved.privacyWarningSeen === true,
    lastExportedAt: saved.lastExportedAt || null,
  }
}

export function migrateStoreV3(input = {}, options = {}) {
  const source = object(input)
  const fromVersion = Number(source.version) || 2
  const profile = object(source.profile)
  const oldRoute = object(options.routePreferences || source.routePreferences)
  const trackingSource = object(source.tracking)
  const modules = trackingModules(trackingSource, profile)
  const hideFood = profile.hideFoodContent === true
  if (hideFood) modules.fuel = false

  const nutritionSource = object(source.nutrition)
  const notificationSource = object(source.notifyPrefs)
  const migratedProfile = {
    ...profile,
    menarcheDate: profile.menarcheDate || null,
    periodProduct: normalizePeriodProduct(profile.periodProduct, profile.periodProducts),
    goals: array(profile.goals),
    // Compatibility fields remain during the v3 rollout; canonical values live above.
    trackingModules: {
      ...object(profile.trackingModules),
      core: true,
      symptoms: modules.symptoms,
      sleep: modules.sleep,
      skinHair: modules.skin,
      food: modules.fuel,
      movement: modules.movement,
      painRelief: modules.painRelief,
      bleedingDetail: modules.bleedingDetail,
      moodPms: modules.moodPms,
    },
    foodModule: modules.fuel,
  }

  return {
    ...source,
    version: STORE_VERSION,
    profile: migratedProfile,
    dailyLogs: migrateDailyLogs(source.dailyLogs, fromVersion),
    periodLogs: { ...object(source.periodLogs) },
    tracking: {
      modules,
      reminderTime: trackingSource.reminderTime || notificationSource.reminderTime || DEFAULT_TRACKING_V3.reminderTime,
    },
    nutrition: {
      dietPattern: array(nutritionSource.dietPattern).length
        ? array(nutritionSource.dietPattern)
        : array(profile.dietPreferences),
      foodTipsEnabled: nutritionSource.foodTipsEnabled !== undefined
        ? nutritionSource.foodTipsEnabled !== false
        : !hideFood,
    },
    history: {
      conditions: array(source.history?.conditions),
      family: array(source.history?.family),
      familyStatus: ['yes', 'no', 'unsure', 'skipped'].includes(source.history?.familyStatus) ? source.history.familyStatus : null,
      familyText: typeof source.history?.familyText === 'string' ? source.history.familyText.slice(0, 200) : '',
      medications: array(source.history?.medications),
      consentedAt: source.history?.consentedAt || null,
      shareInExport: { ...DEFAULT_HISTORY_V3.shareInExport, ...object(source.history?.shareInExport) },
    },
    periodicCheckins: array(source.periodicCheckins),
    tipHistory: { ...object(source.tipHistory) },
    checklists: {
      talkToDoctor: {
        ...object(oldRoute.checklist),
        ...object(source.checklists?.talkToDoctor),
      },
    },
    routePreferences: routePreferences(oldRoute),
    notifyPrefs: {
      periodCheckin: notificationSource.periodCheckin !== false,
      phaseTips: notificationSource.phaseTips !== false,
      reminderTime: trackingSource.reminderTime || notificationSource.reminderTime || DEFAULT_TRACKING_V3.reminderTime,
    },
  }
}

export function synchronizedPreferences(state = {}) {
  const migrated = migrateStoreV3(state)
  return {
    version: STORE_VERSION,
    notifications: migrated.notifyPrefs,
    tracking: migrated.tracking,
    nutrition: migrated.nutrition,
    history: migrated.history,
    periodicCheckins: migrated.periodicCheckins,
    tipHistory: migrated.tipHistory,
    checklists: migrated.checklists,
    routePreferences: migrated.routePreferences,
  }
}

export function stateFromSynchronizedPreferences(preferences = {}, profile = {}) {
  const saved = object(preferences)
  const notifications = object(saved.notifications)
  const legacyNotifications = saved.notifications ? notifications : saved
  return migrateStoreV3({
    version: saved.version || 2,
    profile,
    notifyPrefs: legacyNotifications,
    tracking: saved.tracking,
    nutrition: saved.nutrition,
    history: saved.history,
    periodicCheckins: saved.periodicCheckins,
    tipHistory: saved.tipHistory,
    checklists: saved.checklists,
    routePreferences: saved.routePreferences,
  })
}

export function accountStateFromGuest(guestState, userId, email) {
  const migrated = migrateStoreV3(guestState)
  return {
    ...migrated,
    userId,
    identity: { ...object(migrated.identity), email: email || migrated.identity?.email || '' },
  }
}
