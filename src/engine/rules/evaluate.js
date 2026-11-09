import { fullCycleCount } from '../cyclePredictor.js'
import { scoreCheckIn } from '../scoring.js'
import { evaluateSafetyRules } from './safety.js'
import { RULE_CONFIG_STATUS, RULE_CONFIG_VERSION } from './config.js'

export function evaluateRules({ answers = {}, dailyLogs = {}, periodLogs = {}, today = new Date() } = {}) {
  const screening = scoreCheckIn(answers, {
    observedFullCycleCount: fullCycleCount(periodLogs),
    today,
  })
  return {
    ...screening,
    safety: evaluateSafetyRules({ dailyLogs, now: today }),
    authoritative: true,
    authority: 'local-rules-engine',
    ruleVersion: RULE_CONFIG_VERSION,
    configVersion: RULE_CONFIG_VERSION,
    configStatus: RULE_CONFIG_STATUS,
    calculatedAt: today instanceof Date ? today.toISOString() : new Date(`${today}T12:00:00`).toISOString(),
  }
}
