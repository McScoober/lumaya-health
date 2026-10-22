import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCycleModel,
  observedPeriodForDate,
  phaseForDate,
  phaseForDateWithObservations,
  periodStartKeys,
} from './cyclePredictor.js'

test('a confirmed long period overrides the default five-day phase estimate', () => {
  const model = buildCycleModel({ lastStart: '2026-10-10', cycleLength: 28 })
  const periodLogs = Object.fromEntries(
    Array.from({ length: 7 }, (_, index) => [
      `2026-10-${String(10 + index).padStart(2, '0')}`,
      { period: true },
    ]),
  )

  assert.equal(phaseForDate(model, new Date('2026-10-16T12:00:00')).phase, 'follicular')
  assert.deepEqual(observedPeriodForDate(periodLogs, new Date('2026-10-16T12:00:00')), {
    startKey: '2026-10-10',
    dayOfPeriod: 7,
  })

  const actual = phaseForDateWithObservations(model, periodLogs, new Date('2026-10-16T12:00:00'))
  assert.equal(actual.phase, 'menstrual')
  assert.equal(actual.dayOfPeriod, 7)
  assert.equal(actual.observed, true)
})

test('extra consecutive period days stay in one period run', () => {
  const periodLogs = {
    '2026-10-10': { period: true },
    '2026-10-11': { period: true },
    '2026-10-12': { period: true },
    '2026-10-13': { period: true },
    '2026-10-14': { period: true },
    '2026-10-15': { period: true },
    '2026-10-16': { period: true },
  }

  assert.deepEqual(periodStartKeys(periodLogs), ['2026-10-10'])
})

test('an unlogged day still uses the predicted phase', () => {
  const model = buildCycleModel({ lastStart: '2026-10-10', cycleLength: 28 })
  const actual = phaseForDateWithObservations(model, {}, new Date('2026-10-16T12:00:00'))

  assert.equal(actual.phase, 'follicular')
  assert.equal(actual.observed, false)
})
