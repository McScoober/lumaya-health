import assert from 'node:assert/strict'
import test from 'node:test'
import { learnLogCard } from './logCards.js'

const periodDay = (periodStart = false) => ({ period: true, periodStart, status: 'confirmed' })
const daily = (overrides = {}) => ({ checkinCompleted: true, vibe: 3, symptoms: [], impact: [], ...overrides })

test('pain card requires repeated high pain or pain with relevant impact', () => {
  const oneHighDay = { dailyLogs: { '2026-09-01': daily({ pain: 7 }) }, periodLogs: {} }
  assert.equal(learnLogCard('painful-periods', oneHighDay), null)

  const repeated = {
    dailyLogs: {
      '2026-09-01': daily({ pain: 7 }),
      '2026-09-02': daily({ pain: 8 }),
    },
    periodLogs: {},
  }
  assert.match(learnLogCard('painful-periods', repeated).text, /2 recent days/)

  const impact = { dailyLogs: { '2026-09-01': daily({ pain: 4, impact: ['school'] }) }, periodLogs: {} }
  assert.match(learnLogCard('painful-periods', impact).text, /affected school or activity/)
})

test('heavy bleeding card is based only on entered bleeding observations', () => {
  assert.equal(learnLogCard('heavy-periods', { dailyLogs: {}, periodLogs: {} }), null)
  const state = {
    dailyLogs: { '2026-10-01': daily({ bleedingExperience: 'Soaked protection' }) },
    periodLogs: { '2026-10-01': periodDay(true) },
  }
  assert.match(learnLogCard('heavy-periods', state).text, /soaking or leaking on 1 day/)
  const structured = {
    dailyLogs: { '2026-10-02': daily({ bleeding: { flooding: true, productFullness: { full: 1 } } }) },
    periodLogs: { '2026-10-02': periodDay(true) },
  }
  assert.match(learnLogCard('heavy-periods', structured).text, /soaking or leaking on 1 day/)
})

test('irregular cycle card appears above the 45-day boundary', () => {
  const base = {
    dailyLogs: {},
    periodLogs: {
      '2026-07-01': periodDay(true),
      '2026-08-15': periodDay(true),
    },
  }
  assert.equal(learnLogCard('irregular-missing-periods', base, new Date('2026-08-20T12:00:00')), null)
  base.periodLogs['2026-08-16'] = base.periodLogs['2026-08-15']
  delete base.periodLogs['2026-08-15']
  assert.match(learnLogCard('irregular-missing-periods', base, new Date('2026-08-20T12:00:00')).text, /46 days/)
})

test('pre-period mood card requires three low days before two periods', () => {
  const state = {
    periodLogs: {
      '2026-08-20': periodDay(true),
      '2026-09-20': periodDay(true),
    },
    dailyLogs: {
      '2026-08-10': daily({ vibe: 2 }),
      '2026-08-11': daily({ vibe: 2 }),
      '2026-08-12': daily({ vibe: 1 }),
      '2026-09-10': daily({ vibe: 2 }),
      '2026-09-11': daily({ vibe: 1 }),
      '2026-09-12': daily({ vibe: 2 }),
    },
  }
  assert.match(learnLogCard('pms-pmdd', state).text, /before 2 logged periods/)
})

test('food card respects module and sensitive-content preferences', () => {
  assert.equal(learnLogCard('food-and-your-cycle', { profile: {} }), null)
  assert.ok(learnLogCard('food-and-your-cycle', { profile: { foodModule: true } }))
  assert.equal(learnLogCard('food-and-your-cycle', { profile: { foodModule: true, sensitiveFoodMode: true } }), null)
  const recentFewMeals = Object.fromEntries(Array.from({ length: 5 }, (_, index) => [
    `2026-10-${String(index + 1).padStart(2, '0')}`,
    daily({ fuel: { meals: 'few' } }),
  ]))
  assert.equal(learnLogCard('food-and-your-cycle', { profile: { foodModule: true }, dailyLogs: recentFewMeals }), null)
})

test('context cards never name a diagnosis', () => {
  const state = {
    answers: { acne: 'Severe', signs: ['Hair growth'] },
    profile: { foodModule: true },
    dailyLogs: {
      '2026-09-01': daily({ pain: 8 }),
      '2026-09-02': daily({ pain: 7 }),
    },
    periodLogs: {},
  }
  const text = ['painful-periods', 'acne-hair-hormones', 'food-and-your-cycle']
    .map((slug) => learnLogCard(slug, state)?.text || '')
    .join(' ')
  assert.doesNotMatch(text, /\b(PMOS|PCOS|endometriosis|PMDD|adenomyosis|bleeding disorder)\b/i)
})
