import { addDays, dateKeyLocal, diffDays, periodStartKeys } from './cyclePredictor.js'
import { RULE_CONFIG_VERSION, ruleDefinition, ruleValue } from './rules/config.js'

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
    .filter((value) => Number.isInteger(value) && value >= ruleValue('mood.itemMinimum') && value <= ruleValue('mood.itemMaximum'))
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
    const before = rowsBetween(rows, addDays(start, -ruleValue('mood.beforeWindowDays')), addDays(start, -1))
    const after = rowsBetween(rows, start, addDays(start, ruleValue('mood.afterWindowDays')))
    const elevatedBeforeDays = before.filter(({ log }) => itemValues(log).some((value) => value >= ruleValue('mood.elevatedItemMinimum'))).length
    const beforeAverage = average(before.map(({ score }) => score))
    const afterAverage = average(after.map(({ score }) => score))
    const improvedAfter = beforeAverage !== null && afterAverage !== null && beforeAverage - afterAverage >= ruleValue('mood.minimumImprovement')
    const meaningfulImpact = before.some(({ log }) => ['some', 'a_lot'].includes(log.functionalImpact))
    const highImpact = before.some(({ log }) => log.functionalImpact === 'a_lot')
    const timedPattern = before.length >= ruleValue('mood.minimumBeforeCheckIns') &&
      after.length >= ruleValue('mood.minimumAfterCheckIns') &&
      elevatedBeforeDays >= ruleValue('mood.minimumElevatedDays') && improvedAfter
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
  const repeated = matchedCycles.length >= ruleValue('mood.repeatedCycles')
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
    comparedCycles: cycles.filter((cycle) => cycle.beforeDays >= ruleValue('mood.minimumBeforeCheckIns') && cycle.afterDays >= ruleValue('mood.minimumAfterCheckIns')).length,
    matchedCycles: matchedCycles.length,
    repeated,
    meaningfulImpact,
    highImpact,
    worthDiscussing: repeated && meaningfulImpact,
    cycles,
    configVersion: RULE_CONFIG_VERSION,
  }
}

export function moodSafetyStatus(dailyLogs = {}, now = new Date()) {
  const definition = ruleDefinition('SAFETY-MOOD')
  const endKey = typeof now === 'string' ? now : dateKeyLocal(now)
  const end = parseKey(endKey)
  const start = addDays(end, -(ruleValue('safety.moodWindowDays') - 1))
  const recent = Object.entries(dailyLogs)
    .map(([key, log]) => ({ key, date: parseKey(key), log }))
    .filter(({ date }) => date && date >= start && date <= end)
  const hopelessDays = recent.filter(({ log }) => Number(log?.moodItems?.hopeless) === ruleValue('safety.hopelessValue')).length
  const directConcern = recent.some(({ log }) => log?.safetyConcern === true)
  return {
    active: directConcern || hopelessDays >= ruleValue('safety.hopelessDays'),
    directConcern,
    hopelessDays,
    reason: directConcern ? 'direct' : hopelessDays >= ruleValue('safety.hopelessDays') ? 'repeated-hopelessness' : null,
    ruleId: 'SAFETY-MOOD',
    ruleSource: definition.source,
    reviewStatus: definition.reviewStatus,
    configVersion: RULE_CONFIG_VERSION,
  }
}

export function moodPatternTipTrigger(dailyLogs = {}, periodLogs = {}) {
  const pattern = analyzeMoodPattern(dailyLogs, periodLogs)
  return pattern.matchedCycles >= 1 && pattern.meaningfulImpact
}
