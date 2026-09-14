import { addDays, dateKeyLocal } from './cyclePredictor.js'

function clamp(value, min = 1, max = 5) {
  return Math.max(min, Math.min(max, value))
}

function plural(count, singular, pluralText = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralText}`
}

function hasSymptom(log, symptom) {
  return (log?.symptoms || []).some((item) => item.toLowerCase() === symptom.toLowerCase())
}

function logsForWindow(dailyLogs = {}, days = 8, today = new Date()) {
  const rows = []
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i)
    const key = dateKeyLocal(date)
    const log = dailyLogs[key]
    if (log?.checkinCompleted || log?.mood || log?.vibe !== undefined || log?.symptoms?.length) {
      rows.push({ key, log })
    }
  }
  return rows
}

function moodScore(log) {
  if (typeof log?.vibe === 'number') return log.vibe
  const label = String(log?.mood || '').toLowerCase()
  if (label === 'great') return 5
  if (label === 'good') return 4
  if (label === 'okay') return 3
  if (label === 'rough') return 2
  if (label === 'awful') return 1
  return null
}

function average(values) {
  const realValues = values.filter((value) => typeof value === 'number')
  if (realValues.length === 0) return null
  return realValues.reduce((sum, value) => sum + value, 0) / realValues.length
}

function signalBase(title, color, logCount) {
  return {
    title,
    color,
    val: 'No data yet',
    desc: 'Log daily to build this signal.',
    trend: [],
    detail: {
      title,
      means: '',
      derived: 'Not enough daily logs yet. Maisie only shows this signal from real check-ins.',
      uses: 'Daily logs only.',
      next: 'Log a few days to make this signal useful.',
    },
    logCount,
  }
}

export function deriveBodySignals(dailyLogs = {}, profile = {}, options = {}) {
  const days = options.days || 8
  const today = options.today || new Date()
  const rows = logsForWindow(dailyLogs, days, today)
  const logCount = rows.length

  const energy = signalBase('Energy', options.energyColor || 'var(--signal-energy)', logCount)
  const skin = signalBase('Skin', options.skinColor || 'var(--signal-skin)', logCount)
  const sleep = signalBase('Sleep', options.sleepColor || 'var(--signal-sleep)', logCount)
  const mood = signalBase('Mood', options.moodColor || 'var(--signal-mood)', logCount)

  if (logCount === 0) {
    return { energy, skin, sleep, mood }
  }

  const fatigueCount = rows.filter(({ log }) => hasSymptom(log, 'Fatigue')).length
  const skinBreakoutCount = rows.filter(({ log }) => hasSymptom(log, 'Skin breakout')).length
  const sleepTroubleCount = rows.filter(({ log }) => hasSymptom(log, 'Sleep trouble')).length
  const moodChangeCount = rows.filter(({ log }) => hasSymptom(log, 'Mood changes')).length
  const moodScores = rows.map(({ log }) => moodScore(log))
  const avgMood = average(moodScores)

  energy.trend = rows.map(({ log }) => {
    const base = moodScore(log) ?? 3
    const fatiguePenalty = hasSymptom(log, 'Fatigue') ? 1.5 : 0
    const sleepPenalty = hasSymptom(log, 'Sleep trouble') ? 0.5 : 0
    return clamp(base - fatiguePenalty - sleepPenalty)
  })
  energy.val = fatigueCount > 0 ? plural(fatigueCount, 'low day') : 'Steady'
  energy.desc = fatigueCount > 0
    ? `Fatigue was logged on ${plural(fatigueCount, 'day')} in the last ${days}.`
    : `No fatigue logged across ${plural(logCount, 'check-in')}.`
  energy.detail = {
    title: 'Energy',
    means: 'A read on whether low-energy symptoms are showing up in your recent logs.',
    derived: 'Maisie looks for fatigue, sleep trouble, and your mood/vibe taps across recent daily check-ins.',
    uses: 'Fatigue symptoms, sleep trouble symptoms, mood/vibe taps, and daily log dates.',
    next: 'Log fatigue when it happens. That is the strongest input for this card.',
  }

  skin.trend = rows.map(({ log }) => (hasSymptom(log, 'Skin breakout') ? 2 : 5))
  skin.val = skinBreakoutCount > 0 ? plural(skinBreakoutCount, 'flare-up') : 'Clear'
  skin.desc = skinBreakoutCount > 0
    ? `Skin breakout was logged on ${plural(skinBreakoutCount, 'day')} in the last ${days}.`
    : `No skin breakouts logged across ${plural(logCount, 'check-in')}.`
  skin.detail = {
    title: 'Skin',
    means: 'Tracks skin breakouts the user actually logged.',
    derived: 'Maisie counts daily logs where Skin breakout was selected, then compares those days over time.',
    uses: 'The Skin breakout symptom chip in daily logs.',
    next: 'Select Skin breakout on days it happens. If it is not selected, Maisie treats that day as no breakout logged.',
  }

  sleep.trend = rows.map(({ log }) => (hasSymptom(log, 'Sleep trouble') ? 2 : 4))
  sleep.val = sleepTroubleCount > 0 ? plural(sleepTroubleCount, 'rough night') : 'Solid'
  sleep.desc = sleepTroubleCount > 0
    ? `Sleep trouble was logged on ${plural(sleepTroubleCount, 'day')} in the last ${days}.`
    : `No sleep trouble logged across ${plural(logCount, 'check-in')}.`
  sleep.detail = {
    title: 'Sleep',
    means: 'Tracks whether sleep trouble is showing up in daily logs.',
    derived: 'Maisie counts logs where Sleep trouble was selected. Your sleep profile adds context, but the card is driven by daily logs.',
    uses: `Sleep trouble symptom logs${profile.sleep ? ` and your profile: ${profile.sleep}.` : '.'}`,
    next: 'Select Sleep trouble on restless nights so this card reflects what actually happened.',
  }

  mood.trend = moodScores.map((score) => score ?? 3)
  if (avgMood === null) {
    mood.val = moodChangeCount > 0 ? plural(moodChangeCount, 'mood-change day') : 'No mood yet'
  } else if (avgMood >= 4) {
    mood.val = 'Upbeat'
  } else if (avgMood >= 3) {
    mood.val = 'Steady'
  } else {
    mood.val = 'Lower'
  }
  mood.desc = avgMood === null
    ? `No mood taps logged across ${plural(logCount, 'check-in')}.`
    : `Average mood is ${avgMood.toFixed(1)}/5 across ${plural(moodScores.filter((score) => score !== null).length, 'mood log')}.`
  if (moodChangeCount > 0) mood.desc += ` Mood changes were logged on ${plural(moodChangeCount, 'day')}.`
  mood.detail = {
    title: 'Mood',
    means: 'Shows the pattern from mood taps and mood-change symptoms.',
    derived: 'Maisie averages your mood/vibe taps and notes days where Mood changes was selected.',
    uses: 'Mood/vibe taps and the Mood changes symptom chip.',
    next: 'Mood only needs one tap per day to become useful.',
  }

  return { energy, skin, sleep, mood }
}
