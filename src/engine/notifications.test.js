import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCycleModel } from './cyclePredictor.js'
import { buildSchedule } from './notifications.js'

test('turning phase tips off preserves period check-ins and removes phase messages', () => {
  const model = buildCycleModel({
    lastStart: '2026-10-22',
    cycleLength: 28,
    predictionsReady: true,
  })
  const from = new Date('2026-10-22T12:00:00')
  const withoutPhaseTips = buildSchedule(model, {}, { days: 30, from, phaseTips: false })

  assert.ok(withoutPhaseTips.some((message) => message.type === 'period_checkin'))
  assert.ok(withoutPhaseTips.every((message) => message.type === 'period_checkin'))

  const withPhaseTips = buildSchedule(model, {}, { days: 30, from, phaseTips: true })
  assert.ok(withPhaseTips.some((message) => message.type === 'phase_checkin' || message.type === 'luteal_nudge'))
})
