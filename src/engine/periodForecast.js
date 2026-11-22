import { ruleValue } from './rules/config.js'
import { addDays, dateKeyLocal, diffDays, periodStartKeys, startOfDay } from './cyclePredictor.js'

export const PERIOD_FORECAST_VERSION = 'period-forecast-v1'

function median(values) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function weightedMedian(values) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a.value - b.value)
  const totalWeight = sorted.reduce((sum, item) => sum + item.weight, 0)
  let cumulative = 0
  for (const item of sorted) {
    cumulative += item.weight
    if (cumulative >= totalWeight / 2) return item.value
  }
  return sorted.at(-1).value
}

function intervalsFromStarts(starts) {
  return starts.slice(1).map((key, index) => ({
    from: starts[index],
    to: key,
    days: diffDays(new Date(`${key}T00:00:00`), new Date(`${starts[index]}T00:00:00`)),
  })).filter((interval) => interval.days > 0)
}

function observedPeriodDuration(periodLogs) {
  const keys = Object.keys(periodLogs).filter((key) => periodLogs[key]?.period === true).sort()
  const runs = []
  let currentRun = []
  let previous = null
  for (const key of keys) {
    const consecutive = previous && diffDays(new Date(`${key}T00:00:00`), new Date(`${previous}T00:00:00`)) === 1
    if (consecutive) currentRun.push(key)
    else {
      if (currentRun.length) runs.push(currentRun)
      currentRun = [key]
    }
    previous = key
  }
  if (currentRun.length) runs.push(currentRun)

  const completedLengths = runs.flatMap((run) => {
    const nextDay = dateKeyLocal(addDays(new Date(`${run.at(-1)}T00:00:00`), 1))
    const explicitlyEnded = periodLogs[nextDay]?.period === false || periodLogs[nextDay]?.status === 'not_period'
    return explicitlyEnded ? [run.length] : []
  })
  return {
    completedPeriodCount: completedLengths.length,
    typicalPeriodLength: completedLengths.length >= ruleValue('forecast.minimumCompletedPeriodsForDuration')
      ? median(completedLengths)
      : null,
  }
}

function weekBounds(date) {
  if (!date) return { estimateWeekStart: null, estimateWeekEnd: null }
  const mondayOffset = (startOfDay(date).getDay() + 6) % 7
  const estimateWeekStart = addDays(date, -mondayOffset)
  return { estimateWeekStart, estimateWeekEnd: addDays(estimateWeekStart, 6) }
}

export function buildPeriodForecast({ periodLogs = {}, additionalStartDates = [], today = new Date(), onBirthControl = false } = {}) {
  const starts = [...new Set([
    ...periodStartKeys(periodLogs),
    ...additionalStartDates.filter((value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)),
  ])].sort()
  const intervals = intervalsFromStarts(starts)
  const recent = intervals.slice(-ruleValue('forecast.maximumIntervals'))
  const rawMedian = median(recent.map((interval) => interval.days))
  const possibleMissedLog = rawMedian === null ? null : recent.find((interval) =>
    interval.days > rawMedian * ruleValue('forecast.possibleMissedLogMultiplier'),
  ) || null
  const usable = possibleMissedLog
    ? recent.filter((interval) => interval !== possibleMissedLog)
    : recent
  const weighted = usable.map((interval, index) => ({
    value: interval.days,
    weight: index + 1,
  }))
  const cycleLength = weightedMedian(weighted)
  const deviations = usable.map((interval) => Math.abs(interval.days - cycleLength))
  const spread = deviations.length ? 1.4826 * median(deviations) : null
  const eligible = starts.length >= ruleValue('forecast.minimumStarts') && cycleLength !== null && !onBirthControl
  const radius = eligible
    ? Math.max(ruleValue('forecast.minimumRangeRadiusDays'), Math.ceil(ruleValue('forecast.rangeSpreadMultiplier') * spread))
    : null
  const displayable = eligible && (radius * 2 + 1) <= ruleValue('forecast.maximumDisplayRangeDays')
  const lastStart = starts.at(-1) || null
  const expectedStart = eligible ? addDays(new Date(`${lastStart}T00:00:00`), Math.round(cycleLength)) : null
  const earliestStart = expectedStart ? addDays(expectedStart, -radius) : null
  const latestStart = expectedStart ? addDays(expectedStart, radius) : null
  const { estimateWeekStart, estimateWeekEnd } = weekBounds(expectedStart)
  const daysUntil = expectedStart ? diffDays(expectedStart, startOfDay(today)) : null
  const confidence = !eligible ? 'not-enough-data'
    : usable.length < 3 || spread >= ruleValue('forecast.lowConfidenceSpreadDays') ? 'low'
      : usable.length >= ruleValue('forecast.highConfidenceMinimumIntervals') && spread <= ruleValue('forecast.highConfidenceSpreadDays') ? 'higher'
        : 'building'
  const status = !eligible ? 'insufficient-data'
    : !displayable ? 'too-variable'
      : diffDays(today, latestStart) > 0 ? 'later-than-range'
      : diffDays(today, earliestStart) >= 0 ? 'within-range'
        : 'upcoming'
  const duration = observedPeriodDuration(periodLogs)

  return {
    version: PERIOD_FORECAST_VERSION,
    eligible,
    displayable,
    reason: onBirthControl ? 'birth-control-schedule' : eligible ? null : 'insufficient-data',
    status,
    confidence,
    startCount: starts.length,
    intervalCount: usable.length,
    cycleLength: eligible ? cycleLength : null,
    periodLength: duration.typicalPeriodLength,
    completedPeriodCount: duration.completedPeriodCount,
    spreadDays: eligible ? spread : null,
    radiusDays: radius,
    lastStart,
    expectedStart,
    estimateWeekStart,
    estimateWeekEnd,
    earliestStart,
    latestStart,
    daysUntil,
    possibleMissedLog: possibleMissedLog ? {
      from: possibleMissedLog.from,
      to: possibleMissedLog.to,
      days: possibleMissedLog.days,
      suggestedStart: addDays(new Date(`${possibleMissedLog.from}T00:00:00`), Math.round(rawMedian)),
    } : null,
  }
}

export function isInForecastRange(forecast, date = new Date()) {
  if (!forecast?.displayable || !forecast.earliestStart || !forecast.latestStart) return false
  const day = startOfDay(date)
  return day >= startOfDay(forecast.earliestStart) && day <= startOfDay(forecast.latestStart)
}

export function forecastDateKey(date) {
  return date ? dateKeyLocal(date) : null
}
