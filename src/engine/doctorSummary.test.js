import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeDoctorLogs } from './doctorSummary.js'
import { scoreCheckIn } from './scoring.js'

const now = new Date(2026, 8, 30)
test('missing pain differs from explicit zero', () => {
  assert.equal(summarizeDoctorLogs({ '2026-09-30': { mood: 'Okay' } }, now).worstPain, null)
  assert.equal(summarizeDoctorLogs({ '2026-09-30': { pain: 0 } }, now).worstPain, 0)
})
test('summary excludes old and future entries and counts impacted days once', () => {
  const result = summarizeDoctorLogs({
    '2026-08-31': { pain: 10, symptoms: ['Old'] },
    '2026-09-01': { pain: 7, impact: ['school', 'sleep'] },
    '2026-09-30': { pain: 0, impact: ['fine'] },
    '2026-10-01': { pain: 10, symptoms: ['Future'] },
  }, now)
  assert.equal(result.worstPain, 7)
  assert.equal(result.impactCount, 1)
  assert.equal(result.totalLogs, 2)
  assert.deepEqual(result.loggedSymptoms, [])
})
test('old flag IDs never establish symptom recurrence', () => {
  const answers = { started: 'Yes', painWorst: 9, painBetween: 5 }
  const result = scoreCheckIn(answers, { observedFullCycleCount: 3, priorTier2Ids: ['PAIN-01'] })
  assert.equal(result.flags[0].confirmed, false)
  assert.equal(result.level, 'Mild')
  assert.equal(scoreCheckIn(answers, { observedFullCycleCount: 2 }).flags.length, 0)
})
