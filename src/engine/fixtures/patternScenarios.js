import { addDays, dateKeyLocal } from '../cyclePredictor.js'

export const patternFixtureNow = new Date(2026, 9, 17, 12)

export function makePatternScenario({
  days,
  bleedingDays = [],
  fatigueDays = [],
  painDays = [],
  impactDays = [],
}) {
  const bleeding = new Set(bleedingDays)
  const fatigue = new Set(fatigueDays)
  const pain = new Set(painDays)
  const impact = new Set(impactDays)
  const dailyLogs = {}
  const periodLogs = {}

  for (let offset = 0; offset < days; offset += 1) {
    const date = dateKeyLocal(addDays(patternFixtureNow, -offset))
    dailyLogs[date] = {
      checkinCompleted: true,
      vibe: 3,
      energy: 3,
      pain: pain.has(offset) ? 4 : 0,
      symptoms: fatigue.has(offset) ? ['Fatigue'] : [],
      impact: impact.has(offset) ? ['school'] : [],
    }
    periodLogs[date] = { period: bleeding.has(offset) }
  }

  return { dailyLogs, periodLogs, now: patternFixtureNow }
}

export const highBleedingPrevalenceStressFixture = makePatternScenario({
  days: 60,
  bleedingDays: Array.from({ length: 48 }, (_, index) => index),
  fatigueDays: [2, 17, 39, 50, 59],
  painDays: [10, 20, 30],
})

export const repeatedPainFixture = makePatternScenario({
  days: 30,
  bleedingDays: [0, 1, 2, 3, 4, 5],
  painDays: [0, 4, 8, 12, 16, 20],
})

export const bleedingFatigueContrastFixture = makePatternScenario({
  days: 30,
  bleedingDays: Array.from({ length: 12 }, (_, index) => index),
  fatigueDays: [0, 2, 4, 6, 8, 10, 15],
})
