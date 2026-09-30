import test from 'node:test'
import assert from 'node:assert/strict'
import { clearLegacyHealthStorage, diffRecords, trackerRecords } from './trackerRecords.js'
import { fullCycleCount } from '../engine/cyclePredictor.js'

test('only edited days are sent; explicit zero and absent pain remain distinct', () => {
  const before = trackerRecords({ dailyLogs: { '2026-09-01': { mood: 'Okay' }, '2026-09-02': { pain: 7 } } })
  const after = trackerRecords({ dailyLogs: { '2026-09-01': { mood: 'Okay', pain: 0 }, '2026-09-02': { pain: 7 } } })
  assert.deepEqual(diffRecords(before, after), { dailyLogs: { '2026-09-01': { mood: 'Okay', pain: 0 } } })
})
test('estimates and computed flags never enter the save payload', () => {
  const record = trackerRecords({ result: { level: 'Clear' }, periodLogs: {
    '2026-09-01': { period: true },
    '2026-09-02': { period: false, status: 'possible', estimatedFrom: '2026-09-01' },
  } })
  assert.equal(record.result, undefined)
  assert.deepEqual(Object.keys(record.periodLogs), ['2026-09-01'])
})
test('removed observations are explicit deletes', () => {
  const before = trackerRecords({ dailyLogs: { '2026-09-01': { pain: 7 } } })
  assert.deepEqual(diffRecords(before, trackerRecords({})), { dailyLogs: { '2026-09-01': null } })
})
test('contiguous period days count as one start and edits recalculate starts', () => {
  const logs = Object.fromEntries(['2026-06-01','2026-07-01','2026-08-01','2026-09-01'].map((date) => [date, { period: true, periodStart: true }]))
  assert.equal(fullCycleCount(logs), 3)
  logs['2026-09-02'] = { period: true }
  assert.equal(fullCycleCount(logs), 3)
  logs['2026-07-01'].period = false
  assert.equal(fullCycleCount(logs), 2)
})
test('cleanup removes only Maisie health/identity, not unrelated browser data', () => {
  const storage = { 'maisie.identity': 'test', 'maisie.health.x': 'test', unrelated: 'keep' }
  Object.defineProperty(storage, 'removeItem', { value(key) { delete this[key] } })
  clearLegacyHealthStorage(storage)
  assert.deepEqual(storage, { unrelated: 'keep' })
})
