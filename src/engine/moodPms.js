import { addDays, dateKeyLocal, diffDays, periodStartKeys } from './cyclePredictor.js'

export const MOOD_ITEM_DEFINITIONS = Object.freeze([
  { id: 'irritable', label: 'Irritable' },
  { id: 'tearful', label: 'Tearful or down' },
  { id: 'anxious', label: 'Anxious or on edge' },
  { id: 'hopeless', label: 'Hopeless' },
  { id: 'rejection', label: 'Sensitive to rejection' },
  { id: 'swings', label: 'Mood swings' },
])

export const MOOD_SEVERITY_OPTIONS = Object.freeze([
  { value: 1, label: 'Not at all' },
  { value: 2, label: 'A little' },
  { value: 3, label: 'Quite a bit' },
  { value: 4, label: 'Very strongly' },
])

function parseKey(key) {
  const date = new Date(`${key}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function itemValues(log) {
  return MOOD_ITEM_DEFINITIONS
    .map(({ id }) => Number(log?.moodItems?.[id]))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 4)
}

function average(values) {
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function dailyMoodScore(log) {
  return average(itemValues(log))
}

function rowsBetween(rows, start, end) {
  return rows.filter(({ date }) => date >= start && date <= end)
}

export function analyzeMoodPattern(dailyLogs = {}, periodLogs = {}) {
  const rows = Object.entries(dailyLogs)
    .map(([key, log]) => ({ key, date: parseKey(key), log, score: dailyMoodScore(log) }))
    .filter(({ date, score }) => date && score !== null)
    .sort((left, right) => left.key.localeCompare(right.key))

  const cycles = periodStartKeys(periodLogs).map((startKey) => {
    const start = parseKey(startKey)
    const before = rowsBetween(rows, addDays(start, -14), addDays(start, -1))
    const after = rowsBetween(rows, start, addDays(start, 7))
    const elevatedBeforeDays = before.filter(({ log }) => itemValues(log).some((value) => value >= 3)).length
    const beforeAverage = average(before.map(({ score }) => score))
    const afterAverage = average(after.map(({ score }) => score))
    const improvedAfter = beforeAverage !== null && afterAverage !== null && beforeAverage - afterAverage >= 0.5
    const meaningfulImpact = before.some(({ log }) => ['some', 'a_lot'].includes(log.functionalImpact))
    const highImpact = before.some(({ log }) => log.functionalImpact === 'a_lot')
    const timedPattern = before.length >= 2 && after.length >= 1 && elevatedBeforeDays >= 2 && improvedAfter
    return {
      startKey,
      beforeDays: before.length,
      afterDays: after.length,
      elevatedBeforeDays,
      beforeAverage,
      afterAverage,
      improvedAfter,
      meaningfulImpact,
      highImpact,
      timedPattern,
    }
  })

  const matchedCycles = cycles.filter((cycle) => cycle.timedPattern)
  const repeated = matchedCycles.length >= 2
  const highImpact = matchedCycles.some((cycle) => cycle.highImpact)
  const meaningfulImpact = matchedCycles.some((cycle) => cycle.meaningfulImpact)
  const status = repeated ? 'repeated' : matchedCycles.length === 1 ? 'observed' : rows.length ? 'tracking' : 'empty'
  const summary = repeated
    ? `Mood changes repeated before ${matchedCycles.length} logged periods and eased after bleeding began.`
    : matchedCycles.length === 1
      ? 'Mood changes appeared before one logged period and eased after bleeding began. Keep tracking to see whether that timing repeats.'
      : rows.length
        ? 'Keep logging mood before and after your period to compare the timing.'
        : 'No detailed mood check-ins are available yet.'

  return {
    status,
    summary,
    detailedLogCount: rows.length,
    comparedCycles: cycles.filter((cycle) => cycle.beforeDays >= 2 && cycle.afterDays >= 1).length,
    matchedCycles: matchedCycles.length,
    repeated,
    meaningfulImpact,
    highImpact,
    worthDiscussing: repeated && meaningfulImpact,
    cycles,
  }
}

export function moodSafetyStatus(dailyLogs = {}, now = new Date()) {
  const endKey = typeof now === 'string' ? now : dateKeyLocal(now)
  const end = parseKey(endKey)
  const start = addDays(end, -6)
  const recent = Object.entries(dailyLogs)
    .map(([key, log]) => ({ key, date: parseKey(key), log }))
    .filter(({ date }) => date && date >= start && date <= end)
  const hopelessDays = recent.filter(({ log }) => Number(log?.moodItems?.hopeless) === 4).length
  const directConcern = recent.some(({ log }) => log?.safetyConcern === true)
  return {
    active: directConcern || hopelessDays >= 2,
    directConcern,
    hopelessDays,
    reason: directConcern ? 'direct' : hopelessDays >= 2 ? 'repeated-hopelessness' : null,
  }
}

export function moodPatternTipTrigger(dailyLogs = {}, periodLogs = {}) {
  const pattern = analyzeMoodPattern(dailyLogs, periodLogs)
  return pattern.matchedCycles >= 1 && pattern.meaningfulImpact
}
