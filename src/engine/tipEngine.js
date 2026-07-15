// ============================================================
// Tip selection engine (TRD Section 6.3)
// Tag-combination rule: collect every modifier tag matching the user's profile
// for the current phase, pull each tag's action list, merge + dedupe, then keep
// the 3 highest-priority actions. Birth-control + phase physiology outrank
// lifestyle tags, so a stacked message never grows past a single SMS (9.3).
// ============================================================

import { PHASE_CARDS, MODIFIER_ACTIONS, sportAction } from '../data/tips.js'

function modifierTagsFor(profile) {
  const tags = []
  const sa = profile.studentAthlete
  if (sa === 'Student' || sa === 'Both') tags.push('student')
  if (sa === 'Athlete' || sa === 'Both') tags.push('athlete')
  if (profile.sleep === 'Night owl') tags.push('nightOwl')
  if (profile.sleep === 'Early to bed, early to rise') tags.push('earlyBird')
  if (profile.onBirthControl) tags.push('onBirthControl')
  return tags
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

  // Merge + dedupe by text, keep the highest priority per unique text.
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
  if (msg.length > 155 && first) msg = `${tip.headline.split('—')[0].trim()}. Tap for a quick self-care tip.`
  return msg.slice(0, 160)
}
