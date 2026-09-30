import test from 'node:test'
import assert from 'node:assert/strict'
import { bufferedMonthRange, historyPageRange, initialHistoryStart, monthCacheKey } from './historyWindow.js'

test('startup history begins at the first day of the 18-month window', () => {
  assert.equal(initialHistoryStart(new Date('2026-09-30T12:00:00')), '2025-04-01')
})

test('calendar month fetch includes enough overlap to recognize period runs', () => {
  assert.deepEqual(bufferedMonthRange(new Date('2026-09-15T12:00:00')), {
    start: '2026-08-25',
    end: '2026-10-07',
  })
})

test('older history pages use bounded calendar ranges', () => {
  assert.deepEqual(historyPageRange(new Date('2025-04-01T12:00:00')), {
    start: '2024-04-01',
    end: '2025-03-31',
    nextBefore: '2024-04-01',
  })
  assert.equal(historyPageRange('2024-04-01').nextBefore, '2023-04-01')
  assert.equal(monthCacheKey('user-1', new Date('2026-09-15')), 'user-1:2026-09')
})
