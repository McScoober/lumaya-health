import test from 'node:test'
import assert from 'node:assert/strict'
import { clearGuestTracker, readGuestTracker, saveGuestTracker } from './guestTracker.js'

function storage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

test('guest tracking preferences and existing logs persist together', () => {
  const device = storage()
  const state = {
    accountId: null,
    onboarded: true,
    profile: { trackingModules: { core: true, sleep: false } },
    identity: { name: 'A' },
    dailyLogs: { '2026-10-17': { pain: 4 } },
  }
  assert.equal(saveGuestTracker(device, state), true)
  const saved = readGuestTracker(device)
  assert.equal(saved.profile.trackingModules.sleep, false)
  assert.equal(saved.dailyLogs['2026-10-17'].pain, 4)
  clearGuestTracker(device)
  assert.equal(readGuestTracker(device), null)
})

test('account state is never written into guest storage', () => {
  const device = storage()
  assert.equal(saveGuestTracker(device, { accountId: 'account-id' }), false)
  assert.equal(readGuestTracker(device), null)
})
