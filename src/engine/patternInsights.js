import { addDays, dateKeyLocal, fullCycleCount } from './cyclePredictor.js'
import { analyzeMoodPattern } from './moodPms.js'
import { RULE_CONFIG_VERSION, ruleDefinition, ruleMetadata, ruleValue, serverRuleVersionStatus } from './rules/config.js'

const OBSERVATION_RULE_IDS = Object.freeze({
  pain: 'OBS-PAIN',
  impact: 'OBS-IMPACT',
  'bleeding-fatigue': 'OBS-BLEEDING-FATIGUE',
  fatigue: 'OBS-FATIGUE',
  'mood-timing': 'OBS-MOOD-TIMING',
})

function observationProvenance(id) {
  const ruleId = OBSERVATION_RULE_IDS[id]
  const definition = ruleDefinition(ruleId)
  return { ruleId, ruleSource: definition.source, reviewStatus: definition.reviewStatus }
}

export const PATTERN_OBSERVATION_META = Object.freeze({
  pain: Object.freeze({
    title: 'Pain was logged on several days',
    focusSection: 'pain',
    missing: 'Pain timing, what helped, and daily impact can make this summary clearer when you choose to log them.',
    next: 'Keep logging pain level, timing, what helped, and any effect on your day.',
    visitScript: 'I logged pain of 4 or higher on several days, and I would like to understand what I should track or discuss next.',
  }),
  impact: Object.freeze({
    title: 'Daily life was affected',
    focusSection: 'impact',
    missing: 'More detail about which activities were affected and how often can make this summary clearer.',
    next: 'Keep logging when symptoms affect school, sleep, movement, plans, or other daily activities.',
    visitScript: 'I logged that symptoms affected my daily life on more than one day, and I would like to talk about what support may help.',
  }),
  'bleeding-fatigue': Object.freeze({
    title: 'Fatigue showed up more often on bleeding days',
    focusSection: 'symptoms',
    missing: 'Flow, protection fullness, soaking, dizziness, and daily impact can add context when you choose to log them.',
    next: 'Keep logging fatigue, bleeding details, and any effect on your day when they apply.',
    visitScript: 'I logged fatigue more often on bleeding days in this view, and I would like to understand what information would be useful to review.',
  }),
  fatigue: Object.freeze({
    title: 'Fatigue was logged on several days',
    focusSection: 'symptoms',
    missing: 'Sleep, bleeding, meals, movement, and daily impact can add context when you choose to track them.',
    next: 'Keep logging fatigue and any other changes that happen on the same day.',
    visitScript: 'I logged fatigue on more than one day, and I would like to discuss what I should keep tracking.',
  }),
  'mood-timing': Object.freeze({
    title: 'Mood timing has repeated',
    focusSection: 'mood',
    missing: 'More before-and-after cycle observations and daily-impact details can make the timing clearer.',
    next: 'Keep logging mood timing, intensity, and any effect on daily life.',
    visitScript: 'I noticed a repeated timing pattern in my mood logs, and I would like to discuss how it affects me and what to track next.',
  }),
})

function isCheckIn(log) {
  return Boolean(
    log?.checkinCompleted ||
    log?.mood ||
    log?.vibe !== undefined ||
    log?.symptoms?.length ||
    log?.pain !== undefined ||
    log?.impact !== undefined,
  )
}

