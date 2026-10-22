import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPatternEvidence, buildRouteSignals } from './patternInsights.js'

const now = new Date(2026, 9, 17)

test('recurring evidence requires at least two observed days', () => {
  const evidence = buildPatternEvidence({
    '2026-10-14': { checkinCompleted: true, pain: 5, impact: ['school'], symptoms: ['Fatigue'] },
    '2026-10-15': { checkinCompleted: true, pain: 6, impact: ['sleep'], symptoms: ['Fatigue'] },
    '2026-10-16': { checkinCompleted: true, pain: 0, impact: ['fine'] },
  }, {}, now)

  assert.equal(evidence.checkInCount, 3)
  assert.deepEqual(evidence.recurring.map((item) => item.id), ['pain', 'impact', 'fatigue'])
})

test('fatigue and bleeding are grouped only when both were logged together twice', () => {
  const evidence = buildPatternEvidence({
    '2026-10-14': { checkinCompleted: true, symptoms: ['Fatigue'] },
    '2026-10-15': { checkinCompleted: true, symptoms: ['Fatigue'] },
  }, {
    '2026-10-14': { period: true },
    '2026-10-15': { period: true },
  }, now)

  assert.equal(evidence.recurring.at(-1).id, 'bleeding-fatigue')
})

test('unconfirmed tier two signals remain watch items without a visit claim', () => {
  const [signal] = buildRouteSignals({
    authoritative: true,
    flags: [{ id: 'PAIN-01', tier: 2, confirmed: false, displaySeverity: 'SOFT' }],
  }, { fullCycleCount: 3, checkInCount: 9 })

  assert.equal(signal.early, true)
  assert.equal(signal.label, 'Worth keeping an eye on')
  assert.match(signal.basis, /3 full cycles and 9 check-ins/)
})

test('confirmed signals can be prepared for a clinician conversation', () => {
  const [signal] = buildRouteSignals({
    authoritative: true,
    flags: [{ id: 'HMB-01', tier: 1, confirmed: true, displaySeverity: 'URGENT' }],
  }, { fullCycleCount: 2, checkInCount: 7 })

  assert.equal(signal.early, false)
  assert.equal(signal.label, 'Worth discussing')
  assert.match(signal.basis, /saved answers and 7 check-ins/)
})

test('all flags stay hidden until seven days and two cycles are observed', () => {
  const result = {
    authoritative: true,
    flags: [{ id: 'HMB-02', tier: 1, confirmed: true, displaySeverity: 'MODERATE' }],
  }

  assert.deepEqual(buildRouteSignals(result, { fullCycleCount: 2, checkInCount: 6 }), [])
  assert.deepEqual(buildRouteSignals(result, { fullCycleCount: 1, checkInCount: 7 }), [])
  assert.equal(buildRouteSignals(result, { fullCycleCount: 2, checkInCount: 7 }).length, 1)
})
