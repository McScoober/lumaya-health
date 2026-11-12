import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCarePreparationState, buildPatternEvidence, buildRouteSignals } from './patternInsights.js'
import {
  bleedingFatigueContrastFixture,
  highBleedingPrevalenceStressFixture,
  makePatternScenario,
  patternFixtureNow,
  repeatedPainFixture,
} from './fixtures/patternScenarios.js'

const now = new Date(2026, 9, 17)

test('repeated observations require minimum check-ins, event count, and logged-day share', () => {
  const fixture = makePatternScenario({ days: 10, painDays: [0, 1, 2, 3], impactDays: [0, 1, 2, 3], fatigueDays: [0, 1, 2, 3] })
  const evidence = buildPatternEvidence(fixture.dailyLogs, fixture.periodLogs, fixture.now)

  assert.equal(evidence.checkInCount, 10)
  assert.deepEqual(evidence.recurring.map((item) => item.id), ['pain', 'impact', 'fatigue'])
  assert.equal(evidence.recurring[0].body, 'Pain of 4 or higher was logged on 4 of 10 check-in days.')
  assert.equal(evidence.recurring[0].impactDays, 4)
  assert.equal(evidence.recurring[0].focusSection, 'pain')
})

test('three intermittent pain days in a large log do not create a repeated observation', () => {
  const fixture = makePatternScenario({ days: 60, painDays: [0, 20, 40] })
  const evidence = buildPatternEvidence(fixture.dailyLogs, fixture.periodLogs, fixture.now)
  assert.equal(evidence.recurring.some((item) => item.id === 'pain'), false)
})

test('high bleeding prevalence alone does not make fatigue appear associated with bleeding', () => {
  const evidence = buildPatternEvidence(
    highBleedingPrevalenceStressFixture.dailyLogs,
    highBleedingPrevalenceStressFixture.periodLogs,
    highBleedingPrevalenceStressFixture.now,
  )
  assert.equal(evidence.checkInCount, 60)
  assert.equal(Object.values(highBleedingPrevalenceStressFixture.periodLogs).filter((item) => item.period).length, 48)
  assert.equal(evidence.recurring.some((item) => item.id === 'bleeding-fatigue'), false)
  assert.equal(evidence.recurring.some((item) => item.id === 'pain'), false)
})

test('bleeding and fatigue are shown only with enough exposure and a clear rate difference', () => {
  const evidence = buildPatternEvidence(
    bleedingFatigueContrastFixture.dailyLogs,
    bleedingFatigueContrastFixture.periodLogs,
    bleedingFatigueContrastFixture.now,
  )
  const observation = evidence.recurring.find((item) => item.id === 'bleeding-fatigue')
  assert.ok(observation)
  assert.match(observation.body, /6 of 12 bleeding check-in days/)
  assert.match(observation.body, /1 of 18 non-bleeding check-in days/)
})

test('a repeated pain observation includes its denominator', () => {
  const evidence = buildPatternEvidence(repeatedPainFixture.dailyLogs, repeatedPainFixture.periodLogs, repeatedPainFixture.now)
  const observation = evidence.recurring.find((item) => item.id === 'pain')
  assert.ok(observation)
  assert.match(observation.body, /6 of 30 check-in days/)
})

test('a high share still needs the minimum number of logged days', () => {
  const fixture = makePatternScenario({ days: 5, painDays: [0, 1, 2, 3] })
  const evidence = buildPatternEvidence(fixture.dailyLogs, fixture.periodLogs, patternFixtureNow)
  assert.equal(evidence.recurring.some((item) => item.id === 'pain'), false)
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

test('repeated mood timing becomes a clinician conversation signal without a diagnosis label', () => {
  const mood = (score, functionalImpact = 'none') => ({ checkinCompleted: true, moodItems: { irritable: score, anxious: score }, functionalImpact })
  const dailyLogs = {
    '2026-08-12': mood(3, 'some'), '2026-08-13': mood(4, 'some'), '2026-08-16': mood(1),
    '2026-09-12': mood(3, 'some'), '2026-09-13': mood(4, 'a_lot'), '2026-09-16': mood(1),
    '2026-10-01': { checkinCompleted: true },
  }
  const periodLogs = {
    '2026-07-15': { period: true },
    '2026-08-15': { period: true },
    '2026-09-15': { period: true },
  }
  const evidence = buildPatternEvidence(dailyLogs, periodLogs, new Date('2026-10-02T12:00:00'), 90)
  const signals = buildRouteSignals({ authoritative: true, flags: [] }, evidence)
  assert.equal(evidence.moodPattern.repeated, true)
  assert.equal(signals.some((signal) => signal.id === 'mood-timing'), true)
  assert.doesNotMatch(signals.map((signal) => signal.note).join(' '), /diagnos/i)
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

test('recurring observations remain available for care preparation before flags are ready', () => {
  const state = buildCarePreparationState(null, {
    checkInCount: 5,
    fullCycleCount: 1,
    recurring: [{ id: 'pain' }, { id: 'fatigue' }],
  })

  assert.equal(state.stage, 'observations')
  assert.equal(state.heading, 'Prepare for care')
  assert.match(state.title, /2 observations/)
  assert.match(state.note, /2 more logged days/)
  assert.doesNotMatch(`${state.title} ${state.body}`, /nothing to prepare/i)
})

test('care preparation stays available when no care signal was identified', () => {
  const state = buildCarePreparationState({ authoritative: true }, {
    checkInCount: 19,
    fullCycleCount: 2,
    recurring: [],
  })

  assert.equal(state.stage, 'available')
  assert.match(state.body, /do not need to wait/i)
  assert.match(state.note, /not an all-clear/i)
})

test('discussion signals take precedence over descriptive observations', () => {
  const state = buildCarePreparationState({ authoritative: true }, {
    checkInCount: 19,
    fullCycleCount: 2,
    recurring: [{ id: 'pain' }],
  }, [{ id: 'PAIN-01' }])

  assert.equal(state.stage, 'discussion')
  assert.equal(state.heading, 'Worth discussing')
})
