// ============================================================
// Cycle phase model & predictor (TRD Section 6.1)
// Four phases for non-BC users; a simpler active/break track for BC users.
// Cycle length is refined over time by daily check-ins, not a one-time estimate.
// ============================================================

export const PHASES = ['menstrual', 'follicular', 'ovulation', 'luteal']

export const PHASE_META = {
  menstrual:  { label: 'Menstrual',  accent: '#E08097', soft: '#FCEEF1', mood: 'Cozy and low-key' },
  follicular: { label: 'Follicular', accent: '#7FB069', soft: '#EFF6EA', mood: 'Rising energy' },
  ovulation:  { label: 'Ovulation',  accent: '#E8B84B', soft: '#FCF3DC', mood: 'Peak energy' },
  luteal:     { label: 'Luteal',     accent: '#9B7FC2', soft: '#F1ECF8', mood: 'Winding down' },
  // BC track — neutral pink/berry tint (6.1 / 13.2.3)
  bc_active:  { label: 'Steady',     accent: '#C25070', soft: '#FBEAF0', mood: 'Even keel' },
  bc_break:  { label: 'Break days',  accent: '#C25070', soft: '#FBEAF0', mood: 'Light week' },
  bc_generic: { label: 'This week',  accent: '#C25070', soft: '#FBEAF0', mood: 'Steady' },
}

const DEFAULT_CYCLE = 28
const PERIOD_LEN = 5

const MS_DAY = 86400000
function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
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
 * @param opts.bcSchedule { activeDays, breakDays } optional for BC users
 */
export function buildCycleModel(opts = {}) {
  const cycleLength = clamp(opts.cycleLength || DEFAULT_CYCLE, 21, 45)
  const periodLen = PERIOD_LEN
  const lastStart = opts.lastStart ? startOfDay(new Date(opts.lastStart)) : null

  return {
    cycleLength,
    periodLen,
    lastStart,
    onBirthControl: !!opts.onBirthControl,
    bcSchedule: opts.bcSchedule || null,
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

// Calendar cells for a given month.
export function monthMatrix(model, year, month, dailyLogs = {}) {
  const first = new Date(year, month, 1)
  const startDow = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  const today = startOfDay(new Date())

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    const { phase } = phaseForDate(model, date)
    const key = date.toISOString().slice(0, 10)
    const logged = dailyLogs[key]
    const inWindow = isInPeriodWindow(model, date)
    const isPast = diffDays(date, today) < 0
    cells.push({
      day: d,
      date,
      key,
      phase,
      isToday: diffDays(date, today) === 0,
      loggedPeriod: logged?.period === true,
      predictedPeriod: inWindow && !isPast,
      actualPeriod: logged?.period === true,
    })
  }
  return cells
}

export { addDays, diffDays, startOfDay }
