import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPeriodForecast, isInForecastRange } from './periodForecast.js'
import { backtestPeriodForecast } from './periodForecast.backtest.js'

function logsFromStarts(starts, lengths = []) {
  const logs = {}
  starts.forEach((start, index) => {
    const length = lengths[index] || 1
    for (let day = 0; day < length; day++) {
      const date = new Date(`${start}T00:00:00`)
      date.setDate(date.getDate() + day)
      logs[date.toISOString().slice(0, 10)] = { period: true }
    }
    const endMarker = new Date(`${start}T00:00:00`)
    endMarker.setDate(endMarker.getDate() + length)
    logs[endMarker.toISOString().slice(0, 10)] = { period: false, status: 'not_period' }
  })
  return logs
}

test('waits for three observed starts, then gives a range from logged intervals', () => {
  const tooLittle = buildPeriodForecast({ periodLogs: logsFromStarts(['2026-01-01', '2026-02-01']) })
  assert.equal(tooLittle.eligible, false)

  const forecast = buildPeriodForecast({
    periodLogs: logsFromStarts(['2026-01-01', '2026-02-01', '2026-03-08']),
    today: new Date('2026-03-20T12:00:00'),
  })
  assert.equal(forecast.eligible, true)
  assert.equal(forecast.cycleLength, 35)
  assert.ok(forecast.earliestStart < forecast.expectedStart)
  assert.ok(forecast.latestStart > forecast.expectedStart)
  assert.equal(forecast.status, 'upcoming')
})

test('flags a long gap for history review without inventing a start', () => {
  const forecast = buildPeriodForecast({
    periodLogs: logsFromStarts(['2026-01-01', '2026-01-31', '2026-03-02', '2026-05-11']),
    today: new Date('2026-05-12T12:00:00'),
  })
  assert.deepEqual(forecast.possibleMissedLog && {
    from: forecast.possibleMissedLog.from,
    to: forecast.possibleMissedLog.to,
    days: forecast.possibleMissedLog.days,
  }, { from: '2026-03-02', to: '2026-05-11', days: 70 })
  assert.equal(forecast.possibleMissedLog.suggestedStart.toISOString().slice(0, 10), '2026-04-01')
  assert.equal(forecast.intervalCount, 2)
})

test('does not make a natural-cycle forecast for birth-control users', () => {
  const forecast = buildPeriodForecast({
    periodLogs: logsFromStarts(['2026-01-01', '2026-02-01', '2026-03-04']),
    onBirthControl: true,
  })
  assert.equal(forecast.eligible, false)
  assert.equal(forecast.reason, 'birth-control-schedule')
  assert.equal(forecast.earliestStart, null)
})

test('keeps late forecasts anchored instead of rolling forward', () => {
  const forecast = buildPeriodForecast({
    periodLogs: logsFromStarts(['2026-01-01', '2026-02-01', '2026-03-04']),
    today: new Date('2026-05-01T12:00:00'),
  })
  assert.equal(forecast.status, 'later-than-range')
  assert.equal(forecast.expectedStart.toISOString().slice(0, 10), '2026-04-04')
})

test('withholds a calendar range when recent dates vary too much to be useful', () => {
  const starts = ['2026-01-01']
  for (const interval of [28, 42, 28, 42, 28, 42]) {
    const next = new Date(`${starts.at(-1)}T00:00:00`)
    next.setDate(next.getDate() + interval)
    starts.push(next.toISOString().slice(0, 10))
  }
  const forecast = buildPeriodForecast({ additionalStartDates: starts })
  assert.equal(forecast.eligible, true)
  assert.equal(forecast.displayable, false)
  assert.equal(forecast.status, 'too-variable')
  assert.equal(isInForecastRange(forecast, forecast.expectedStart), false)
})

test('range matching is limited to the estimated start window', () => {
  const forecast = buildPeriodForecast({
    periodLogs: logsFromStarts(['2026-01-01', '2026-02-01', '2026-03-04']),
    today: new Date('2026-03-20T12:00:00'),
  })
  assert.equal(isInForecastRange(forecast, forecast.earliestStart), true)
  assert.equal(isInForecastRange(forecast, forecast.latestStart), true)
  assert.equal(isInForecastRange(forecast, forecast.expectedStart.setDate(forecast.expectedStart.getDate() + forecast.radiusDays + 1)), false)
})

test('uses a personal logged period length when consecutive days are available', () => {
  const forecast = buildPeriodForecast({
    periodLogs: logsFromStarts(['2026-01-01', '2026-02-01', '2026-03-04'], [4, 6, 5]),
  })
  assert.equal(forecast.periodLength, 5)
  assert.equal(forecast.completedPeriodCount, 3)
})

test('does not treat an unended period as a completed duration sample', () => {
  const logs = logsFromStarts(['2026-01-01', '2026-02-01', '2026-03-04'], [4, 6, 5])
  delete logs['2026-03-09']
  const forecast = buildPeriodForecast({ periodLogs: logs })
  assert.equal(forecast.completedPeriodCount, 2)
  assert.equal(forecast.periodLength, null)
})

test('backtest evaluates only after enough prior starts and reports baseline metrics', () => {
  const result = backtestPeriodForecast([[
    '2026-01-01', '2026-02-01', '2026-03-04', '2026-04-04', '2026-05-08',
  ]])
  assert.equal(result.samples, 2)
  assert.equal(result.methods.forecast.count, 2)
  assert.equal(typeof result.forecastRangeCoverage, 'number')
  assert.equal(typeof result.averageRangeWidthDays, 'number')
})
