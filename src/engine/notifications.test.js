import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCycleModel } from './cyclePredictor.js'
import { buildPeriodForecast } from './periodForecast.js'
import { buildSchedule } from './notifications.js'

test('turning phase tips off preserves period check-ins and removes phase messages', () => {
  const model = buildCycleModel({
    lastStart: '2026-10-22',
    cycleLength: 28,
    predictionsReady: true,
  })
  const periodLogs = {
    '2026-08-27': { period: true },
    '2026-09-24': { period: true },
    '2026-10-22': { period: true },
  }
  const periodForecast = buildPeriodForecast({ periodLogs })
  const from = new Date('2026-10-22T12:00:00')
  const withoutPhaseTips = buildSchedule(model, {}, { days: 30, from, phaseTips: false, periodForecast })

  assert.ok(withoutPhaseTips.some((message) => message.type === 'period_checkin'))
  assert.ok(withoutPhaseTips.every((message) => message.type === 'period_checkin'))

  const withPhaseTips = buildSchedule(model, {}, { days: 30, from, phaseTips: true, periodForecast })
  assert.ok(withPhaseTips.some((message) => message.type === 'phase_checkin' || message.type === 'luteal_nudge'))
})
