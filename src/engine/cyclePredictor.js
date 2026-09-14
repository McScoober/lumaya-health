// ============================================================
// Cycle phase model & predictor (TRD Section 6.1)
// Four phases for non-BC users; a simpler active/break track for BC users.
// Cycle length is refined over time by daily check-ins, not a one-time estimate.
// ============================================================

export const PHASES = ['menstrual', 'follicular', 'ovulation', 'luteal']

export const PHASE_META = {
  menstrual:  { label: 'your period',  accent: 'var(--phase-menstrual)', soft: '#FCEEF1', mood: 'Cozy and low-key' },
  follicular: { label: 'building back up', accent: 'var(--phase-follicular)', soft: '#EFF6EA', mood: 'Rising energy' },
  ovulation:  { label: 'peak energy',  accent: 'var(--phase-ovulation)', soft: '#FCF3DC', mood: 'Peak energy' },
  luteal:     { label: 'winding down',     accent: 'var(--phase-luteal)', soft: '#F1ECF8', mood: 'Winding down' },
  // BC track, neutral pink/berry tint
  bc_active:  { label: 'Steady',     accent: 'var(--pink-accent)', soft: 'var(--pink-light)', mood: 'Even keel' },
  bc_break:  { label: 'Break days',  accent: 'var(--pink-accent)', soft: 'var(--pink-light)', mood: 'Light week' },
  bc_generic: { label: 'This week',  accent: 'var(--pink-accent)', soft: 'var(--pink-light)', mood: 'Steady' },
}

const DEFAULT_CYCLE = 28
const PERIOD_LEN = 5

