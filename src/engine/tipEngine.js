// ============================================================
// Tip selection engine (TRD Section 6.3)
// Tag-combination rule: collect every modifier tag matching the user's profile
// for the current phase, pull each tag's action list, merge + dedupe, then keep
// the 3 highest-priority actions. Birth-control + phase physiology outrank
// lifestyle tags, so a stacked message never grows past a single SMS (9.3).
// ============================================================

import { PHASE_CARDS, MODIFIER_ACTIONS, sportAction } from '../data/tips.js'

function modifierTagsFor(profile = {}) {
  const tags = []
  const sa = profile.studentAthlete
  if (sa === 'Student' || sa === 'Both' || profile.isStudent) tags.push('student')
  if (sa === 'Athlete' || sa === 'Both') tags.push('athlete')

  const ATHLETE_ACTS = ['team-sport', 'solo-sport', 'dance', 'cheer-gym', 'martial-arts']
  if (profile.activities && profile.activities.some(act => ATHLETE_ACTS.includes(act))) {
    if (!tags.includes('athlete')) tags.push('athlete')
  }

  if (profile.sleep === 'Night owl') tags.push('nightOwl')
  if (profile.sleep === 'Early to bed, early to rise') tags.push('earlyBird')
  if (profile.onBirthControl) tags.push('onBirthControl')
  return tags
}

export function maisieMessage(phase, cycleDay, profile = {}) {
  const tags = modifierTagsFor(profile)
  const isAthlete = tags.includes('athlete')
  const isStudent = tags.includes('student')
  const activity = profile.activityText || null
  const bank = {
    menstrual: [
      isAthlete && activity
        ? `Your ${activity} can wait this week. Rest is part of training.`
        : 'This is your rest week. Your body is doing a lot right now.',
      isStudent
        ? 'Hard to focus during your period? Completely normal. Cut yourself some slack.'
        : 'Lower your expectations this week. You do not have to be at full power.',
    ],
    follicular: [
      'Energy is picking up this week. Good time to start things.',
      'Your follicular phase is when your brain is sharpest. Use it.',
    ],
    ovulation: [
      'Peak phase. You might feel more confident and switched on. Lean into it.',
      'Best time in your cycle for hard workouts, big conversations, or anything that takes energy.',
    ],
    luteal: [
      isAthlete && activity
        ? `Dial back the intensity on ${activity} if your body asks for it. That is not weakness.`
        : 'Things slow down in this phase. That is not a mood. That is just your cycle.',
      'Cravings, tiredness, feeling off -- all normal in the luteal phase.',
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

  const merged = [...byText.values()].sort((x, y) => y.p - x.p).slice(0, 3)

  return {
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
