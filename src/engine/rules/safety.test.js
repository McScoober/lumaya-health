import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateSafetyRules, urgentPhysicalSafetyStatus } from './safety.js'

test('urgent physical rules record a pending trigger without exposing unreviewed guidance', () => {
  const result = urgentPhysicalSafetyStatus({
    '2026-11-07': {
      checkinCompleted: true,
      bleeding: { flooding: true },
      symptoms: ['Dizziness'],
    },
  }, '2026-11-07')

  assert.equal(result.triggered, true)
  assert.equal(result.active, false)
  assert.equal(result.reviewStatus, 'pending')
  assert.equal(result.reason, 'urgent-bleeding')
})

test('safety evaluation returns mood and physical results with one config version', () => {
  const result = evaluateSafetyRules({
    dailyLogs: {
      '2026-11-06': { moodItems: { hopeless: 4 } },
      '2026-11-07': { moodItems: { hopeless: 4 } },
    },
    now: '2026-11-07',
  })
  assert.equal(result.mood.active, true)
  assert.equal(result.configVersion, result.mood.configVersion)
  assert.equal(result.configVersion, result.physical.configVersion)
})
