// ============================================================
// Notification scheduler (TRD Section 6.2 + 9)
// Prediction-based cadence starts only after enough full cycles exist:
//  - Period check-in: DAILY, but only inside the learned period window.
//  - Weekly phase check-in: ~once a week, near each new phase's start.
//  - Mid-luteal nudge: one extra touch partway through the luteal phase.
// In production these go out over SMS (Twilio, 9.1). Here they populate an
// in-app "Messages" inbox so the cadence is visible and testable.
// ============================================================

import { phaseForDate, addDays, startOfDay } from './cyclePredictor.js'
import { isInForecastRange } from './periodForecast.js'
import { tipSms } from './tipEngine.js'
import { ruleValue } from './rules/config.js'

// Build the upcoming notification schedule for the next `days` days.
export function buildSchedule(model, profile, { days = ruleValue('notifications.defaultScheduleDays'), from = new Date(), phaseTips = true, periodForecast = null } = {}) {
  const out = []
  if (!model.hasData) return out
  const today = startOfDay(from)

  let lastPhaseSeen = null
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i)
    const { phase, dayOfCycle } = phaseForDate(model, date)

    // 1. Period check-in — daily, only inside the learned window.
    if (isInForecastRange(periodForecast, date)) {
      out.push({
        date,
        type: 'period_checkin',
        title: 'Period check-in',
        body: 'Did you get your period today?',
      })
    }

    if (model.predictionsReady && phaseTips && !model.onBirthControl) {
      // 2. Weekly phase check-in — fire on the first day of a new phase.
      if (phase && phase !== lastPhaseSeen && phase !== 'menstrual') {
        out.push({
          date,
          type: 'phase_checkin',
          phase,
          title: 'Weekly phase check-in',
          body: tipSms(phase, profile),
        })
      }
      // 3. Mid-luteal nudge — one extra touch partway through luteal.
      if (phase === 'luteal') {
        const lutealStart = model.cycleLength - ruleValue('cycle.lutealEstimateDays')
        if (dayOfCycle === Math.round(lutealStart + ruleValue('notifications.midLutealOffsetDays'))) {
          out.push({
            date,
            type: 'luteal_nudge',
            phase,
            title: 'Mid-luteal nudge',
            body: 'Still in your luteal phase — it’s normal to feel lower-energy right now. Here’s a quick reset.',
          })
        }
      }
      lastPhaseSeen = phase
    } else if (model.predictionsReady && phaseTips) {
      // BC users: a lighter weekly steady-state touch.
      if (i % ruleValue('notifications.birthControlCadenceDays') === 0 && i > 0) {
        out.push({
          date,
          type: 'phase_checkin',
          phase: 'bc_generic',
          title: 'Weekly check-in',
          body: tipSms('bc_generic', profile),
        })
      }
    }
  }
  // Cap: at most one period check-in + one phase tip per day (9.2).
  return dedupePerDay(out)
}

function dedupePerDay(items) {
  const seen = new Map()
  const result = []
  for (const it of items) {
    const key = it.date.toISOString().slice(0, 10)
    const bucket = seen.get(key) || { period: false, tip: false }
    if (it.type === 'period_checkin') {
      if (bucket.period) continue
      bucket.period = true
    } else {
      if (bucket.tip) continue
      bucket.tip = true
    }
    seen.set(key, bucket)
    result.push(it)
  }
  return result
}

// The "next message" the user should see today (for the home inbox).
export function todaysMessages(model, profile, from = new Date(), preferences = {}) {
  const schedule = buildSchedule(model, profile, { days: ruleValue('notifications.todayLookupDays'), from, phaseTips: preferences.phaseTips !== false })
  const key = startOfDay(from).toISOString().slice(0, 10)
  return schedule.filter((m) => m.date.toISOString().slice(0, 10) === key)
}
