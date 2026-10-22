import { addDays, dateKeyLocal, fullCycleCount } from './cyclePredictor.js'

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

export function buildPatternEvidence(dailyLogs = {}, periodLogs = {}, now = new Date(), days = 90) {
  const end = dateKeyLocal(now)
  const start = dateKeyLocal(addDays(now, -(days - 1)))
  const rows = Object.entries(dailyLogs)
    .filter(([date, log]) => date >= start && date <= end && isCheckIn(log))
    .map(([date, log]) => ({ date, log }))

  const painDays = rows.filter(({ log }) => typeof log.pain === 'number' && log.pain >= 4).length
  const impactDays = rows.filter(({ log }) => (log.impact || []).some((impact) => impact !== 'fine')).length
  const fatigueDays = rows.filter(({ log }) => (log.symptoms || []).some((item) => String(item).toLowerCase() === 'fatigue')).length
  const bleedingFatigueDays = rows.filter(({ date, log }) => {
    const fatigue = (log.symptoms || []).some((item) => String(item).toLowerCase() === 'fatigue')
    return fatigue && (log.period === true || periodLogs[date]?.period === true)
  }).length

  const recurring = []
  if (painDays >= 2) {
    recurring.push({
      id: 'pain',
      title: 'Pain has repeated',
      body: `Pain of 4 or higher was logged on ${plural(painDays, 'day')} in this view.`,
    })
  }
  if (impactDays >= 2) {
    recurring.push({
      id: 'impact',
      title: 'Daily life was affected',
      body: `School, sleep, movement, or plans were affected on ${plural(impactDays, 'day')}.`,
    })
  }
  if (bleedingFatigueDays >= 2) {
    recurring.push({
      id: 'bleeding-fatigue',
      title: 'Fatigue and bleeding appeared together',
      body: `Both were logged on ${plural(bleedingFatigueDays, 'day')}.`,
    })
  } else if (fatigueDays >= 2) {
    recurring.push({
      id: 'fatigue',
      title: 'Fatigue has repeated',
      body: `Fatigue was logged on ${plural(fatigueDays, 'day')} in this view.`,
    })
  }

  return {
    checkInCount: rows.length,
    fullCycleCount: fullCycleCount(periodLogs),
    recurring,
    days,
  }
}

export function buildRouteSignals(result, evidence) {
  if (!result?.authoritative || evidence.checkInCount < 7 || evidence.fullCycleCount < 2) return []

  return (result.flags || []).map((flag) => {
    const early = flag.displaySeverity === 'SOFT' || (flag.tier === 2 && !flag.confirmed)
    const basis = flag.tier === 2
        ? `Based on ${plural(evidence.fullCycleCount, 'full cycle')} and ${plural(evidence.checkInCount, 'check-in')}.`
        : `Based on your saved answers and ${plural(evidence.checkInCount, 'check-in')}.`

    return {
      ...flag,
      early,
      label: early ? 'Worth keeping an eye on' : 'Worth discussing',
      basis,
    }
  })
}
