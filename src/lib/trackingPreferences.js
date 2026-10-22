import { features } from '../config/features.js'

export const TRACKING_MODULES = [
  { id: 'core', label: 'Core check-in', description: 'Mood, pain, and daily impact.', locked: true },
  { id: 'symptoms', label: 'Symptoms', description: 'Changes such as cramps, fatigue, and dizziness.' },
  { id: 'sleep', label: 'Sleep', description: 'Sleep trouble and daily impact.' },
  { id: 'skinHair', label: 'Skin and hair', description: 'Skin and hair changes you choose to log.' },
  { id: 'food', label: 'Food and fuel', description: 'Optional, neutral guidance.', feature: 'food' },
  { id: 'movement', label: 'Movement', description: 'Use activity context in your guidance.' },
  { id: 'painRelief', label: 'Pain relief', description: 'Timing and relief when pain is 4 or higher.' },
  { id: 'bleedingDetail', label: 'Bleeding details', description: 'Leaking, soaking, and duration on bleeding days.' },
  { id: 'moodPms', label: 'Mood and PMS', description: 'Optional detail about mood changes.' },
]

export const DEFAULT_TRACKING_MODULES = {
  core: true,
  symptoms: true,
  sleep: true,
  skinHair: false,
  food: false,
  movement: false,
  painRelief: true,
  bleedingDetail: true,
  moodPms: false,
}

export const DIET_PREFERENCES = [
  'Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-free', 'Dairy-free',
  'No preference', 'Prefer not to say',
]

export const PERIOD_PRODUCTS = [
  'Pads', 'Tampons', 'Cup', 'Period underwear', 'A mix', 'Prefer not to say',
]

export function trackingModulesFromProfile(profile = {}) {
  const saved = profile.trackingModules || {}
  const usesNewModules = ['core', 'symptoms', 'skinHair', 'movement', 'painRelief', 'bleedingDetail', 'moodPms']
    .some((key) => key in saved)
  const legacy = usesNewModules ? {} : {
    symptoms: Object.keys(saved).length ? Object.values(saved).some(Boolean) : true,
    sleep: saved.sleep,
    skinHair: saved.skin,
    food: saved.food,
    movement: ['Athlete', 'Both'].includes(profile.studentAthlete) || Boolean(profile.sport),
    painRelief: saved.pain,
    bleedingDetail: saved.period,
  }
  return {
    ...DEFAULT_TRACKING_MODULES,
    ...Object.fromEntries(Object.entries(legacy).filter(([, value]) => value !== undefined)),
    ...saved,
    core: true,
    food: features.food && profile.hideFoodContent !== true && profile.sensitiveFoodMode !== true &&
      (profile.foodModule === true || saved.food === true),
  }
}

export function profilePayloadForTrackingModules(modules, options = {}) {
  const normalized = { ...DEFAULT_TRACKING_MODULES, ...modules, core: true }
  const hideFoodContent = options.hideFoodContent === true
  normalized.food = features.food && !hideFoodContent && normalized.food
  return {
    trackingModules: normalized,
    foodModule: normalized.food,
    hideFoodContent,
  }
}

const SYMPTOM_MODULES = {
  Cramps: ['symptoms'],
  Headache: ['symptoms'],
  Bloating: ['symptoms'],
  Fatigue: ['symptoms'],
  'Back pain': ['symptoms'],
  'Breast tenderness': ['symptoms'],
  'Mood changes': ['moodPms'],
  'Skin breakout': ['skinHair'],
  Nausea: ['symptoms'],
  Dizziness: ['symptoms'],
  Spotting: ['symptoms'],
  'Discharge changes': ['symptoms'],
  'Sleep trouble': ['sleep'],
}

export function symptomIsEnabled(symptom, modules) {
  const owners = SYMPTOM_MODULES[symptom] || []
  return owners.some((moduleId) => modules[moduleId] !== false)
}

export function foodContentIsEnabled(profile = {}, dailyLogs = {}) {
  return features.food && trackingModulesFromProfile(profile).food &&
    profile.hideFoodContent !== true && !foodSensitiveModeIsActive(profile, dailyLogs)
}

export function foodSensitiveModeIsActive(profile = {}, dailyLogs = {}) {
  if (profile.sensitiveFoodMode === true) return true
  if (profile.sensitiveFoodMode === false) return false

  const recentLoggedDays = Object.entries(dailyLogs)
    .filter(([, log]) => log?.checkinCompleted === true)
    .sort(([left], [right]) => right.localeCompare(left))
    .slice(0, 14)

  return recentLoggedDays.filter(([, log]) => log?.fuel?.meals === 'few').length >= 5
}

export function visibleTrackingModules() {
  return TRACKING_MODULES.filter((module) => !module.feature || features[module.feature])
}

export function shouldShowPainRelief(modules, pain) {
  return modules?.painRelief === true && typeof pain === 'number' && pain >= 4
}

export function shouldShowBleedingDetails(modules, context = {}) {
  return modules?.bleedingDetail === true && (
    context.period === true || context.spotting === true || context.hasExistingDetails === true
  )
}
