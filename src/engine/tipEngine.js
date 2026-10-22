// ============================================================
// Tip selection engine (TRD Section 6.3)
// Tag-combination rule: collect every modifier tag matching the user's profile
// for the current phase, pull each tag's action list, merge + dedupe, then keep
// the 3 highest-priority actions. Birth-control + phase physiology outrank
// lifestyle tags, so a stacked message never grows past a single SMS (9.3).
// ============================================================

import { PHASE_CARDS, MODIFIER_ACTIONS, sportAction } from '../data/tips.js'
import { foodContentIsEnabled, foodSensitiveModeIsActive, trackingModulesFromProfile } from '../lib/trackingPreferences.js'

export const TIP_V2 = [
  {
    id: 'pain-comfort-01', category: 'care', priority: 90, cooldownDays: 4,
    headline: 'Make comfort easier to reach.',
    action: 'Keep the heat, rest, or other comfort option that helped you nearby.',
    why: 'You recently logged pain that affected how you felt.',
    trigger: ({ recent }) => recent.slice(0, 2).some(([, log]) => Number(log.pain) >= 4),
  },
  {
    id: 'sleep-reset-01', category: 'care', priority: 76, cooldownDays: 5, requires: 'sleep',
    headline: 'Give tonight a softer landing.',
    action: 'Choose one small wind-down step that feels realistic tonight.',
    why: 'Your recent check-ins included shorter or less restful sleep.',
    trigger: ({ recent }) => recent.slice(0, 5).filter(([, log]) => log.rested === 'Not rested' || log.sleepHours === 'Under 6').length >= 2,
  },
  {
    id: 'energy-pacing-01', category: 'care', priority: 72, cooldownDays: 4,
    headline: 'Plan around the energy you have.',
    action: 'Pick the one thing that matters most and leave room to pause.',
    why: 'Lower energy showed up more than once in your recent logs.',
    trigger: ({ recent }) => recent.slice(0, 5).filter(([, log]) => Number(log.energy) <= 2 && Number(log.energy) > 0).length >= 2,
  },
  {
    id: 'fuel-regular-01', category: 'fuel', priority: 68, cooldownDays: 5, requires: 'food',
    headline: 'Keep fuel simple today.',
    action: 'Choose an easy meal or snack you already know works for you.',
    why: 'You recently logged fewer meals or snacks than usual.',
    trigger: ({ recent }) => recent.slice(0, 4).some(([, log]) => log.fuel?.meals === 'few'),
  },
  {
    id: 'water-check-01', category: 'fuel', priority: 58, cooldownDays: 6, requires: 'food',
    headline: 'Make water easy to notice.',
    action: 'Put a drink somewhere you will naturally see it.',
    why: 'A recent check-in showed that water was easy to miss.',
    trigger: ({ recent }) => recent.slice(0, 3).some(([, log]) => log.fuel?.water === 'A little'),
  },
  {
    id: 'route-pain-01', category: 'nudge', priority: 82, cooldownDays: 10,
    headline: 'You have a pattern worth reviewing.',
    action: 'Open Route to see what you logged and prepare what you want to ask.',
    why: 'Pain affected several recent days.',
    trigger: ({ recent }) => recent.slice(0, 30).filter(([, log]) => Number(log.pain) >= 7).length >= 3,
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

export function selectDailyTips({ phase, profile = {}, dailyLogs = {}, tipHistory = {}, date = new Date() }) {
  const dateKey = asDateKey(date)
  const modules = trackingModulesFromProfile(profile)
  const foodSensitive = foodSensitiveModeIsActive(profile, dailyLogs)
  const foodEnabled = foodContentIsEnabled(profile) && !foodSensitive
  const recent = Object.entries(dailyLogs)
    .filter(([key, log]) => key <= dateKey && log?.checkinCompleted === true)
    .sort(([left], [right]) => right.localeCompare(left))
  const context = { recent, profile, modules, phase, dateKey }

  const candidates = TIP_V2
    .filter((tip) => !tip.requires || (tip.requires === 'food' ? foodEnabled : modules[tip.requires]))
    .filter((tip) => tip.trigger(context))
    .filter((tip) => {
      const shown = tipHistory[tip.id]
      return !shown || shown === dateKey || daysBetween(dateKey, shown) >= tip.cooldownDays
    })
    .sort((left, right) => right.priority - left.priority || stableRank(left.id, dateKey) - stableRank(right.id, dateKey))
    .map((tip) => ({ ...tip, actions: [tip.action] }))

  const primary = candidates.find((tip) => tip.category === 'care') || (phase ? buildTip(phase, profile) : {
    id: 'baseline-start', category: 'care', headline: 'Start with what you notice.',
    why: 'A few check-ins will help Maisie show more useful patterns.',
    actions: [foodEnabled ? 'Drink some water, choose something steady to eat, and log what stands out.' : 'Drink some water and log what stands out.'],
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
        ? `Reduce ${activity} intensity if pain or fatigue affects training.`
        : 'You may need more rest during your period.',
      isStudent
        ? 'If symptoms affect focus, use shorter study blocks and take breaks.'
        : 'Adjust your schedule if pain or fatigue affects your day.',
    ],
    follicular: [
      'You may notice more energy after your period.',
      'Track whether your focus or energy changes during this phase.',
    ],
    ovulation: [
      'Some people notice more energy around ovulation.',
      'Use your own energy and symptoms to decide how much activity feels right.',
    ],
    luteal: [
      isAthlete && activity
        ? `Reduce ${activity} intensity if fatigue or other symptoms affect training.`
        : 'Energy and mood can change during the luteal phase.',
      foodEnabled
        ? 'Track cravings, fatigue, or mood changes to learn whether they repeat.'
        : 'Track fatigue or mood changes to learn whether they repeat.',
    ],
    bc_active: [
      'Steady hormone levels today. Notice how you feel compared to last week.',
      'Your cycle on the pill looks different. That is expected.',
    ],
    bc_break: [
      'Withdrawal week. You might feel more tired or emotional -- that is normal.',
      'Rest this week if you need it. Your body is adjusting.',
    ],
  }
  const msgs = bank[phase] || bank.follicular
  const idx = ((cycleDay || 1) - 1) % msgs.length
  return msgs[idx]
}

function pickActions(tag, phase) {
  const pack = MODIFIER_ACTIONS[tag]
  if (!pack) return []
  return [...(pack[phase] || []), ...(pack['*'] || [])]
}

/**
 * Build the tip card for a phase + profile.
 * @returns { phase, headline, why, actions: [{text}], tags }
 */
export function buildTip(phase, profile = {}) {
  const base = PHASE_CARDS[phase] || PHASE_CARDS.luteal
  const tags = modifierTagsFor(profile)

  // Start with the physiological base actions (always highest priority).
  let pool = [...base.actions]

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
    .slice(0, 3)

  return {
    id: `phase-${phase}`,
    category: 'care',
    phase,
    headline: base.headline,
    why: base.why,
    actions: merged.map((a) => a.text),
    tags,
  }
}

// Short SMS-length copy (<160 chars, Section 9.3) for a phase tip.
export function tipSms(phase, profile = {}) {
  const tip = buildTip(phase, profile)
  const first = tip.actions[0] || ''
  let msg = `${tip.headline} Tap to see how to take care of yourself.`
  if (msg.length > 155 && first) msg = `${tip.headline.split('--')[0].trim()}. Tap for a quick self-care tip.`
  return msg.slice(0, 160)
}
