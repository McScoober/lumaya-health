const KEY = 'maisie.routePreferences.v1'

const DEFAULTS = Object.freeze({
  checklist: {},
  selectedQuestions: [],
  personalNote: '',
  nameMode: 'first',
  exportSections: {
    overview: true,
    cycles: true,
    pain: true,
    impact: true,
    mood: true,
    symptoms: true,
  },
  privacyWarningSeen: false,
  lastExportedAt: null,
})

export function readRoutePreferences(storage = globalThis.localStorage) {
  try {
    const saved = JSON.parse(storage?.getItem(KEY) || '{}')
    return {
      ...DEFAULTS,
      ...saved,
      checklist: { ...DEFAULTS.checklist, ...(saved.checklist || {}) },
      exportSections: { ...DEFAULTS.exportSections, ...(saved.exportSections || {}) },
    }
  } catch {
    return { ...DEFAULTS, exportSections: { ...DEFAULTS.exportSections } }
  }
}

export function saveRoutePreferences(value, storage = globalThis.localStorage) {
  storage?.setItem(KEY, JSON.stringify(value))
  return value
}

export { DEFAULTS as DEFAULT_ROUTE_PREFERENCES }
