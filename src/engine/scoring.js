// ============================================================
// Scoring & Flagging engine (TRD Section 8)
// Pure function: (answers, profile, history) -> result object.
// Runs entirely client-side (Section 14.4). No server call.
//
// Tier 1 rules  = valid from a single instance (full severity now).
// Tier 2 rules  = pattern-dependent (capped SOFT on first occurrence 8.1),
//                 escalated only when confirmed by a later cycle (8.4).
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

// Derived birth-control flag ("P1 = Yes" in Section 8.2 = the BC check-in answer).
export function onBirthControl(answers) {
  return answers.birthControl === 'Yes'
}

// --- individual rule evaluators ----------------------------
// Each returns null (no fire) or { id, tier, severity, category, note }.

function rulePRIM(answers) {
  // PRIM-01 Primary amenorrhea — no period by 15 (Tier 1).
  const age = answers.age === '18+' ? 18 : parseInt(answers.age, 10)
  if (answers.started === 'Not yet' && Number.isFinite(age) && age >= 15) {
    const severity = age >= 16 ? SEVERITY.MODERATE : SEVERITY.MODERATE
    return {
      id: 'PRIM-01',
      tier: 1,
      severity,
      category: 'No period yet',
      note: 'No period has started by age 15.',
    }
  }
  return null
}

function ruleSTOP(answers) {
  // STOP-01 hypothalamic / STOP-02 secondary amenorrhea (Tier 1).
  const cycle = computeCycleLength(answers)
  const last = parseDate(answers.lastStart)
  const gapFromLast = last ? daysBetween(new Date(), last) : null

  // Secondary amenorrhea: previously menstruating, now a long gap (>90d).
  if (answers.started === 'Yes' && gapFromLast !== null && gapFromLast > 90) {
    return {
      id: 'STOP-02',
      tier: 1,
      severity: SEVERITY.MODERATE,
      category: 'Periods have paused',
      note: 'It’s been more than 90 days since the last period started.',
    }
  }
  // Hypothalamic amenorrhea: intense exercise / under-eating + a long or absent cycle.
  const strain = ['Exercise intensely 5+ days/wk', 'Limit eating or count calories', 'Both'].includes(
    answers.lifestyle,
  )
  const longOrMissing = cycle === null ? false : cycle > 45
  if (answers.started === 'Yes' && strain && (longOrMissing || (gapFromLast ?? 0) > 60)) {
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

function ruleENDO(answers) {
  // ENDO-01/02/03 pain patterns (Tier 2). Not affected by birth control (8.2).
  if (answers.started !== 'Yes') return null
  let score = 0
  const reasons = []
  if (typeof answers.painWorst === 'number' && answers.painWorst >= 7) { score += 2; reasons.push('severe period pain') }
  else if (typeof answers.painWorst === 'number' && answers.painWorst >= 4) { score += 1 }
  if (typeof answers.painBetween === 'number' && answers.painBetween >= 4) { score += 2; reasons.push('pain between periods') }
  if (['3', '4', '5+'].includes(answers.missedDays)) { score += 2; reasons.push('missed days from pain') }
  if (answers.bathroomPain === 'Yes, often') { score += 2; reasons.push('bathroom pain') }
  else if (answers.bathroomPain === 'Sometimes') { score += 1 }
  if (answers.nausea === 'Yes, regularly') { score += 1; reasons.push('nausea/vomiting') }
  if (answers.relievers === 'Not really') { score += 1; reasons.push('pain relievers don’t help') }
  if (answers.painTrend === 'Worse') { score += 1 }

  if (score >= 4) {
    return {
      id: 'ENDO-01',
      tier: 2,
      severity: SEVERITY.MODERATE,
      category: 'Pain pattern',
      note: reasons.slice(0, 3).join(', ') || 'a cluster of pain signals',
    }
  }
  return null
}

function rulePCOS(answers) {
  // PCOS-01 (Tier 2). If on BC, suppress the cycle-length component (8.2).
  if (answers.started !== 'Yes') return null
  const bc = onBirthControl(answers)
  let score = 0
  const reasons = []
  if (['Moderate', 'Severe'].includes(answers.acne)) { score += 1; reasons.push('acne') }
  const signs = answers.signs || []
  if (signs.includes('Hair growth')) { score += 1; reasons.push('new hair growth') }
  if (signs.includes('Dark patches')) { score += 1; reasons.push('dark skin patches') }

  if (!bc) {
    const cycle = computeCycleLength(answers)
    if (cycle !== null && cycle > 35) { score += 1; reasons.push('long cycles') }
  }
  if (score >= 2) {
    return {
      id: 'PCOS-01',
      tier: 2,
      severity: SEVERITY.MODERATE,
      category: 'Hormonal pattern',
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
  if (cycle !== null && cycle > 35) {
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

const RULES = [rulePRIM, ruleSTOP, ruleHMB, ruleENDO, rulePCOS, ruleOLIG]

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
 * @returns { level, flags, cycleLength, onBirthControl, needsAdvisor, pendingTier2 }
 */
export function scoreCheckIn(answers, opts = {}) {
  const priorTier2 = new Set(opts.priorTier2Ids || [])
  const raw = RULES.map((r) => r(answers)).filter(Boolean)

  const flags = raw.map((f) => {
    if (f.tier === 2) {
      const baseId = f.id.split('-')[0] // ENDO-01 -> ENDO, family match
      const confirmed = priorTier2.has(f.id) || priorTier2.has(baseId)
      return { ...f, confirmed, displaySeverity: confirmed ? f.severity : SEVERITY.SOFT }
    }
    return { ...f, confirmed: true, displaySeverity: f.severity }
  })

  const level = levelFromFlags(flags)
  // Tier 2 flags that fired but aren't confirmed yet are stored for passive confirmation (8.4).
  const pendingTier2 = flags.filter((f) => f.tier === 2 && !f.confirmed).map((f) => f.id)

  // Advisor CTA: shown for Tier 1 flags and confirmed Tier 2 (Section 11 / 8.1).
  const needsAdvisor =
    level === LEVEL.URGENT ||
    level === LEVEL.MODERATE ||
    flags.some((f) => (f.tier === 1) || (f.tier === 2 && f.confirmed))

  return {
    level,
    flags,
    cycleLength: computeCycleLength(answers),
    onBirthControl: onBirthControl(answers),
    needsAdvisor: needsAdvisor && level !== LEVEL.CLEAR && level !== LEVEL.MILD,
    pendingTier2,
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
    body: 'We noticed a small pattern. It’s not urgent — Lumaya will quietly watch for it over your next cycle before flagging anything more.',
  },
  [LEVEL.MODERATE]: {
    title: 'A pattern worth a conversation',
    body: 'Lumaya noticed something that’s worth talking to someone about. It doesn’t mean anything is wrong — a Lumaya advisor can help you make sense of it.',
  },
  [LEVEL.URGENT]: {
    title: 'Let’s get you support soon',
    body: 'One of your answers is worth checking on sooner rather than later. A Lumaya advisor can review your results and point you in the right direction.',
  },
}
