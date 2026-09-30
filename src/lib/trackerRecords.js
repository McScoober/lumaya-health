// Derived scores never enter the observation payload sent to the server.
export function trackerRecords(state) {
  return {
    dailyLogs: state.dailyLogs || {},
    periodLogs: Object.fromEntries(Object.entries(state.periodLogs || {})
      .filter(([, log]) => log.status !== 'possible')
      .map(([date, log]) => {
        const { estimatedFrom, ...actual } = log
        return [date, actual]
      })),
    answers: Object.fromEntries(Object.entries(state.answers || {}).filter(([, value]) => value !== undefined && value !== null)),
    settings: { onboarded: !!state.onboarded, profile: state.profile || {}, preferences: state.notifyPrefs || {} },
  }
}

export function diffRecords(previous, current) {
  const changes = {}
  for (const group of ['dailyLogs', 'periodLogs', 'answers']) {
    const before = previous?.[group] || {}
    const after = current[group]
    const delta = {}
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) delta[key] = after[key] ?? null
    }
    if (Object.keys(delta).length) changes[group] = delta
  }
  if (JSON.stringify(previous?.settings) !== JSON.stringify(current.settings)) changes.settings = current.settings
  return changes
}

export function clearLegacyHealthStorage(storage) {
  const oldBrand = ['lu', 'maya'].join('')
  for (const key of Object.keys(storage)) {
    if (key === 'maisie.identity' || key.startsWith('maisie.health.') || key === `${oldBrand}.identity` || key.startsWith(`${oldBrand}.health.`)) storage.removeItem(key)
  }
}
