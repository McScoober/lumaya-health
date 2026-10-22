import { dateKeyLocal, diffDays, periodStartKeys } from '../../engine/cyclePredictor.js'
import { foodContentIsEnabled } from '../../lib/trackingPreferences.js'

function parseDate(key) {
  const value = new Date(`${key}T12:00:00`)
  return Number.isNaN(value.getTime()) ? null : value
}

function realDailyLogs(state) {
  return Object.entries(state?.dailyLogs || {})
    .filter(([, log]) => log?.checkinCompleted === true)
    .sort(([left], [right]) => left.localeCompare(right))
}

function recentLogs(state, days, today) {
  return realDailyLogs(state).filter(([key]) => {
    const date = parseDate(key)
    return date && diffDays(today, date) >= 0 && diffDays(today, date) < days
  })
}

function impactIncludes(log, options) {
  return (log?.impact || []).some((item) => options.includes(item))
}

function painfulPeriodsCard(state) {
  const starts = periodStartKeys(state?.periodLogs || {})
  const recentBoundary = starts.length >= 2 ? starts.at(-2) : null
  const logs = realDailyLogs(state).filter(([key]) => !recentBoundary || key >= recentBoundary)
  const highPainDays = logs.filter(([, log]) => Number(log?.pain) >= 7).length
  const impactPain = logs.some(([, log]) => Number(log?.pain) >= 4 && impactIncludes(log, ['school', 'activity']))
  if (highPainDays < 2 && !impactPain) return null
  return {
    title: 'From your log',
    text: highPainDays >= 2
      ? `You rated pain 7 or higher on ${highPainDays} recent days. Here is what that can mean and what to ask.`
      : 'You logged pain that affected school or activity. Here is what that can mean and what to ask.',
  }
}

function heavyPeriodsCard(state) {
  const starts = periodStartKeys(state?.periodLogs || {})
  const latestStart = starts.at(-1)
  const logs = realDailyLogs(state).filter(([key]) => !latestStart || key >= latestStart)
  const heavyLogs = logs.filter(([, log]) =>
    ['Soaked protection', 'Leaked through clothes or bedding', 'Both'].includes(log?.bleedingExperience),
  )
  const longBleeding = logs.some(([, log]) => log?.bleedingDuration === 'More than 7 days')
  if (heavyLogs.length === 0 && !longBleeding) return null
  return {
    title: 'From your log',
    text: heavyLogs.length > 0
      ? `You logged soaking or leaking on ${heavyLogs.length} ${heavyLogs.length === 1 ? 'day' : 'days'} this cycle. Here is how to tell what is typical.`
      : 'You logged bleeding lasting more than 7 days. Here is what is worth asking about.',
  }
}

function irregularPeriodsCard(state, today) {
  const starts = periodStartKeys(state?.periodLogs || {})
  const latest = parseDate(starts.at(-1))
  const previous = parseDate(starts.at(-2))
  const lastCycleLength = latest && previous ? diffDays(latest, previous) : null
  const gap = latest ? diffDays(today, latest) : null
  if (!(lastCycleLength > 45 || gap > 60)) return null
  return {
    title: 'From your log',
    text: lastCycleLength > 45
      ? `Your last logged cycle was ${lastCycleLength} days. Here is what is common and when to ask.`
      : `It has been ${gap} days since your last logged period start. Here is when a longer gap is worth asking about.`,
  }
}

function acneHairCard(state, today) {
  const skinDays = recentLogs(state, 30, today)
    .filter(([, log]) => (log?.symptoms || []).includes('Skin breakout')).length
  const acneAnswer = state?.answers?.acne
  const signs = state?.answers?.signs || []
  if (skinDays < 10 && !['Moderate', 'Severe'].includes(acneAnswer) && !signs.includes('Hair growth')) return null
  return {
    title: 'From your log',
    text: 'You have noted skin or hair changes. Here is what can be part of puberty and what is worth asking about.',
  }
}

function prePeriodMoodCard(state) {
  const starts = periodStartKeys(state?.periodLogs || {})
  if (starts.length < 2) return null
  const logs = realDailyLogs(state)
  const matchingPeriods = starts.filter((startKey) => {
    const start = parseDate(startKey)
    if (!start) return false
    return logs.filter(([key, log]) => {
      const date = parseDate(key)
      const daysBefore = date ? diffDays(start, date) : null
      return daysBefore >= 1 && daysBefore <= 14 && Number(log?.vibe) <= 2
    }).length >= 3
  }).length
  if (matchingPeriods < 2) return null
  return {
    title: 'From your log',
    text: `Your mood dipped before ${matchingPeriods} logged periods. Here is why timing matters and what to ask.`,
  }
}

function foodCard(state) {
  if (!foodContentIsEnabled(state?.profile)) return null
  return {
    title: 'From your preferences',
    text: 'You chose to include food and fuel. Here is how appetite and energy can shift without counting or judging food.',
  }
}

export function learnLogCard(slug, state, today = new Date()) {
  const safeToday = parseDate(dateKeyLocal(today)) || today
  if (slug === 'painful-periods') return painfulPeriodsCard(state)
  if (slug === 'heavy-periods') return heavyPeriodsCard(state)
  if (slug === 'irregular-missing-periods') return irregularPeriodsCard(state, safeToday)
  if (slug === 'acne-hair-hormones') return acneHairCard(state, safeToday)
  if (slug === 'pms-pmdd') return prePeriodMoodCard(state)
  if (slug === 'food-and-your-cycle') return foodCard(state)
  return null
}