const MS_DAY = 86400000
export function dateKeyLocal(d = new Date()) {
  const x = startOfDay(d)
  const y = x.getFullYear()
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const day = String(x.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function parseDateLocal(value) {
  if (value instanceof Date) return value
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`)
  }
  return new Date(value)
}

function addDays(d, n) {
  return new Date(startOfDay(d).getTime() + n * MS_DAY)
}
function diffDays(a, b) {
  return Math.round((startOfDay(a) - startOfDay(b)) / MS_DAY)
}

/**
 * Build a cycle model from the user's data.
 * @param opts.lastStart  ISO date of most recent period start (from check-in or daily logs)
 * @param opts.cycleLength computed cycle length in days (may be null)
 * @param opts.onBirthControl boolean
 * @param opts.predictionsReady boolean true only after enough full cycles exist
 * @param opts.bcSchedule { activeDays, breakDays } optional for BC users
 */
export function buildCycleModel(opts = {}) {
  const cycleLength = clamp(opts.cycleLength || DEFAULT_CYCLE, 21, 45)
  const periodLen = PERIOD_LEN
  const lastStart = opts.lastStart ? startOfDay(parseDateLocal(opts.lastStart)) : null

  return {
    cycleLength,
    periodLen,
    lastStart,
    onBirthControl: !!opts.onBirthControl,
    bcSchedule: opts.bcSchedule || null,
    predictionsReady: !!opts.predictionsReady,
    hasData: !!lastStart,
  }
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}

// Which phase is `date` in, given the model?
export function phaseForDate(model, date = new Date()) {
  if (!model.lastStart) return { phase: model.onBirthControl ? 'bc_generic' : null, dayOfCycle: null }

  const { cycleLength, periodLen } = model
  let dayOfCycle = ((diffDays(date, model.lastStart) % cycleLength) + cycleLength) % cycleLength

  if (model.onBirthControl) {
    // Simple active vs break/placebo split (6.1). Default 21 active / 7 break if unknown.
    const active = model.bcSchedule?.activeDays ?? 21
    const cyc = active + (model.bcSchedule?.breakDays ?? 7)
    const d = ((diffDays(date, model.lastStart) % cyc) + cyc) % cyc
    return { phase: d < active ? 'bc_active' : 'bc_break', dayOfCycle: d }
  }

  // Non-BC four-phase model
  const ovulationDay = cycleLength - 14 // luteal is ~14 days
  let phase
  if (dayOfCycle < periodLen) phase = 'menstrual'
  else if (dayOfCycle < ovulationDay - 1) phase = 'follicular'
  else if (dayOfCycle <= ovulationDay + 1) phase = 'ovulation'
  else phase = 'luteal'
  return { phase, dayOfCycle }
}

// Predicted next period start + the "period window" (6.2) used for daily check-ins.
export function predictPeriod(model, from = new Date()) {
  if (!model.lastStart) return null
  const { cycleLength, periodLen } = model
  const daysSince = diffDays(from, model.lastStart)
  const cyclesElapsed = Math.floor(daysSince / cycleLength)
  let nextStart = addDays(model.lastStart, (cyclesElapsed + 1) * cycleLength)
  // If we're currently mid-period, the "current" start is the relevant one.
  const dayOfCycle = ((daysSince % cycleLength) + cycleLength) % cycleLength
  const inPeriodNow = dayOfCycle < periodLen
  const currentStart = addDays(model.lastStart, cyclesElapsed * cycleLength)

  return {
    nextStart,
    daysUntil: diffDays(nextStart, from),
    windowStart: inPeriodNow ? currentStart : nextStart,
    windowEnd: addDays(inPeriodNow ? currentStart : nextStart, periodLen - 1),
    inPeriodWindow: inPeriodNow,
  }
}

export function isInPeriodWindow(model, date = new Date()) {
  const p = predictPeriod(model, date)
  if (!p) return false
  return diffDays(date, p.windowStart) >= 0 && diffDays(date, p.windowEnd) <= 0
}

export function periodStartKeys(periodLogs = {}) {
  const periodKeys = Object.entries(periodLogs)
    .filter(([, log]) => log?.period === true)
    .map(([key]) => key)
    .sort()

  if (periodKeys.length === 0) return []

  const periodSet = new Set(periodKeys)
  const explicitStarts = Object.entries(periodLogs)
    .filter(([, log]) => log?.period === true && log?.periodStart === true)
    .map(([key]) => key)
    .sort()

  if (explicitStarts.length > 0) return explicitStarts

  return periodKeys.filter((key) => {
    const prevKey = dateKeyLocal(addDays(parseDateLocal(key), -1))
    return !periodSet.has(prevKey)
  })
}

export function fullCycleCount(periodLogs = {}) {
  return Math.max(0, periodStartKeys(periodLogs).length - 1)
}

export function hasThreeFullCycles(periodLogs = {}) {
  return fullCycleCount(periodLogs) >= 3
}

// Calendar cells for a given month.
export function monthMatrix(model, year, month, dailyLogs = {}, periodLogs = {}) {
  const first = new Date(year, month, 1)
  const startDow = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  const today = startOfDay(new Date())

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    const { phase } = phaseForDate(model, date)
    const key = dateKeyLocal(date)
    const legacyKey = date.toISOString().slice(0, 10)
    const logged = dailyLogs[key] || dailyLogs[legacyKey]
    const periodEntry = periodLogs[key] || periodLogs[legacyKey]
    const inWindow = isInPeriodWindow(model, date)
    const isPast = diffDays(date, today) < 0
    const isLogged = !!logged?.checkinCompleted ||
      logged?.vibe !== undefined ||
      logged?.mood !== undefined ||
      logged?.symptoms !== undefined ||
      logged?.pain !== undefined ||
      logged?.impact !== undefined
    const knownPeriodDay = model.lastStart &&
      diffDays(date, model.lastStart) >= 0 &&
      diffDays(date, model.lastStart) < model.periodLen
    cells.push({
      day: d,
      date,
      key,
      phase,
      isToday: diffDays(date, today) === 0,
      isLogged,
      loggedPeriod: periodEntry?.period === true || logged?.period === true || knownPeriodDay,
      predictedPeriod: inWindow && !isPast,
      actualPeriod: periodEntry?.period === true || logged?.period === true || knownPeriodDay,
    })
  }
  return cells
}

export { addDays, diffDays, startOfDay }
