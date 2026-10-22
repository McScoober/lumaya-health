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
    notifyPrefs: { reminderTime: '19:45' },
    tipHistory: { 'pain-comfort-01': '2026-10-17' },
  }
  assert.equal(saveGuestTracker(device, state), true)
  const saved = readGuestTracker(device)
  assert.equal(saved.profile.trackingModules.sleep, false)
  assert.equal(saved.dailyLogs['2026-10-17'].pain, 4)
  assert.equal(saved.notifyPrefs.reminderTime, '19:45')
  assert.equal(saved.tipHistory['pain-comfort-01'], '2026-10-17')
  clearGuestTracker(device)
  assert.equal(readGuestTracker(device), null)
})

test('account state is never written into guest storage', () => {
  const device = storage()
  assert.equal(saveGuestTracker(device, { accountId: 'account-id' }), false)
  assert.equal(readGuestTracker(device), null)
})

test('legacy guest and Route storage are migrated once into the v3 snapshot', () => {
  const device = storage()
  device.setItem('maisie.guestTracker.v2', JSON.stringify({
    version: 2,
    onboarded: true,
    profile: {},
    dailyLogs: { '2026-10-01': { pain: 3 } },
  }))
  device.setItem('maisie.routePreferences.v1', JSON.stringify({
    checklist: { summary: true },
    personalNote: 'Bring up pain.',
  }))

  const saved = readGuestTracker(device)
  assert.equal(saved.version, 3)
  assert.equal(saved.dailyLogs['2026-10-01'].painNrs, 6)
  assert.equal(saved.checklists.talkToDoctor.summary, true)
  assert.equal(saved.routePreferences.personalNote, 'Bring up pain.')
  assert.equal(device.getItem('maisie.guestTracker.v2'), null)
  assert.equal(device.getItem('maisie.routePreferences.v1'), null)
  assert.ok(device.getItem('maisie.guestTracker.v3'))
})
