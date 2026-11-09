import { birthControlContext, lifestyleSignals } from '../data/questions.js'
import { RULE_CONFIG_VERSION, ruleDefinition, ruleValue } from './rules/config.js'

// ============================================================
// Scoring & Flagging engine (TRD Section 8)
// Pure function: (answers, profile, history) -> result object.
// Runs entirely client-side (Section 14.4). No server call.
//
// Tier 1 rules  = valid from a single instance (full severity now).
// Tier 2 rules  = pattern-dependent. They are not evaluated until at least
//                 three full cycles of real period data exist, then start as
//                 SOFT and escalate only when confirmed by later tracking.
// ============================================================

export const SEVERITY = { URGENT: 'URGENT', MODERATE: 'MODERATE', SOFT: 'SOFT' }
export const LEVEL = { CLEAR: 'Clear', MILD: 'Mild', MODERATE: 'Moderate', URGENT: 'Urgent' }

// --- helpers -----------------------------------------------
function parseDate(d) {
  if (!d || d === 'unknown') return null
  const t = Date.parse(d)
  return Number.isNaN(t) ? null : new Date(t)
}
function daysBetween(a, b) {
  if (!a || !b) return null
  return Math.round((a - b) / 86400000)
}

// Cycle length from Q3 (last start) and Q5 (period before that).
// If either date is missing/unknown, cycle length is "not yet available" (7.1).
export function computeCycleLength(answers) {
  const last = parseDate(answers.lastStart)
  const prev = parseDate(answers.prevStart)
  const len = daysBetween(last, prev)
  if (len === null || len <= 0) return null
  return len
}

// Suppress unadjusted cycle rules for known hormonal methods and unknown method types.
export function onBirthControl(answers) {
  return birthControlContext(answers).affectsCycleInterpretation
}

// --- individual rule evaluators ----------------------------
// Each returns null (no fire) or { id, tier, severity, category, note }.

function rulePRIM(answers) {
  // PRIM-01 Primary amenorrhea — no period by 15 (Tier 1).
  const age = answers.age === '18+' ? 18 : parseInt(answers.age, 10)
  if (answers.started === 'Not yet' && Number.isFinite(age) && age >= ruleValue('flags.primaryAmenorrheaAge')) {
    const severity = SEVERITY.MODERATE
    return {
      id: 'PRIM-01',
      tier: 1,
      severity,
      category: 'No period yet',
      note: `No period has started by age ${ruleValue('flags.primaryAmenorrheaAge')}.`,
    }
  }
  return null
}

function ruleSTOP(answers, context = {}) {
  // STOP-01 / STOP-02 absent or paused periods (Tier 1).
  const cycle = computeCycleLength(answers)
  const last = parseDate(answers.lastStart)
  const gapFromLast = last ? daysBetween(context.today || new Date(), last) : null

  // Secondary amenorrhea: previously menstruating, now a long gap (>90d).
  if (answers.started === 'Yes' && gapFromLast !== null && gapFromLast > ruleValue('flags.pausedPeriodDays')) {
    return {
      id: 'STOP-02',
      tier: 1,
      severity: SEVERITY.MODERATE,
      category: 'Periods have paused',
      note: `It has been more than ${ruleValue('flags.pausedPeriodDays')} days since the last period started.`,
    }
  }
  // Strain signal: intense exercise / under-eating + a long or absent cycle.
  const lifestyle = lifestyleSignals(answers.lifestyle)
  const strain = lifestyle.intenseActivity || lifestyle.fuelConcern
  const longOrMissing = cycle === null ? false : cycle > ruleValue('flags.longCycleDays')
  if (answers.started === 'Yes' && strain && (longOrMissing || (gapFromLast ?? 0) > ruleValue('flags.strainGapDays'))) {
    return {
      id: 'STOP-01',
      tier: 1,
      severity: SEVERITY.MODERATE,
      category: 'Cycle under strain',
      note: 'High training or restricted eating alongside a long or missing cycle.',
    }
  }
  return null
}

function ruleHMB(answers) {
  // HMB-01 / HMB-02 Heavy menstrual bleeding (Tier 1).
  if (answers.started !== 'Yes') return null
  const heavy = ['Heavy', 'Very heavy'].includes(answers.flow)
  const hourly = answers.changes === 'More than once/hour'
  const manyChanges = answers.changes === 'More than 6'
  const largeClots = answers.clots === 'Large clots'

  // Soaking through protection hourly = immediate, higher-severity single instance.
  if (hourly || (heavy && largeClots && manyChanges)) {
    return {
      id: 'HMB-01',
      tier: 1,
      severity: SEVERITY.URGENT,
      category: 'Very heavy bleeding',
      note: 'Soaking through protection about once an hour, or very heavy flow with large clots.',
    }
  }
  if ((heavy && (manyChanges || largeClots)) || (answers.flow === 'Very heavy')) {
    return {
      id: 'HMB-02',
      tier: 1,
      severity: SEVERITY.MODERATE,
      category: 'Heavy bleeding',
      note: 'Heavy flow with frequent changes or clots.',
    }
  }
  return null
}

