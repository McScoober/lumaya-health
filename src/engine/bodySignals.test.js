import test from 'node:test'
import assert from 'node:assert/strict'
import { deriveBodySignals, groupBodySignals } from './bodySignals.js'

const now = new Date('2026-10-27T12:00:00')

test('body signals describe observations as check-ins and prioritize repeated changes', () => {
  const signals = deriveBodySignals({
    '2026-10-24': { checkinCompleted: true, energy: 2, mood: 'Okay' },
    '2026-10-25': { checkinCompleted: true, energy: 1, mood: 'Rough' },
    '2026-10-26': { checkinCompleted: true, energy: 4, mood: 'Rough' },
  }, {}, { days: 8, today: now })

  assert.equal(signals.energy.status, 'changed')
  assert.match(signals.energy.desc, /2 of 3 check-ins/)
  assert.equal(signals.mood.status, 'changed')
})

test('sleep uses structured rest answers and disabled modules stay out of summaries', () => {
  const profile = { trackingModules: { core: true, sleep: false, skinHair: false } }
  const signals = deriveBodySignals({
    '2026-10-24': { checkinCompleted: true, rested: 'Not rested' },
    '2026-10-25': { checkinCompleted: true, sleepHours: 'Under 6' },
  }, profile, { days: 8, today: now })
  const grouped = groupBodySignals(signals, profile)

  assert.equal(signals.sleep.status, 'empty')
  assert.equal(signals.sleep.val, 'Just getting started')
  assert.deepEqual([...grouped.changed, ...grouped.steady, ...grouped.collecting].map((signal) => signal.id).sort(), ['energy', 'mood'])
})

test('enabled modules collect at least three relevant check-ins before assigning a label', () => {
  const profile = { trackingModules: { core: true, sleep: true, skinHair: true } }
  const signals = deriveBodySignals({
    '2026-10-24': { checkinCompleted: true, energy: 4, mood: 'Good', rested: 'Rested' },
    '2026-10-25': { checkinCompleted: true, energy: 3, mood: 'Okay', rested: 'Rested' },
  }, profile, { days: 8, today: now })
  const grouped = groupBodySignals(signals, profile)

  assert.equal(grouped.changed.length, 0)
  assert.deepEqual(grouped.steady, [])
  assert.deepEqual(grouped.collecting.map((signal) => signal.id), ['energy', 'mood', 'sleep', 'skin'])
})
