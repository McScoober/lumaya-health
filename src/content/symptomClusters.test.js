import test from 'node:test'
import assert from 'node:assert/strict'
import {
  FALLBACK_SYMPTOM_CLUSTER_ID,
  groupLoggedSymptoms,
  groupSymptomOptions,
  symptomClusterFor,
} from './symptomClusters.js'

const LIVE_SYMPTOMS = [
  'Cramps', 'Headache', 'Bloating', 'Fatigue', 'Back pain', 'Breast tenderness',
  'Mood changes', 'Skin breakout', 'Nausea', 'Dizziness', 'Spotting',
  'Discharge changes', 'Sleep trouble',
]

test('every live symptom has an explicit cluster', () => {
  const grouped = groupSymptomOptions(LIVE_SYMPTOMS)
  const mapped = grouped.flatMap((cluster) => cluster.symptoms)
  assert.deepEqual([...mapped].sort(), [...LIVE_SYMPTOMS].sort())
})

test('unknown symptoms fall back without being dropped', () => {
  assert.equal(symptomClusterFor('Something new').id, FALLBACK_SYMPTOM_CLUSTER_ID)
  const grouped = groupSymptomOptions(['Something new'])
  assert.deepEqual(grouped[0].symptoms, ['Something new'])
})

test('logged symptoms are counted under shared cluster headings', () => {
  const grouped = groupLoggedSymptoms([
    { symptoms: ['Cramps', 'Dizziness'] },
    { symptoms: ['Cramps', 'Fatigue'] },
  ])
  assert.deepEqual(grouped.map((cluster) => cluster.label), [
    'Pain and cramps', 'Mood and energy', 'Tummy and other',
  ])
  assert.deepEqual(grouped[0].symptoms[0], { name: 'Cramps', count: 2 })
})