function plural(count, singular, pluralText = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralText}`
}

export function buildPatternEvidence(dailyLogs = {}, periodLogs = {}, now = new Date(), days = ruleValue('observations.windowDays')) {
  const end = dateKeyLocal(now)
  const start = dateKeyLocal(addDays(now, -(days - 1)))
  const rows = Object.entries(dailyLogs)
    .filter(([date, log]) => date >= start && date <= end && isCheckIn(log))
    .map(([date, log]) => ({ date, log }))

  const painRows = rows.filter(({ log }) => typeof log.pain === 'number' && log.pain >= ruleValue('observations.painMinimum'))
  const impactRows = rows.filter(({ log }) => (log.impact || []).some((impact) => impact !== 'fine'))
  const fatigueRows = rows.filter(({ log }) => (log.symptoms || []).some((item) => String(item).toLowerCase() === 'fatigue'))
  const periodStatus = ({ date, log }) => typeof log.period === 'boolean' ? log.period : periodLogs[date]?.period
  const bleedingRows = rows.filter((row) => periodStatus(row) === true)
  const nonBleedingRows = rows.filter((row) => periodStatus(row) === false)
  const bleedingFatigueRows = fatigueRows.filter((row) => periodStatus(row) === true)
  const nonBleedingFatigueRows = fatigueRows.filter((row) => periodStatus(row) === false)
  const painDays = painRows.length
  const impactDays = impactRows.length
  const fatigueDays = fatigueRows.length
  const bleedingFatigueDays = bleedingFatigueRows.length
  const minimumCheckIns = ruleValue('observations.minimumCheckIns')
  const repeatedDays = ruleValue('observations.minimumRepeatedDays')
  const minimumEventShare = ruleValue('observations.minimumEventShare')
  const enoughRepeatedEvidence = (count) => (
    rows.length >= minimumCheckIns && count >= repeatedDays && count / rows.length >= minimumEventShare
  )
  const bleedingFatigueRate = bleedingRows.length ? bleedingFatigueDays / bleedingRows.length : 0
  const nonBleedingFatigueRate = nonBleedingRows.length ? nonBleedingFatigueRows.length / nonBleedingRows.length : 0
  const bleedingFatigueRateDifference = bleedingFatigueRate - nonBleedingFatigueRate
  const enoughBleedingFatigueEvidence = (
    rows.length >= minimumCheckIns &&
    bleedingRows.length >= ruleValue('observations.minimumExposureDays') &&
    nonBleedingRows.length >= ruleValue('observations.minimumExposureDays') &&
    bleedingFatigueDays >= repeatedDays &&
    bleedingFatigueRateDifference >= ruleValue('observations.minimumRateDifference')
  )

  const recurring = []
  const moodPattern = analyzeMoodPattern(Object.fromEntries(rows.map(({ date, log }) => [date, log])), periodLogs)
  if (enoughRepeatedEvidence(painDays)) {
    recurring.push({
      id: 'pain',
      ...observationProvenance('pain'),
      ...PATTERN_OBSERVATION_META.pain,
      body: `Pain of ${ruleValue('observations.painMinimum')} or higher was logged on ${painDays} of ${rows.length} check-in days.`,
      dates: painRows.map(({ date }) => date),
      impactDays: painRows.filter(({ log }) => (log.impact || []).some((impact) => impact !== 'fine')).length,
    })
  }
  if (enoughRepeatedEvidence(impactDays)) {
    recurring.push({
      id: 'impact',
      ...observationProvenance('impact'),
      ...PATTERN_OBSERVATION_META.impact,
      body: `School, sleep, movement, or plans were affected on ${impactDays} of ${rows.length} check-in days.`,
      dates: impactRows.map(({ date }) => date),
      impactDays,
    })
  }
  if (enoughBleedingFatigueEvidence) {
    recurring.push({
      id: 'bleeding-fatigue',
      ...observationProvenance('bleeding-fatigue'),
      ...PATTERN_OBSERVATION_META['bleeding-fatigue'],
      body: `Fatigue was logged on ${bleedingFatigueDays} of ${bleedingRows.length} bleeding check-in days and ${nonBleedingFatigueRows.length} of ${nonBleedingRows.length} non-bleeding check-in days.`,
      dates: bleedingFatigueRows.map(({ date }) => date),
      impactDays: bleedingFatigueRows.filter(({ log }) => (log.impact || []).some((impact) => impact !== 'fine')).length,
    })
  } else if (enoughRepeatedEvidence(fatigueDays)) {
    recurring.push({
      id: 'fatigue',
      ...observationProvenance('fatigue'),
      ...PATTERN_OBSERVATION_META.fatigue,
      body: `Fatigue was logged on ${fatigueDays} of ${rows.length} check-in days.`,
      dates: fatigueRows.map(({ date }) => date),
      impactDays: fatigueRows.filter(({ log }) => (log.impact || []).some((impact) => impact !== 'fine')).length,
    })
  }
  if (moodPattern.matchedCycles > 0) {
    recurring.push({
      id: 'mood-timing',
      ...observationProvenance('mood-timing'),
      ...PATTERN_OBSERVATION_META['mood-timing'],
      title: moodPattern.repeated ? 'Mood timing has repeated' : 'Mood timing to keep tracking',
      body: moodPattern.summary,
      dates: rows.filter(({ log }) => Object.keys(log.moodItems || {}).length > 0).map(({ date }) => date),
      impactDays: rows.filter(({ log }) => Object.keys(log.moodItems || {}).length > 0 && log.functionalImpact && log.functionalImpact !== 'none').length,
    })
  }

  return {
    checkInCount: rows.length,
    fullCycleCount: fullCycleCount(periodLogs),
    recurring,
    moodPattern,
    days,
    configVersion: RULE_CONFIG_VERSION,
  }
}

function reviewedGateValue(key, fallbackKey) {
  return ruleMetadata(key).reviewStatus === 'reviewed' ? ruleValue(key) : ruleValue(fallbackKey)
}

function gateForFlag(flag) {
  if (['PRIM-01', 'STOP-01', 'STOP-02', 'PAIN-NOW'].includes(flag.id)) {
    return {
      checkIns: reviewedGateValue('gates.immediateCheckIns', 'gates.defaultCheckIns'),
      fullCycles: reviewedGateValue('gates.immediateFullCycles', 'gates.defaultFullCycles'),
    }
  }
  if (['HMB-01', 'HMB-02'].includes(flag.id)) {
    return {
      checkIns: reviewedGateValue('gates.heavyBleedingCheckIns', 'gates.defaultCheckIns'),
      fullCycles: reviewedGateValue('gates.heavyBleedingFullCycles', 'gates.defaultFullCycles'),
    }
  }
  if (flag.id === 'PAIN-01') {
    return {
      checkIns: reviewedGateValue('gates.painEarlyCheckIns', 'gates.defaultCheckIns'),
      fullCycles: reviewedGateValue('gates.painEarlyFullCycles', 'gates.defaultFullCycles'),
    }
  }
  return { checkIns: ruleValue('gates.defaultCheckIns'), fullCycles: ruleValue('gates.defaultFullCycles') }
}

export function buildRouteSignals(result, evidence) {
  const signals = (result?.authoritative ? result.flags || [] : []).filter((flag) => {
    const gate = gateForFlag(flag)
    return evidence.checkInCount >= gate.checkIns && evidence.fullCycleCount >= gate.fullCycles
  }).map((flag) => {
    const early = flag.displaySeverity === 'SOFT' || (flag.tier === 2 && !flag.confirmed)
    const basis = flag.tier === 2
        ? `Based on ${plural(evidence.fullCycleCount, 'full cycle')} and ${plural(evidence.checkInCount, 'check-in')}.`
        : `Based on your saved answers and ${plural(evidence.checkInCount, 'check-in')}.`

    return {
      ...flag,
      early,
      label: early ? 'Worth keeping an eye on' : 'Worth discussing',
      basis,
      configVersion: RULE_CONFIG_VERSION,
      serverRuleVersionStatus: serverRuleVersionStatus(result),
    }
  })
  if (evidence.moodPattern?.worthDiscussing) {
    signals.push({
      id: 'mood-timing',
      category: 'Mood timing',
      note: evidence.moodPattern.summary,
      early: false,
      label: 'Worth discussing',
      basis: `Based on ${plural(evidence.moodPattern.matchedCycles, 'logged cycle')}.`,
      configVersion: RULE_CONFIG_VERSION,
    })
  }
  return signals
}

export function buildCarePreparationState(result, evidence, routeSignals = []) {
  if (routeSignals.length > 0) {
    return {
      stage: 'discussion',
      heading: 'Worth discussing',
      title: `${plural(routeSignals.length, 'item')} ready to prepare`,
      body: 'Review what Maisie noticed, then choose what you want to bring to a health conversation.',
      note: '',
    }
  }

  const recurringCount = evidence.recurring?.length || 0
  let note = ''

  if (evidence.checkInCount < ruleValue('gates.defaultCheckIns')) {
    const remaining = ruleValue('gates.defaultCheckIns') - evidence.checkInCount
    note = `Maisie is still collecting ${plural(remaining, 'more logged day')} before checking for repeated care signals.`
  } else if (evidence.fullCycleCount < ruleValue('gates.defaultFullCycles')) {
    note = `Maisie waits for ${ruleValue('gates.defaultFullCycles')} completed cycles before showing repeated care signals. You can still prepare or seek care now.`
  } else if (result?.authoritative) {
    note = 'No repeat showed up in these logs. This is not an all-clear; Maisie can only reflect what you log.'
  } else {
    note = 'Care signals will update after your saved answers are checked.'
  }

  if (recurringCount > 0) {
    return {
      stage: 'observations',
      heading: 'Prepare for care',
      title: `${plural(recurringCount, 'observation')} ready to review`,
      body: `You can include ${recurringCount === 1 ? 'this pattern' : 'these patterns'} in your summary and bring ${recurringCount === 1 ? 'it' : 'them'} to a health conversation.`,
      note,
    }
  }

  return {
    stage: 'available',
    heading: 'Prepare for care',
    title: 'Care preparation is always available',
    body: 'You do not need to wait for a Maisie signal to prepare questions or look for support.',
    note,
  }
}
