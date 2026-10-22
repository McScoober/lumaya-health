import { addDays, dateKeyLocal, diffDays, fullCycleCount, periodStartKeys } from './cyclePredictor.js'
import { groupLoggedSymptoms } from '../content/symptomClusters.js'

export const ROUTE_WINDOWS = Object.freeze({
  '30': { label: '30 days', days: 30 },
  '90': { label: '90 days', days: 90 },
  all: { label: 'All', days: null },
})

export function isCompletedDailyLog(log) {
  return Boolean(
    log?.checkinCompleted ||
    log?.mood !== undefined ||
    log?.vibe !== undefined ||
    log?.symptoms?.length ||
    log?.pain !== undefined ||
    log?.impact !== undefined,
  )
}

function parseKey(key) {
  return new Date(`${key}T12:00:00`)
}

function periodRuns(periodLogs = {}) {
  const periodDays = Object.entries(periodLogs)
    .filter(([, entry]) => entry?.period === true)
    .map(([key]) => key)
    .sort()
  const runs = []
  for (const key of periodDays) {
    const previous = runs.at(-1)
    if (previous && diffDays(parseKey(key), parseKey(previous.at(-1))) === 1) previous.push(key)
    else runs.push([key])
  }
  return runs
}

function tally(items) {
  const counts = new Map()
  for (const item of items) counts.set(item, (counts.get(item) || 0) + 1)
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }))
}

function average(values) {
  if (!values.length) return null
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
}

export function buildRouteSummary({
  dailyLogs = {},
  periodLogs = {},
  result = null,
  now = new Date(),
  window = '90',
} = {}) {
  const selectedWindow = ROUTE_WINDOWS[window] || ROUTE_WINDOWS['90']
  const endKey = dateKeyLocal(now)
  const completedEntries = Object.entries(dailyLogs)
    .filter(([key, log]) => key <= endKey && isCompletedDailyLog(log))
    .sort(([a], [b]) => a.localeCompare(b))
  const allKnownKeys = [
    ...completedEntries.map(([key]) => key),
    ...Object.entries(periodLogs).filter(([, entry]) => entry?.period === true).map(([key]) => key),
  ].filter((key) => key <= endKey).sort()
  const startKey = selectedWindow.days
    ? dateKeyLocal(addDays(now, -(selectedWindow.days - 1)))
    : allKnownKeys[0] || endKey
  const windowDays = selectedWindow.days || Math.max(1, diffDays(parseKey(endKey), parseKey(startKey)) + 1)
  const entries = completedEntries.filter(([key]) => key >= startKey)
  const logs = entries.map(([date, log]) => ({ date, log }))
  const completedCycles = fullCycleCount(periodLogs)
  const stage = logs.length < 7 ? 'building' : completedCycles < 2 ? 'descriptive' : 'flags'

  const painValues = logs
    .map(({ log }) => log.pain)
    .filter((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10)
  const impactRows = logs.filter(({ log }) => (log.impact || []).some((item) => item !== 'fine'))
  const symptomCounts = tally(logs.flatMap(({ log }) => [...new Set(log.symptoms || [])]))
  const symptomClusters = groupLoggedSymptoms(logs.map(({ log }) => log))
  const moodValues = logs
    .map(({ log }) => log.vibe)
    .filter((value) => typeof value === 'number' && Number.isFinite(value))
  const bleedingDays = Object.entries(periodLogs)
    .filter(([key, entry]) => key >= startKey && key <= endKey && entry?.period === true)
    .length
  const starts = periodStartKeys(periodLogs)
  const runs = periodRuns(periodLogs)
  const cycles = starts.slice(0, -1).map((start, index) => {
    const nextStart = starts[index + 1]
    const run = runs.find((candidate) => candidate[0] === start) || [start]
    return {
      start,
      periodDays: run.length,
      cycleDays: diffDays(parseKey(nextStart), parseKey(start)),
    }
  }).filter((cycle) => cycle.start >= startKey || cycle.start === starts.at(-2))

  const flags = stage === 'flags' && result?.authoritative
    ? (result.flags || []).map((flag) => ({
        id: flag.id,
        title: flag.category || 'A pattern worth discussing',
        note: flag.note,
        severity: flag.displaySeverity || flag.severity,
      }))
    : []

  return {
    window,
    windowLabel: selectedWindow.label,
    startKey,
    endKey,
    windowDays,
    loggedDays: logs.length,
    completedCycles,
    stage,
    daysUntilMetrics: Math.max(0, 7 - logs.length),
    flags,
    cycles,
    metrics: {
      cycleCount: cycles.length,
      averageCycleDays: average(cycles.map((cycle) => cycle.cycleDays).filter((value) => value > 0)),
      averagePeriodDays: average(cycles.map((cycle) => cycle.periodDays).filter((value) => value > 0)),
      bleedingDays,
      painLogCount: painValues.length,
      worstPain: painValues.length ? Math.max(...painValues) : null,
      averagePain: average(painValues),
      highPainDays: painValues.filter((value) => value >= 7).length,
      impactDays: impactRows.length,
      impacts: tally(impactRows.flatMap(({ log }) => log.impact || [])),
      moodLogCount: moodValues.length,
      averageMood: average(moodValues),
      symptoms: symptomCounts,
      symptomClusters,
    },
  }
}
