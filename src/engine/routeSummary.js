import { addDays, dateKeyLocal, diffDays, fullCycleCount, periodStartKeys } from './cyclePredictor.js'
import { groupLoggedSymptoms } from '../content/symptomClusters.js'
import { analyzeMoodPattern } from './moodPms.js'
import { RULE_CONFIG_VERSION, ruleValue, serverRuleVersionStatus } from './rules/config.js'

export const ROUTE_WINDOWS = Object.freeze({
  '30': { label: `${ruleValue('observations.homeWindowDays')} days`, days: ruleValue('observations.homeWindowDays') },
  '90': { label: `${ruleValue('observations.windowDays')} days`, days: ruleValue('observations.windowDays') },
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

const FLOW_LABELS = { light: 'Light', medium: 'Medium', heavy: 'Heavy' }
const FLOW_ORDER = ['light', 'medium', 'heavy']
const CLOT_ORDER = ['None', 'Small', 'Large']
const DURATION_ORDER = ['Started today', '2-3 days', '4-7 days', 'More than 7 days']

function normalizedFlow(value) {
  const key = String(value || '').trim().toLowerCase()
  return FLOW_LABELS[key] ? key : null
}

function finiteCount(value) {
  const count = Number(value)
  return Number.isFinite(count) && count > 0 ? count : 0
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
  const stage = logs.length < ruleValue('gates.defaultCheckIns')
    ? 'building'
    : completedCycles < ruleValue('gates.defaultFullCycles') ? 'descriptive' : 'flags'

  const painValues = logs
    .map(({ log }) => log.pain)
    .filter((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10)
  const impactRows = logs.filter(({ log }) => (log.impact || []).some((item) => item !== 'fine'))
  const symptomCounts = tally(logs.flatMap(({ log }) => [...new Set(log.symptoms || [])]))
  const symptomClusters = groupLoggedSymptoms(logs.map(({ log }) => log))
  const moodValues = logs
    .map(({ log }) => log.vibe)
    .filter((value) => typeof value === 'number' && Number.isFinite(value))
  const moodLogCount = logs.filter(({ log }) => (
    typeof log.vibe === 'number' || Object.keys(log.moodItems || {}).length > 0
  )).length
  const periodEntries = Object.entries(periodLogs)
    .filter(([key, entry]) => key >= startKey && key <= endKey && entry?.period === true)
  const bleedingDays = periodEntries.length
  const flowRows = periodEntries
    .map(([date, entry]) => ({ date, flow: normalizedFlow(entry.flow) }))
    .filter((row) => row.flow)
  const flowCounts = FLOW_ORDER.map((flow) => ({ name: FLOW_LABELS[flow], count: flowRows.filter((row) => row.flow === flow).length }))
    .filter((item) => item.count > 0)
  const heaviestFlowKey = [...flowRows].sort((a, b) => FLOW_ORDER.indexOf(b.flow) - FLOW_ORDER.indexOf(a.flow))[0]?.flow || null

  const fullnessRows = logs.map(({ date, log }) => {
    const fullness = log.bleeding?.productFullness || {}
    const counts = {
      light: finiteCount(fullness.light),
      moderate: finiteCount(fullness.moderate),
      full: finiteCount(fullness.full),
    }
    return { date, counts, total: counts.light + counts.moderate + counts.full }
  }).filter((row) => row.total > 0)
  const productFullness = fullnessRows.reduce((totals, row) => ({
    light: totals.light + row.counts.light,
    moderate: totals.moderate + row.counts.moderate,
    full: totals.full + row.counts.full,
  }), { light: 0, moderate: 0, full: 0 })
  const floodingRows = logs.filter(({ log }) => log.bleeding?.flooding !== undefined && log.bleeding?.flooding !== null)
  const clotValues = logs.map(({ log }) => log.bleeding?.clots).filter((value) => typeof value === 'string' && value)
  const knownClotValues = clotValues.filter((value) => CLOT_ORDER.includes(value))
  const durationValues = logs.map(({ log }) => log.bleedingDuration).filter((value) => typeof value === 'string' && value)
  const knownDurationValues = durationValues.filter((value) => DURATION_ORDER.includes(value))
  const detailDates = new Set([
    ...flowRows.map((row) => row.date),
    ...fullnessRows.map((row) => row.date),
    ...floodingRows.map(({ date }) => date),
    ...logs.filter(({ log }) => typeof log.bleeding?.clots === 'string' && log.bleeding.clots).map(({ date }) => date),
    ...logs.filter(({ log }) => typeof log.bleedingDuration === 'string' && log.bleedingDuration).map(({ date }) => date),
  ])
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

  const moodPattern = analyzeMoodPattern(Object.fromEntries(entries), periodLogs)

  const flags = stage === 'flags' && result?.authoritative
    ? (result.flags || []).map((flag) => ({
        id: flag.id,
        title: flag.category || 'A pattern worth discussing',
        note: flag.note,
        severity: flag.displaySeverity || flag.severity,
      }))
    : []
  if (stage === 'flags' && moodPattern.worthDiscussing) {
    flags.push({
      id: 'mood-timing',
      title: 'Mood timing worth discussing',
      note: moodPattern.summary,
      severity: moodPattern.highImpact ? 'recommend_clinical_review' : 'flagged',
    })
  }

  return {
    window,
    windowLabel: selectedWindow.label,
    startKey,
    endKey,
    windowDays,
    loggedDays: logs.length,
    completedCycles,
    stage,
    daysUntilMetrics: Math.max(0, ruleValue('gates.defaultCheckIns') - logs.length),
    flags,
    cycles,
    configVersion: RULE_CONFIG_VERSION,
    serverRuleVersionStatus: serverRuleVersionStatus(result),
    metrics: {
      cycleCount: cycles.length,
      averageCycleDays: average(cycles.map((cycle) => cycle.cycleDays).filter((value) => value > 0)),
      averagePeriodDays: average(cycles.map((cycle) => cycle.periodDays).filter((value) => value > 0)),
      bleedingDays,
      bleedingDetails: {
        loggedDays: detailDates.size,
        flowLoggedDays: flowRows.length,
        flowCounts,
        heaviestFlow: heaviestFlowKey ? FLOW_LABELS[heaviestFlowKey] : null,
        productLoggedDays: fullnessRows.length,
        productFullness,
        totalProductChanges: productFullness.light + productFullness.moderate + productFullness.full,
        fullySoakedDays: fullnessRows.filter((row) => row.counts.full > 0).length,
        floodingAnsweredDays: floodingRows.length,
        floodingDays: floodingRows.filter(({ log }) => log.bleeding.flooding === true).length,
        floodingUnknownDays: floodingRows.filter(({ log }) => log.bleeding.flooding === 'not-sure').length,
        floodingNotSharedDays: floodingRows.filter(({ log }) => log.bleeding.flooding === 'prefer-not').length,
        clotAnsweredDays: clotValues.length,
        clotCounts: tally(clotValues),
        largestClot: [...knownClotValues].sort((a, b) => CLOT_ORDER.indexOf(b) - CLOT_ORDER.indexOf(a))[0] || null,
        durationAnsweredDays: durationValues.length,
        durationCounts: tally(durationValues),
        longestDuration: [...knownDurationValues].sort((a, b) => DURATION_ORDER.indexOf(b) - DURATION_ORDER.indexOf(a))[0] || null,
      },
      painLogCount: painValues.length,
      worstPain: painValues.length ? Math.max(...painValues) : null,
      averagePain: average(painValues),
      highPainDays: painValues.filter((value) => value >= ruleValue('flags.highPainMinimum')).length,
      impactDays: impactRows.length,
      impacts: tally(impactRows.flatMap(({ log }) => log.impact || [])),
      moodLogCount,
      averageMood: average(moodValues),
      moodPattern,
      symptoms: symptomCounts,
      symptomClusters,
    },
  }
}
