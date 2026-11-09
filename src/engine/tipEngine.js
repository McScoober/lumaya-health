// ============================================================
// Tip selection engine (TRD Section 6.3)
// Tag-combination rule: collect every modifier tag matching the user's profile
// for the current phase, pull each tag's action list, merge + dedupe, then keep
// the 3 highest-priority actions. Birth-control + phase physiology outrank
// lifestyle tags, so a stacked message never grows past a single SMS (9.3).
// ============================================================

import { PHASE_ACTIONS, MODIFIER_ACTIONS, sportAction } from '../data/tips.js'
import { getTipCopy, renderTipCopy, TIP_COPY_REGISTRY } from '../content/tipRegistry.js'
import { foodContentIsEnabled, foodSensitiveModeIsActive, trackingModulesFromProfile } from '../lib/trackingPreferences.js'
import { moodPatternTipTrigger } from './moodPms.js'
import { RULE_CONFIG_VERSION, ruleValue } from './rules/config.js'

export const TIP_V2 = [
  {
    id: 'pain-comfort-01', category: 'care', priority: ruleValue('tips.pain.priority'), cooldownDays: ruleValue('tips.pain.cooldownDays'),
    copyId: 'recent.pain-comfort-01',
    trigger: ({ recent }) => recent.slice(0, ruleValue('tips.pain.lookbackLogs')).some(([, log]) => Number(log.pain) >= ruleValue('tips.pain.minimum')),
  },
  {
    id: 'sleep-reset-01', category: 'care', priority: ruleValue('tips.sleep.priority'), cooldownDays: ruleValue('tips.sleep.cooldownDays'), requires: 'sleep',
    copyId: 'recent.sleep-reset-01',
    trigger: ({ recent }) => recent.slice(0, ruleValue('tips.sleep.lookbackLogs')).filter(([, log]) => log.rested === 'Not rested' || log.sleepHours === 'Under 6').length >= ruleValue('tips.sleep.minimumDays'),
  },
  {
    id: 'energy-pacing-01', category: 'care', priority: ruleValue('tips.energy.priority'), cooldownDays: ruleValue('tips.energy.cooldownDays'),
    copyId: 'recent.energy-pacing-01',
    trigger: ({ recent }) => recent.slice(0, ruleValue('tips.energy.lookbackLogs')).filter(([, log]) => Number(log.energy) <= ruleValue('signals.lowEnergyMaximum') && Number(log.energy) > 0).length >= ruleValue('tips.energy.minimumDays'),
  },
  {
    id: 'fuel-regular-01', category: 'fuel', priority: ruleValue('tips.fuel.priority'), cooldownDays: ruleValue('tips.fuel.cooldownDays'), requires: 'food',
    copyId: 'recent.fuel-regular-01',
    trigger: ({ recent }) => recent.slice(0, ruleValue('tips.fuel.lookbackLogs')).filter(([, log]) => log.fuel?.meals === 'few').length >= ruleValue('tips.fuel.minimumDays'),
  },
  {
    id: 'water-check-01', category: 'fuel', priority: ruleValue('tips.water.priority'), cooldownDays: ruleValue('tips.water.cooldownDays'), requires: 'food',
    copyId: 'recent.water-check-01',
    trigger: ({ recent }) => recent.slice(0, ruleValue('tips.water.lookbackLogs')).filter(([, log]) => log.fuel?.water === 'A little').length >= ruleValue('tips.water.minimumDays'),
  },
  {
    id: 'route-pain-01', category: 'nudge', priority: ruleValue('tips.routePain.priority'), cooldownDays: ruleValue('tips.routePain.cooldownDays'),
    copyId: 'recent.route-pain-01',
    trigger: ({ recent }) => recent.slice(0, ruleValue('tips.routePain.lookbackLogs')).filter(([, log]) => Number(log.pain) >= ruleValue('flags.highPainMinimum')).length >= ruleValue('tips.routePain.minimumDays'),
  },
  {
    id: 'mood-gentle-01', category: 'care', priority: ruleValue('tips.mood.priority'), cooldownDays: ruleValue('tips.mood.cooldownDays'), requires: 'moodPms',
    copyId: 'recent.mood-gentle-01',
    trigger: ({ recent }) => recent.slice(0, ruleValue('tips.mood.lookbackLogs')).filter(([, log]) => ['some', 'a_lot'].includes(log.functionalImpact)).length >= ruleValue('tips.mood.minimumDays'),
  },
  {
    id: 'mood-timing-01', category: 'nudge', priority: ruleValue('tips.moodTiming.priority'), cooldownDays: ruleValue('tips.moodTiming.cooldownDays'), requires: 'moodPms',
    copyId: 'recent.mood-timing-01',
    trigger: ({ dailyLogs, periodLogs }) => moodPatternTipTrigger(dailyLogs, periodLogs),
  },
]

function asDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function daysBetween(left, right) {
  return Math.round((new Date(`${left}T12:00:00`) - new Date(`${right}T12:00:00`)) / 86400000)
}

function stableRank(id, dateKey) {
  let hash = 2166136261
  for (const char of `${dateKey}:${id}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return hash >>> 0
}

export function selectDailyTips({ phase, phaseTips = true, profile = {}, dailyLogs = {}, periodLogs = {}, tipHistory = {}, date = new Date() }) {
  const dateKey = asDateKey(date)
  const modules = trackingModulesFromProfile(profile)
  const foodSensitive = foodSensitiveModeIsActive(profile, dailyLogs)
  const foodEnabled = foodContentIsEnabled(profile) && !foodSensitive
  const recent = Object.entries(dailyLogs)
    .filter(([key, log]) => key <= dateKey && log?.checkinCompleted === true)
    .sort(([left], [right]) => right.localeCompare(left))
  const context = { recent, profile, modules, phase, dateKey, dailyLogs, periodLogs }

  const candidates = TIP_V2
    .filter((tip) => !tip.requires || (tip.requires === 'food' ? foodEnabled : modules[tip.requires]))
    .filter((tip) => tip.trigger(context))
    .filter((tip) => {
      const shown = tipHistory[tip.id]
      return !shown || shown === dateKey || daysBetween(dateKey, shown) >= tip.cooldownDays
    })
    .sort((left, right) => right.priority - left.priority || stableRank(left.id, dateKey) - stableRank(right.id, dateKey))
    .map(({ copyId, ...tip }) => {
      const copy = getTipCopy(copyId)
      return { ...tip, ...copy, origin: 'recent-check-in', configVersion: RULE_CONFIG_VERSION }
    })

  const primary = candidates.find((tip) => tip.category === 'care') || (phaseTips && phase ? buildTip(phase, profile) : {
    id: 'baseline-start', category: 'care', ...getTipCopy('fallback.phase-disabled'),
    text: getTipCopy('fallback.phase-disabled').actions[foodEnabled ? 'foodEnabled' : 'foodDisabled'],
    configVersion: RULE_CONFIG_VERSION,
  })
  const fuel = candidates.find((tip) => tip.category === 'fuel') || null
  const nudge = candidates.find((tip) => tip.category === 'nudge') || null
  return { primary, fuel, nudge, ids: [primary, fuel, nudge].filter(Boolean).map((tip) => tip.id) }
}

function modifierTagsFor(profile = {}) {
  const tags = []
  const modules = trackingModulesFromProfile(profile)
  const sa = profile.studentAthlete
  if (sa === 'Student' || sa === 'Both' || profile.isStudent) tags.push('student')
  if (modules.movement && (sa === 'Athlete' || sa === 'Both')) tags.push('athlete')

  const ATHLETE_ACTS = ['team-sport', 'solo-sport', 'dance', 'cheer-gym', 'martial-arts']
  if (modules.movement && profile.activities && profile.activities.some(act => ATHLETE_ACTS.includes(act))) {
    if (!tags.includes('athlete')) tags.push('athlete')
  }

  if (modules.sleep && profile.sleep === 'Night owl') tags.push('nightOwl')
  if (modules.sleep && profile.sleep === 'Early to bed, early to rise') tags.push('earlyBird')
  if (profile.onBirthControl) tags.push('onBirthControl')
  return tags
}

export function maisieMessage(phase, cycleDay, profile = {}) {
  const tags = modifierTagsFor(profile)
  const foodEnabled = foodContentIsEnabled(profile)
  const isAthlete = tags.includes('athlete')
  const isStudent = tags.includes('student')
  const activity = profile.activityText || null
  const bank = {
    menstrual: [
      isAthlete && activity
        ? renderTipCopy('message.phase.menstrual.athlete', { activity })
        : renderTipCopy('message.phase.menstrual.rest'),
      renderTipCopy(isStudent ? 'message.phase.menstrual.student' : 'message.phase.menstrual.general'),
    ],
    follicular: [
      renderTipCopy('message.phase.follicular.1'),
      renderTipCopy('message.phase.follicular.2'),
    ],
    ovulation: [
      renderTipCopy('message.phase.ovulation.1'),
      renderTipCopy('message.phase.ovulation.2'),
    ],
    luteal: [
      isAthlete && activity
        ? renderTipCopy('message.phase.luteal.athlete', { activity })
        : renderTipCopy('message.phase.luteal.general'),
      foodEnabled
        ? renderTipCopy('message.phase.luteal.food')
        : renderTipCopy('message.phase.luteal.no-food'),
    ],
    bc_active: [
      renderTipCopy('message.phase.bc_active.1'),
      renderTipCopy('message.phase.bc_active.2'),
    ],
    bc_break: [
      renderTipCopy('message.phase.bc_break.1'),
      renderTipCopy('message.phase.bc_break.2'),
    ],
  }
  const msgs = bank[phase] || bank.follicular
  const idx = ((cycleDay || 1) - 1) % msgs.length
  return msgs[idx]
}

function pickActions(tag, phase) {
  const pack = MODIFIER_ACTIONS[tag]
  if (!pack) return []
  return [...(pack[phase] || []), ...(pack['*'] || [])].map(({ copyId, p }) => ({ text: getTipCopy(copyId).text, p }))
}

/**
 * Build the tip card for a phase + profile.
 * @returns { phase, headline, why, actions: [{text}], tags }
 */
export function buildTip(phase, profile = {}) {
  const phaseKey = TIP_COPY_REGISTRY[`phase.${phase}`] ? phase : 'luteal'
  const base = getTipCopy(`phase.${phaseKey}`)
  const tags = modifierTagsFor(profile)

  // Start with the physiological base actions (always highest priority).
  let pool = (PHASE_ACTIONS[phaseKey] || PHASE_ACTIONS.luteal)
    .map(({ copyId, p }) => ({ text: getTipCopy(copyId).text, p }))

  for (const tag of tags) {
    pool = pool.concat(pickActions(tag, phase))
  }
  const sport = sportAction(profile.sport)
  if (sport && (tags.includes('athlete'))) pool.push(sport)

  // Merge and dedupe by text, keep the highest priority per unique text.
  const byText = new Map()
  for (const a of pool) {
    const existing = byText.get(a.text)
    if (!existing || a.p > existing.p) byText.set(a.text, a)
  }

  const modules = trackingModulesFromProfile(profile)
  const foodEnabled = foodContentIsEnabled(profile)
  const merged = [...byText.values()]
    .filter((action) => foodEnabled || !/food|fuel|meal|protein|iron-rich|underfed|craving/i.test(action.text))
    .filter((action) => modules.movement || !/movement|training|workout|sport/i.test(action.text))
    .filter((action) => modules.sleep || !/sleep|bedtime|bed earlier/i.test(action.text))
    .sort((x, y) => y.p - x.p)
    .slice(0, ruleValue('tips.maximumActions'))

  return {
    id: `phase-${phase}`,
    category: 'care',
    phase,
    origin: 'predicted-phase',
    headline: base.headline,
    text: merged[0]?.text || '',
    actions: merged.map((a) => a.text),
    tags,
    configVersion: RULE_CONFIG_VERSION,
  }
}

// Short SMS-length copy (<160 chars, Section 9.3) for a phase tip.
export function tipSms(phase, profile = {}) {
  const tip = buildTip(phase, profile)
  const first = tip.actions[0] || ''
  let msg = `${tip.headline} ${renderTipCopy('message.sms.open')}`
  const smsLimit = ruleValue('tips.smsMaximumCharacters')
  if (msg.length > smsLimit - 5 && first) msg = `${tip.headline.split('--')[0].trim()}. ${renderTipCopy('message.sms.fallback')}`
  return msg.slice(0, smsLimit)
}
