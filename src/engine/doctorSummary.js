import { addDays, dateKeyLocal } from './cyclePredictor.js'

export function summarizeDoctorLogs(dailyLogs = {}, now = new Date()) {
  const end = dateKeyLocal(now)
  const start = dateKeyLocal(addDays(now, -29))
  const logs = Object.entries(dailyLogs)
    .filter(([date]) => date >= start && date <= end)
    .map(([, log]) => log)
  const pains = logs.map((log) => log.pain)
    .filter((pain) => typeof pain === 'number' && Number.isFinite(pain) && pain >= 0 && pain <= 10)
  const symptoms = new Map()
  for (const log of logs) {
    for (const symptom of new Set(log.symptoms || [])) {
      symptoms.set(symptom, (symptoms.get(symptom) || 0) + 1)
    }
  }
  const loggedSymptoms = [...symptoms].sort((a, b) => b[1] - a[1]).map(([name]) => name)
  return {
    worstPain: pains.length ? Math.max(...pains) : null,
    highPainDays: pains.filter((pain) => pain >= 7).length,
    painLogCount: pains.length,
    impactLogCount: logs.filter((log) => Array.isArray(log.impact)).length,
    impactCount: logs.filter((log) => (log.impact || []).some((impact) => impact !== 'fine')).length,
    loggedSymptoms,
    hasLoggedSymptoms: loggedSymptoms.length > 0,
    totalLogs: logs.length,
  }
}
