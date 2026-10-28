import test from 'node:test'
import assert from 'node:assert/strict'
import { buildRouteSummary } from './routeSummary.js'

const now = new Date('2026-10-18T12:00:00')

function dailyLogs(count) {
  return Object.fromEntries(Array.from({ length: count }, (_, index) => [
    `2026-10-${String(18 - index).padStart(2, '0')}`,
    { checkinCompleted: true, pain: index % 8, vibe: 3, symptoms: index === 0 ? ['Fatigue'] : [], impact: [] },
  ]))
}

const twoCycles = {
  '2026-08-20': { period: true },
  '2026-09-17': { period: true },
  '2026-10-15': { period: true },
}

test('keeps fewer than seven logged days in the progress stage', () => {
  const summary = buildRouteSummary({ dailyLogs: dailyLogs(6), periodLogs: twoCycles, now })
  assert.equal(summary.stage, 'building')
  assert.equal(summary.daysUntilMetrics, 1)
  assert.deepEqual(summary.flags, [])
})

test('shows descriptions at seven days but hides flags before two cycles', () => {
  const summary = buildRouteSummary({
    dailyLogs: dailyLogs(7),
    periodLogs: { '2026-09-17': { period: true }, '2026-10-15': { period: true } },
    result: { authoritative: true, flags: [{ id: 'PAIN-01', category: 'Pain', note: 'Repeated pain' }] },
    now,
  })
  assert.equal(summary.stage, 'descriptive')
  assert.equal(summary.completedCycles, 1)
  assert.deepEqual(summary.flags, [])
})

test('allows authoritative flags at two completed cycles', () => {
  const summary = buildRouteSummary({
    dailyLogs: dailyLogs(7),
    periodLogs: twoCycles,
    result: { authoritative: true, flags: [{ id: 'PAIN-01', category: 'Pain pattern', note: 'Repeated pain', displaySeverity: 'MODERATE' }] },
    now,
  })
  assert.equal(summary.stage, 'flags')
  assert.equal(summary.flags.length, 1)
})

test('summarizes repeated mood timing and adds a non-diagnostic discussion item', () => {
  const detailedMood = (score, functionalImpact = 'none') => ({
    checkinCompleted: true,
    vibe: 2,
    moodItems: { irritable: score, anxious: score },
    functionalImpact,
  })
  const logs = {
    ...dailyLogs(7),
    '2026-08-17': detailedMood(3, 'some'),
    '2026-08-18': detailedMood(4, 'some'),
    '2026-08-21': detailedMood(1),
    '2026-09-14': detailedMood(3, 'some'),
    '2026-09-15': detailedMood(4, 'a_lot'),
    '2026-09-18': detailedMood(1),
  }
  const summary = buildRouteSummary({ dailyLogs: logs, periodLogs: twoCycles, result: { authoritative: true, flags: [] }, now, window: 'all' })
  assert.equal(summary.metrics.moodPattern.repeated, true)
  assert.equal(summary.flags.some((flag) => flag.id === 'mood-timing'), true)
  assert.doesNotMatch(summary.metrics.moodPattern.summary, /diagnos/i)
})

test('distinguishes no pain logged from zero pain', () => {
  const withZero = buildRouteSummary({ dailyLogs: { ...dailyLogs(7), '2026-10-18': { checkinCompleted: true, pain: 0 } }, periodLogs: twoCycles, now })
  assert.ok(withZero.metrics.painLogCount > 0)
  const withoutPain = buildRouteSummary({
    dailyLogs: Object.fromEntries(Object.entries(dailyLogs(7)).map(([key, log]) => [key, { ...log, pain: undefined }])),
    periodLogs: twoCycles,
    now,
  })
  assert.equal(withoutPain.metrics.painLogCount, 0)
  assert.equal(withoutPain.metrics.worstPain, null)
})

test('groups summary symptoms with the shared check-in headings', () => {
  const summary = buildRouteSummary({ dailyLogs: dailyLogs(7), periodLogs: twoCycles, now })
  assert.deepEqual(summary.metrics.symptomClusters, [{
    id: 'mood-energy',
    label: 'Mood and energy',
    symptoms: [{ name: 'Fatigue', count: 1 }],
  }])
})
