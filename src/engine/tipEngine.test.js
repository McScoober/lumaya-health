import test from 'node:test'
import assert from 'node:assert/strict'
import { selectDailyTips } from './tipEngine.js'

const profile = { foodModule: true, trackingModules: { core: true, sleep: true, food: true } }

test('tip selection is stable for a date and observes cooldowns on later dates', () => {
  const dailyLogs = {
    '2026-10-21': { checkinCompleted: true, pain: 6 },
    '2026-10-22': { checkinCompleted: true, pain: 5 },
  }
  const first = selectDailyTips({ phase: 'menstrual', profile, dailyLogs, date: new Date('2026-10-22T12:00:00') })
  const second = selectDailyTips({ phase: 'menstrual', profile, dailyLogs, date: new Date('2026-10-22T18:00:00') })
  assert.deepEqual(first.ids, second.ids)
  assert.equal(first.primary.id, 'pain-comfort-01')

  const cooledDown = selectDailyTips({
    phase: 'menstrual', profile, dailyLogs,
    tipHistory: { 'pain-comfort-01': '2026-10-22' },
    date: new Date('2026-10-23T12:00:00'),
  })
  assert.notEqual(cooledDown.primary.id, 'pain-comfort-01')
})

test('a tip already selected today remains selected and food-sensitive mode removes fuel tips', () => {
  const dailyLogs = Object.fromEntries(Array.from({ length: 5 }, (_, index) => [
    `2026-10-${String(18 + index).padStart(2, '0')}`,
    { checkinCompleted: true, pain: 5, fuel: { meals: 'few', water: 'A little' } },
  ]))
  const selected = selectDailyTips({
    phase: 'luteal', profile, dailyLogs,
    tipHistory: { 'pain-comfort-01': '2026-10-22' },
    date: new Date('2026-10-22T12:00:00'),
  })
  assert.equal(selected.primary.id, 'pain-comfort-01')
  assert.equal(selected.fuel, null)
})
