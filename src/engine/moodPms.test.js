import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeMoodPattern, moodSafetyStatus } from './moodPms.js'

function mood(score, functionalImpact = 'none') {
  return { checkinCompleted: true, moodItems: { irritable: score, anxious: score }, functionalImpact }
}

test('requires before-and-after observations before describing cycle timing', () => {
  const result = analyzeMoodPattern({
    '2026-09-12': mood(4, 'some'),
    '2026-09-13': mood(3, 'some'),
  }, { '2026-09-15': { period: true } })
  assert.equal(result.matchedCycles, 0)
  assert.equal(result.status, 'tracking')
})

test('describes a repeated pre-period pattern without naming a condition', () => {
  const logs = {
    '2026-08-12': mood(3, 'some'), '2026-08-13': mood(4, 'some'), '2026-08-16': mood(1),
    '2026-09-12': mood(3, 'some'), '2026-09-13': mood(4, 'a_lot'), '2026-09-16': mood(1),
  }
  const result = analyzeMoodPattern(logs, {
    '2026-08-15': { period: true },
    '2026-09-15': { period: true },
  })
  assert.equal(result.repeated, true)
  assert.equal(result.worthDiscussing, true)
  assert.equal(result.matchedCycles, 2)
  assert.doesNotMatch(result.summary, /diagnos/i)
})

test('activates safety support for a direct concern or hopelessness twice in seven days', () => {
  assert.equal(moodSafetyStatus({ '2026-10-27': { safetyConcern: true } }, '2026-10-27').active, true)
  assert.equal(moodSafetyStatus({
    '2026-10-22': { moodItems: { hopeless: 4 } },
    '2026-10-26': { moodItems: { hopeless: 4 } },
  }, '2026-10-27').active, true)
  assert.equal(moodSafetyStatus({ '2026-10-20': { moodItems: { hopeless: 4 } } }, '2026-10-27').active, false)
})