function rulePAIN(answers) {
  // PAIN-01 pain and daily-life impact pattern (Tier 2).
  if (answers.started !== 'Yes') return null
  let score = 0
  const reasons = []
  if (typeof answers.painWorst === 'number' && answers.painWorst >= ruleValue('flags.highPainMinimum')) { score += ruleValue('flags.painHighWeight'); reasons.push('severe period pain') }
  else if (typeof answers.painWorst === 'number' && answers.painWorst >= ruleValue('flags.moderatePainMinimum')) { score += ruleValue('flags.painModerateWeight') }
  if (typeof answers.painBetween === 'number' && answers.painBetween >= ruleValue('flags.moderatePainMinimum')) { score += ruleValue('flags.painBetweenWeight'); reasons.push('pain between periods') }
  if (['3', '4', '5+'].includes(answers.missedDays)) { score += ruleValue('flags.painMissedDaysWeight'); reasons.push('missed days from pain') }
  if (answers.bathroomPain === 'Yes, often') { score += ruleValue('flags.painFrequentBathroomWeight'); reasons.push('bathroom pain') }
  else if (answers.bathroomPain === 'Sometimes') { score += ruleValue('flags.painOccasionalBathroomWeight') }
  if (answers.nausea === 'Yes, regularly') { score += ruleValue('flags.painNauseaWeight'); reasons.push('nausea/vomiting') }
  if (answers.relievers === 'Not really') { score += ruleValue('flags.painUnrelievedWeight'); reasons.push('pain relievers don’t help') }
  if (answers.painTrend === 'Worse') { score += ruleValue('flags.painWorseningWeight') }

  if (score >= ruleValue('flags.painRuleScore')) {
    return {
      id: 'PAIN-01',
      tier: 2,
      severity: SEVERITY.MODERATE,
      category: 'Pain pattern',
      note: reasons.slice(0, 3).join(', ') || 'a cluster of pain signals',
    }
  }
  return null
}

function ruleHORM(answers) {
  // HORM-01 skin / hair / long-cycle signal (Tier 2). If on BC, suppress the
  // cycle-length component (8.2).
  if (answers.started !== 'Yes') return null
  const bc = onBirthControl(answers)
  let score = 0
  const reasons = []
  if (['Moderate', 'Severe'].includes(answers.acne)) { score += ruleValue('flags.bodyChangeFeatureWeight'); reasons.push('acne') }
  const signs = answers.signs || []
  if (signs.includes('Hair growth')) { score += ruleValue('flags.bodyChangeFeatureWeight'); reasons.push('new hair growth') }
  if (signs.includes('Dark patches')) { score += ruleValue('flags.bodyChangeFeatureWeight'); reasons.push('dark skin patches') }

  if (!bc) {
    const cycle = computeCycleLength(answers)
    if (cycle !== null && cycle > ruleValue('flags.irregularCycleDays')) { score += ruleValue('flags.bodyChangeFeatureWeight'); reasons.push('long cycles') }
  }
  if (score >= ruleValue('flags.bodyChangeRuleScore')) {
    return {
      id: 'HORM-01',
      tier: 2,
      severity: SEVERITY.MODERATE,
      category: 'Hormone-related signal',
      note: reasons.slice(0, 3).join(', '),
      bcAdjusted: bc,
    }
  }
  return null
}

function ruleOLIG(answers) {
  // OLIG-01 long cycles (Tier 2). If on BC, do not fire at all (8.2).
  if (answers.started !== 'Yes') return null
  if (onBirthControl(answers)) return null
  const cycle = computeCycleLength(answers)
  if (cycle !== null && cycle > ruleValue('flags.irregularCycleDays')) {
    return {
      id: 'OLIG-01',
      tier: 2,
      severity: SEVERITY.MODERATE,
      category: 'Long cycles',
      note: `Cycle length around ${cycle} days.`,
    }
  }
  return null
}

const OBVIOUS_RULES = [rulePRIM, ruleSTOP, ruleHMB]
const PATTERN_RULES = [rulePAIN, ruleHORM, ruleOLIG]
const MIN_FULL_CYCLES_FOR_PATTERNS = ruleValue('gates.patternScoringFullCycles')

