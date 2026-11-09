import { addDays, dateKeyLocal } from '../cyclePredictor.js'
import { moodSafetyStatus } from '../moodPms.js'
import { RULE_CONFIG_VERSION, ruleDefinition, ruleMetadata, ruleValue } from './config.js'

function symptomsInclude(log, names) {
  const symptoms = new Set((log?.symptoms || []).map((item) => String(item).toLowerCase()))
  return names.some((name) => symptoms.has(name.toLowerCase()))
}

function urgentBleedingEvidence(log) {
  const bleeding = log?.bleeding || {}
  const suddenSoaking = bleeding.flooding === true ||
    ['Soaked protection', 'Leaked through clothes or bedding', 'Both'].includes(log?.bleedingExperience)
  const companion = symptomsInclude(log, ['Dizziness', 'Fainting', 'Very weak'])
  return suddenSoaking && companion
}

function urgentPainEvidence(log) {
  const suddenHighPain = Number(log?.pain) >= ruleValue('safety.suddenPainMinimum')
  const companion = symptomsInclude(log, ['Fever', 'Vomiting'])
  return suddenHighPain && companion
}

export function urgentPhysicalSafetyStatus(dailyLogs = {}, now = new Date()) {
  const todayKey = typeof now === 'string' ? now : dateKeyLocal(now)
  const keys = Array.from({ length: ruleValue('safety.lookbackDays') + 1 }, (_, index) => (
    dateKeyLocal(addDays(new Date(`${todayKey}T12:00:00`), -index))
  ))
  const rows = keys.map((date) => ({ date, log: dailyLogs[date] })).filter(({ log }) => log)
  const bleeding = rows.find(({ log }) => urgentBleedingEvidence(log))
  const pain = rows.find(({ log }) => urgentPainEvidence(log))
  const triggered = Boolean(bleeding || pain)
  const ruleId = bleeding ? 'SAFETY-BLEEDING' : pain ? 'SAFETY-PAIN' : null
  const definition = ruleId ? ruleDefinition(ruleId) : null
  const thresholdReviewStatus = ruleMetadata('safety.suddenPainMinimum').reviewStatus
  const reviewStatus = definition?.reviewStatus || thresholdReviewStatus
  const reviewed = thresholdReviewStatus === 'reviewed' && definition?.reviewStatus === 'reviewed'

  return {
    active: triggered && reviewed,
    triggered,
    reason: bleeding ? 'urgent-bleeding' : pain ? 'urgent-pain' : null,
    ruleId,
    ruleSource: definition?.source || null,
    evidenceDates: [bleeding?.date, pain?.date].filter(Boolean),
    reviewStatus,
    configVersion: RULE_CONFIG_VERSION,
  }
}

export function evaluateSafetyRules({ dailyLogs = {}, now = new Date() } = {}) {
  return {
    mood: moodSafetyStatus(dailyLogs, now),
    physical: urgentPhysicalSafetyStatus(dailyLogs, now),
    configVersion: RULE_CONFIG_VERSION,
  }
}
