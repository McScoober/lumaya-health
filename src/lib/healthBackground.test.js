import test from 'node:test'
import assert from 'node:assert/strict'
import {
  HEALTH_BACKGROUND_SECTIONS,
  applicableHealthQuestions,
  firstIncompleteHealthSection,
  healthBackgroundProgress,
  healthBackgroundValues,
  recommendedLearnSlugs,
} from './healthBackground.js'

test('health background keeps stale cycle dates in onboarding and uses short editable sections', () => {
  assert.equal(HEALTH_BACKGROUND_SECTIONS.length, 5)
  assert.ok(HEALTH_BACKGROUND_SECTIONS.every((section) => section.questions.length >= 2 && section.questions.length <= 4))
  assert.equal(HEALTH_BACKGROUND_SECTIONS.flatMap((section) => section.keys).includes('lastStart'), false)
  assert.equal(HEALTH_BACKGROUND_SECTIONS.flatMap((section) => section.keys).includes('lastEnd'), false)
  assert.equal(HEALTH_BACKGROUND_SECTIONS.flatMap((section) => section.keys).includes('prevStart'), false)
})

test('period questions are excluded when periods have not started', () => {
  const answers = { started: 'Not yet' }
  const bleeding = HEALTH_BACKGROUND_SECTIONS.find((section) => section.id === 'bleeding')
  assert.deepEqual(applicableHealthQuestions(bleeding, answers), [])
  assert.equal(firstIncompleteHealthSection(answers), 3)
})

test('progress counts only currently applicable questions', () => {
  const answers = { started: 'Not yet', acne: 'None', signs: ['Neither'], lifestyle: 'Neither' }
  const values = healthBackgroundValues(answers, { familyStatus: 'unsure' })
  const progress = healthBackgroundProgress(values)
  assert.equal(progress.answered, 4)
  assert.equal(progress.total, 4)
  assert.equal(progress.complete, true)
})

test('family history belongs to the later health background and not onboarding questions', () => {
  const background = HEALTH_BACKGROUND_SECTIONS.find((section) => section.id === 'background')
  assert.ok(background.keys.includes('familyStatus'))
  assert.equal(background.questions.find((question) => question.key === 'familyStatus')?.type, 'family-history')
})

test('Learn recommendations are neutral, deduplicated, and limited', () => {
  assert.deepEqual(recommendedLearnSlugs({ flow: 'Very heavy', changes: 'More than once/hour', painWorst: 7 }), ['heavy-periods', 'painful-periods'])
  assert.deepEqual(recommendedLearnSlugs({ started: 'Not yet' }), ['period-101'])
})
