import { addDays, diffDays } from './cyclePredictor.js'
import { buildPeriodForecast } from './periodForecast.js'

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function summarize(errors) {
  const absolute = errors.map(Math.abs)
  const count = errors.length
  return {
    count,
    meanAbsoluteErrorDays: count ? absolute.reduce((sum, value) => sum + value, 0) / count : null,
    within1Day: count ? absolute.filter((value) => value <= 1).length / count : null,
    within2Days: count ? absolute.filter((value) => value <= 2).length / count : null,
    within3Days: count ? absolute.filter((value) => value <= 3).length / count : null,
  }
}

// Walks each logged sequence chronologically; each forecast only sees prior starts.
export function backtestPeriodForecast(sequences = []) {
  const errors = { forecast: [], fixed28: [], lastCycle: [], recentMedian: [] }
  let rangeCovered = 0
  let rangeCount = 0
  let totalRangeWidth = 0

  for (const sequence of sequences) {
    const starts = [...new Set(sequence)].sort()
    for (let targetIndex = 3; targetIndex < starts.length; targetIndex++) {
      const prior = starts.slice(0, targetIndex)
      const actual = new Date(`${starts[targetIndex]}T00:00:00`)
      const forecast = buildPeriodForecast({ additionalStartDates: prior, today: actual })
      if (!forecast.eligible) continue

      const errorFor = (date) => diffDays(date, actual)
      errors.forecast.push(errorFor(forecast.expectedStart))
      errors.fixed28.push(errorFor(addDays(new Date(`${prior.at(-1)}T00:00:00`), 28)))
      const intervals = prior.slice(1).map((start, index) => diffDays(new Date(`${start}T00:00:00`), new Date(`${prior[index]}T00:00:00`)))
      errors.lastCycle.push(errorFor(addDays(new Date(`${prior.at(-1)}T00:00:00`), intervals.at(-1))))
      errors.recentMedian.push(errorFor(addDays(new Date(`${prior.at(-1)}T00:00:00`), median(intervals.slice(-3)))))
      rangeCovered += actual >= forecast.earliestStart && actual <= forecast.latestStart ? 1 : 0
      rangeCount += 1
      totalRangeWidth += diffDays(forecast.latestStart, forecast.earliestStart) + 1
    }
  }

  return {
    samples: errors.forecast.length,
    methods: Object.fromEntries(Object.entries(errors).map(([name, values]) => [name, summarize(values)])),
    forecastRangeCoverage: rangeCount ? rangeCovered / rangeCount : null,
    averageRangeWidthDays: rangeCount ? totalRangeWidth / rangeCount : null,
  }
}
