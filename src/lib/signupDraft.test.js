import test from 'node:test'
import assert from 'node:assert/strict'
import { clearSignupDraft, readSignupDraft, saveSignupDraft } from './signupDraft.js'

function memoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

const onboardedState = {
  onboarded: true,
  step: 'result',
  identity: { name: 'Test', email: '' },
  profile: { studentAthlete: 'Student' },
  answers: { started: 'Yes' },
  dailyLogs: {},
  periodLogs: {},
  progressiveQIndex: 0,
  streak: 0,
  lastCheckinDate: null,
  messages: [],
  advisorRequests: [],
  checkinHistory: [],
  notifyPrefs: { periodCheckin: true },
}

test('restores a pending signup draft only for the confirming email', () => {
  const storage = memoryStorage()
  assert.equal(saveSignupDraft(storage, onboardedState, ' Teen@Example.com ', 1000), true)
  assert.equal(readSignupDraft(storage, 'other@example.com', 2000), null)

  saveSignupDraft(storage, onboardedState, 'teen@example.com', 1000)
  assert.deepEqual(readSignupDraft(storage, 'TEEN@example.com', 2000)?.answers, { started: 'Yes' })
})

test('expired and cleared signup drafts cannot be restored', () => {
  const storage = memoryStorage()
  saveSignupDraft(storage, onboardedState, 'teen@example.com', 1000)
  assert.equal(readSignupDraft(storage, 'teen@example.com', 60 * 60 * 1000 + 1001), null)

  saveSignupDraft(storage, onboardedState, 'teen@example.com', 1000)
  clearSignupDraft(storage)
  assert.equal(readSignupDraft(storage, 'teen@example.com', 2000), null)
})
