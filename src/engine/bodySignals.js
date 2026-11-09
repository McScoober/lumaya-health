import { addDays, dateKeyLocal } from './cyclePredictor.js'
import { trackingModulesFromProfile } from '../lib/trackingPreferences.js'
import { RULE_CONFIG_VERSION, ruleDefinition, ruleValue } from './rules/config.js'

const SIGNAL_RULE_IDS = Object.freeze({
  energy: 'SIG-ENERGY',
  skin: 'SIG-SKIN',
  sleep: 'SIG-SLEEP',
  mood: 'SIG-MOOD',
})

function clamp(value, min = 1, max = 5) {
  return Math.max(min, Math.min(max, value))
}

function plural(count, singular, pluralText = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralText}`
}

function hasSymptom(log, symptom) {
  return (log?.symptoms || []).some((item) => item.toLowerCase() === symptom.toLowerCase())
}

function hasSleepAnswer(log) {
  return ['Under 6', '6-7', '8-9', '10+'].includes(log?.sleepHours) ||
    ['Rested', 'Somewhat rested', 'Not rested'].includes(log?.rested)
}

function logsForWindow(dailyLogs = {}, days = ruleValue('signals.windowDays'), today = new Date()) {
  const rows = []
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i)
    const key = dateKeyLocal(date)
    const log = dailyLogs[key]
    if (log?.checkinCompleted || log?.mood || log?.vibe !== undefined || log?.symptoms?.length ||
      typeof log?.energy === 'number' || hasSleepAnswer(log) || typeof log?.skinBreakout === 'boolean') {
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

function signalBase(id, title, color, logCount) {
  const ruleId = SIGNAL_RULE_IDS[id]
  const definition = ruleDefinition(ruleId)
  return {
    id,
    ruleId,
    ruleSource: definition.source,
    reviewStatus: definition.reviewStatus,
    title,
    color,
    status: logCount > 0 ? 'steady' : 'empty',
    priority: 0,
    val: 'Nothing logged',
    desc: 'Nothing was logged for this area in recent check-ins.',
    trend: [],
    detail: {
      title,
      means: '',
      derived: 'Nothing was logged for this area in recent check-ins. Maisie does not treat a missing answer as no symptom.',
      uses: 'Daily logs only.',
      next: 'Add an answer for this area when you want it included.',
    },
    logCount,
    configVersion: RULE_CONFIG_VERSION,
  }
}

function applyMinimumEvidence(signal) {
  if (signal.logCount > 0 && signal.logCount < ruleValue('signals.minimumLabelCheckIns')) {
    signal.status = 'empty'
    signal.priority = 0
    signal.val = 'Just getting started'
    signal.desc = 'A few more check-ins will make this card more useful.'
  }
}

export function deriveBodySignals(dailyLogs = {}, profile = {}, options = {}) {
  const days = options.days || ruleValue('signals.windowDays')
  const today = options.today || new Date()
  const rows = logsForWindow(dailyLogs, days, today)
  const energyRows = rows.filter(({ log }) => typeof log.energy === 'number' || hasSymptom(log, 'Fatigue'))
  const skinRows = rows.filter(({ log }) => typeof log.skinBreakout === 'boolean' || hasSymptom(log, 'Skin breakout'))
  const sleepRows = rows.filter(({ log }) => (
    hasSleepAnswer(log) || hasSymptom(log, 'Sleep trouble')
  ))
  const moodRows = rows.filter(({ log }) => moodScore(log) !== null || hasSymptom(log, 'Mood changes'))

  const energy = signalBase('energy', 'Energy', options.energyColor || 'var(--signal-energy)', energyRows.length)
  const skin = signalBase('skin', 'Skin', options.skinColor || 'var(--signal-skin)', skinRows.length)
  const sleep = signalBase('sleep', 'Sleep', options.sleepColor || 'var(--signal-sleep)', sleepRows.length)
  const mood = signalBase('mood', 'Mood', options.moodColor || 'var(--signal-mood)', moodRows.length)

  if (energyRows.length > 0) {
    const energyAnswerCount = energyRows.filter(({ log }) => typeof log.energy === 'number').length
    const fatigueSymptomCount = energyRows.filter(({ log }) => hasSymptom(log, 'Fatigue')).length
    const lowEnergyDayCount = energyRows.filter(({ log }) => hasSymptom(log, 'Fatigue') || (
      typeof log.energy === 'number' && log.energy <= ruleValue('signals.lowEnergyMaximum')
    )).length
    const logCount = energyRows.length
    energy.trend = energyRows.map(({ log }) => {
      if (typeof log.energy === 'number') return clamp(log.energy)
      return hasSymptom(log, 'Fatigue') ? 2 : 3
    })
    energy.val = lowEnergyDayCount > 0 ? plural(lowEnergyDayCount, 'low day') : 'Steady'
    energy.desc = lowEnergyDayCount > 0
      ? `Lower energy or fatigue was logged in ${lowEnergyDayCount} of ${plural(logCount, 'energy check-in')}.`
      : `No lower-energy days logged across ${plural(logCount, 'energy check-in')}.`
    energy.status = lowEnergyDayCount >= ruleValue('signals.repeatedChangeDays') ? 'changed' : 'steady'
    energy.priority = lowEnergyDayCount * ruleValue('signals.energyPriorityPerLowDay')
    energy.detail = {
      title: 'Energy',
      means: 'A summary of lower energy or fatigue in recent check-ins.',
      derived: 'A day counts as lower energy when Energy is 1 or 2, or when Fatigue is selected. Mood and sleep do not change this card.',
      uses: `${plural(energyAnswerCount, 'energy answer')} and ${plural(fatigueSymptomCount, 'Fatigue entry')} from recent daily logs.`,
      next: 'Add an energy answer or select Fatigue on days it happens.',
    }
  }

  if (skinRows.length > 0) {
    const skinBreakoutCount = skinRows.filter(({ log }) => log.skinBreakout === true || hasSymptom(log, 'Skin breakout')).length
    const logCount = skinRows.length
    skin.trend = skinRows.map(({ log }) => (log.skinBreakout === true || hasSymptom(log, 'Skin breakout') ? 2 : 5))
    skin.val = skinBreakoutCount > 0 ? plural(skinBreakoutCount, 'flare-up') : 'Clear'
    skin.desc = skinBreakoutCount > 0
      ? `Skin changes were logged in ${skinBreakoutCount} of ${plural(logCount, 'skin check-in')}.`
      : `No skin breakouts were reported across ${plural(logCount, 'skin check-in')}.`
    skin.status = skinBreakoutCount >= ruleValue('signals.repeatedChangeDays') ? 'changed' : 'steady'
    skin.priority = skinBreakoutCount * ruleValue('signals.skinPriorityPerChangeDay')
    skin.detail = {
      title: 'Skin',
      means: 'Tracks skin breakouts the user actually logged.',
      derived: 'Maisie uses only check-ins that contain an explicit skin entry.',
      uses: 'Skin breakout entries in daily logs.',
      next: 'Select Skin breakout on days it happens.',
    }
  }

  if (sleepRows.length > 0) {
    const sleepTroubleCount = sleepRows.filter(({ log }) => (
      log.rested === 'Not rested' || log.sleepHours === 'Under 6' || hasSymptom(log, 'Sleep trouble')
    )).length
    const logCount = sleepRows.length
    sleep.trend = sleepRows.map(({ log }) => (
      log.rested === 'Not rested' || log.sleepHours === 'Under 6' || hasSymptom(log, 'Sleep trouble') ? 2 : 4
    ))
    sleep.val = sleepTroubleCount > 0 ? plural(sleepTroubleCount, 'rough night') : 'Solid'
    sleep.desc = sleepTroubleCount > 0
      ? `Less restful sleep was logged in ${sleepTroubleCount} of ${plural(logCount, 'sleep check-in')}.`
      : `No sleep trouble was reported across ${plural(logCount, 'sleep check-in')}.`
    sleep.status = sleepTroubleCount >= ruleValue('signals.repeatedChangeDays') ? 'changed' : 'steady'
    sleep.priority = sleepTroubleCount * ruleValue('signals.sleepPriorityPerRoughNight')
    sleep.detail = {
      title: 'Sleep',
      means: 'Tracks whether sleep trouble is showing up in daily logs.',
      derived: 'Maisie uses sleep hours, rested answers, and days where Sleep trouble was selected.',
      uses: `Sleep answers and Sleep trouble entries${profile.sleep ? `, with your profile as context: ${profile.sleep}.` : '.'}`,
      next: 'Add sleep hours, how rested you felt, or Sleep trouble when you want this card updated.',
    }
  }

  if (moodRows.length > 0) {
    const moodChangeCount = moodRows.filter(({ log }) => hasSymptom(log, 'Mood changes')).length
    const moodScores = moodRows.map(({ log }) => moodScore(log))
    const avgMood = average(moodScores)
    const logCount = moodRows.length
    mood.trend = moodScores.map((score) => score ?? 3)
    if (avgMood === null) {
      mood.val = plural(moodChangeCount, 'mood-change day')
    } else if (avgMood >= ruleValue('signals.moodUpbeatMinimum')) {
      mood.val = 'Upbeat'
    } else if (avgMood >= ruleValue('signals.moodSteadyMinimum')) {
      mood.val = 'Steady'
    } else {
      mood.val = 'Lower'
    }
    if (moodChangeCount >= ruleValue('signals.repeatedChangeDays') && (avgMood === null || avgMood >= ruleValue('signals.moodSteadyMinimum'))) {
      mood.val = plural(moodChangeCount, 'mood-change day')
    }
    mood.desc = avgMood === null
      ? `Mood changes were logged across ${plural(logCount, 'mood check-in')}.`
      : `Average mood is ${avgMood.toFixed(1)}/5 across ${plural(moodScores.filter((score) => score !== null).length, 'mood log')}.`
    if (moodChangeCount > 0 && avgMood !== null) mood.desc += ` Mood changes were logged on ${plural(moodChangeCount, 'day')}.`
    const moodLogCount = moodScores.filter((score) => score !== null).length
    mood.status = (moodLogCount >= ruleValue('signals.repeatedChangeDays') && avgMood < ruleValue('signals.moodSteadyMinimum')) || moodChangeCount >= ruleValue('signals.repeatedChangeDays') ? 'changed' : 'steady'
    mood.priority = mood.status === 'changed'
      ? Math.round((ruleValue('signals.moodSteadyMinimum') - (avgMood ?? ruleValue('signals.moodSteadyMinimum'))) * ruleValue('signals.moodPriorityPerScalePoint')) + moodChangeCount * ruleValue('signals.moodPriorityPerChangeDay')
      : 0
    mood.detail = {
      title: 'Mood',
      means: 'Shows the pattern from mood taps and mood-change symptoms.',
      derived: 'Maisie averages mood/vibe taps and notes days where Mood changes was selected.',
      uses: 'Mood/vibe taps and Mood changes entries.',
      next: 'Add a mood tap or select Mood changes when you want this card updated.',
    }
  }

  for (const signal of [energy, skin, sleep, mood]) applyMinimumEvidence(signal)
  return { energy, skin, sleep, mood }
}

export function groupBodySignals(signals = {}, profile = {}) {
  const modules = trackingModulesFromProfile(profile)
  const visibleIds = [
    'energy',
    'mood',
    ...(modules.sleep ? ['sleep'] : []),
    ...(modules.skinHair ? ['skin'] : []),
  ]
  const visible = visibleIds.map((id) => signals[id]).filter(Boolean)
  return {
    changed: visible
      .filter((signal) => signal.status === 'changed')
      .sort((left, right) => right.priority - left.priority),
    steady: visible.filter((signal) => signal.status === 'steady'),
    collecting: visible.filter((signal) => signal.status === 'empty'),
  }
}
