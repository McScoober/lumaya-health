import test from 'node:test'
import assert from 'node:assert/strict'
import { STORE_V2_FIXTURES } from './fixtures/storeV2Fixtures.js'
import {
  accountStateFromGuest,
  migrateStoreV3,
  stateFromSynchronizedPreferences,
  synchronizedPreferences,
} from './storeMigration.js'

for (const fixture of STORE_V2_FIXTURES) {
  test(`store-v3 migration preserves ${fixture.name}`, () => {
    const migrated = migrateStoreV3(fixture.state, { routePreferences: fixture.routePreferences })
    assert.equal(migrated.version, 3)
    assert.deepEqual(Object.keys(migrated.dailyLogs), Object.keys(fixture.state.dailyLogs))
    assert.deepEqual(migrated.periodLogs, fixture.state.periodLogs)
    assert.ok(migrated.tracking.modules.core)
    assert.ok(Array.isArray(migrated.nutrition.dietPattern))
    assert.ok(Array.isArray(migrated.history.conditions))
    assert.ok(Array.isArray(migrated.periodicCheckins))
    assert.equal(typeof migrated.tipHistory, 'object')
    assert.equal(typeof migrated.checklists.talkToDoctor, 'object')
  })
}

test('v2 pain and Route preferences migrate without deleting legacy fields', () => {
  const fixture = STORE_V2_FIXTURES[0]
  const migrated = migrateStoreV3(fixture.state, { routePreferences: fixture.routePreferences })
  const log = migrated.dailyLogs['2026-09-10']
  assert.equal(log.pain, 4)
  assert.equal(log.painNrs, 8)
  assert.equal(log.medicineTaken, true)
  assert.equal(log.medicineRelief, 'partial')
  assert.equal(migrated.checklists.talkToDoctor.summary, true)
  assert.equal(migrated.routePreferences.personalNote, 'Pain affects school.')
  assert.equal(migrated.tracking.reminderTime, '19:15')
  assert.deepEqual(migrated.nutrition.dietPattern, ['Vegetarian'])
  assert.equal(migrated.profile.periodProduct, 'pads')
})

test('store-v3 migration is idempotent', () => {
  const once = migrateStoreV3(STORE_V2_FIXTURES[0].state, { routePreferences: STORE_V2_FIXTURES[0].routePreferences })
  assert.deepEqual(migrateStoreV3(once), once)
})

test('all foundation structures survive guest-to-account conversion and settings round-trip', () => {
  const guest = migrateStoreV3({
    ...STORE_V2_FIXTURES[0].state,
    history: { conditions: [{ code: 'hx_test', status: 'unknown' }] },
    periodicCheckins: [{ id: 'pc-1', type: 'androgen', date: '2026-10-01', answers: { skin: 2 }, score: 2 }],
    tipHistory: { 'sleep-reset-01': '2026-10-01' },
  }, { routePreferences: STORE_V2_FIXTURES[0].routePreferences })
  const account = accountStateFromGuest(guest, 'account-1', 'teen@example.com')
  const preferences = synchronizedPreferences(account)
  const restored = stateFromSynchronizedPreferences(preferences, account.profile)

  assert.equal(account.userId, 'account-1')
  assert.equal(account.identity.email, 'teen@example.com')
  for (const key of ['tracking', 'nutrition', 'history', 'periodicCheckins', 'tipHistory', 'checklists', 'routePreferences']) {
    assert.deepEqual(restored[key], account[key], `${key} did not survive synchronization`)
  }
})