// --- result level logic (Section 8.3) ----------------------
function levelFromFlags(flags) {
  const tier1 = flags.filter((f) => f.tier === 1)
  const confirmedTier2 = flags.filter((f) => f.tier === 2 && f.confirmed)
  const softTier2 = flags.filter((f) => f.tier === 2 && !f.confirmed)

  if (tier1.some((f) => f.severity === SEVERITY.URGENT)) return LEVEL.URGENT
  if (tier1.some((f) => f.severity === SEVERITY.MODERATE) || confirmedTier2.length > 0) return LEVEL.MODERATE
  if (softTier2.length > 0) return LEVEL.MILD
  return LEVEL.CLEAR
}

/**
 * Score a check-in.
 * @param answers  merged answers object (deep check-in keys)
 * @param opts.priorTier2Ids  rule IDs already stored from a previous cycle (8.4).
 *                            A Tier 2 rule that fires AND is in this set is "confirmed".
 * @param opts.observedFullCycleCount number of complete cycles from real period starts.
 * @returns { level, flags, cycleLength, onBirthControl, needsAdvisor, pendingTier2 }
 */
export function scoreCheckIn(answers, opts = {}) {
  // Saved rule IDs alone cannot prove recurrence across independent cycles.
  // Leave patterns unconfirmed until cycle-linked symptom evidence is available.
  const priorTier2 = new Set()
  const observedFullCycleCount = opts.observedFullCycleCount ?? 0
  const patternsReady = observedFullCycleCount >= MIN_FULL_CYCLES_FOR_PATTERNS
  const rules = patternsReady ? [...OBVIOUS_RULES, ...PATTERN_RULES] : OBVIOUS_RULES
  const raw = rules.map((r) => r(answers, { today: opts.today })).filter(Boolean)

  const flags = raw.map((f) => {
    if (f.tier === 2) {
      const baseId = f.id.split('-')[0] // PAIN-01 -> PAIN, family match
      const confirmed = priorTier2.has(f.id) || priorTier2.has(baseId)
      return { ...f, confirmed, displaySeverity: confirmed ? f.severity : SEVERITY.SOFT, ruleVersion: RULE_CONFIG_VERSION }
    }
    return { ...f, confirmed: true, displaySeverity: f.severity, ruleVersion: RULE_CONFIG_VERSION }
  })

  const flagsWithProvenance = flags.map((flag) => ({
    ...flag,
    ruleSource: ruleDefinition(flag.id).source,
    reviewStatus: ruleDefinition(flag.id).reviewStatus,
  }))

  const level = levelFromFlags(flagsWithProvenance)
  // Tier 2 flags that fired but aren't confirmed yet are stored for passive confirmation (8.4).
  const pendingTier2 = flagsWithProvenance.filter((f) => f.tier === 2 && !f.confirmed).map((f) => f.id)

  // Advisor CTA: shown for Tier 1 flags and confirmed Tier 2 (Section 11 / 8.1).
  const needsAdvisor =
    level === LEVEL.URGENT ||
    level === LEVEL.MODERATE ||
    flagsWithProvenance.some((f) => (f.tier === 1) || (f.tier === 2 && f.confirmed))

  return {
    level,
    flags: flagsWithProvenance,
    cycleLength: computeCycleLength(answers),
    onBirthControl: onBirthControl(answers),
    needsAdvisor: needsAdvisor && level !== LEVEL.CLEAR && level !== LEVEL.MILD,
    pendingTier2,
    patternsReady,
    observedFullCycleCount,
    ruleVersion: RULE_CONFIG_VERSION,
    configVersion: RULE_CONFIG_VERSION,
    authoritative: false,
  }
}

// User-facing copy for a result level — never names a condition (13.1 / 12.4).
export const LEVEL_COPY = {
  [LEVEL.CLEAR]: {
    title: 'All clear',
    body: 'Nothing in your answers stands out as worth worrying about right now. We’ll keep tracking with you day to day.',
  },
  [LEVEL.MILD]: {
    title: 'One thing to keep an eye on',
    body: 'Your answers include a signal to keep track of. More logs can help show whether it repeats.',
  },
  [LEVEL.MODERATE]: {
    title: 'A signal worth a conversation',
    body: 'Maisie noticed something that may be worth talking through. It doesn’t mean anything is wrong — your logged details can help guide the conversation.',
  },
  [LEVEL.URGENT]: {
    title: 'Let’s get you support soon',
    body: 'One of your answers is worth checking on sooner rather than later. A Maisie advisor can review your results and point you in the right direction.',
  },
}
