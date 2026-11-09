// Tip eligibility and action priorities. All user-facing copy lives in
// src/content/tipRegistry.js.
import { renderTipCopy } from '../content/tipRegistry.js'

export const PRIORITY = {
  birthControl: 90,
  student: 40,
  athlete: 40,
  sport: 35,
  sleep: 30,
  physiology: 20,
}

export const PHASE_ACTIONS = {
  menstrual: [
    { copyId: 'action.phase.menstrual.heat', p: PRIORITY.physiology },
  ],
  follicular: [
    { copyId: 'action.phase.follicular.focus', p: PRIORITY.physiology },
  ],
  ovulation: [
    { copyId: 'action.phase.ovulation.activity', p: PRIORITY.physiology },
  ],
  luteal: [
    { copyId: 'action.phase.luteal.rest', p: PRIORITY.physiology },
  ],
  bc_active: [
    { copyId: 'action.phase.bc_active.timing', p: PRIORITY.birthControl },
    { copyId: 'action.phase.bc_active.routine', p: PRIORITY.birthControl },
  ],
  bc_break: [
    { copyId: 'action.phase.bc_break.comfort', p: PRIORITY.birthControl },
    { copyId: 'action.phase.bc_break.restart', p: PRIORITY.birthControl },
  ],
  bc_generic: [
    { copyId: 'action.phase.bc_generic.routine', p: PRIORITY.birthControl },
    { copyId: 'action.phase.bc_generic.note', p: PRIORITY.birthControl },
  ],
}

export const MODIFIER_ACTIONS = {
  athlete: {
    luteal: [
      { copyId: 'action.modifier.athlete.luteal.training', p: PRIORITY.athlete + 1 },
      { copyId: 'action.modifier.athlete.luteal.recovery', p: PRIORITY.athlete },
    ],
    menstrual: [
      { copyId: 'action.modifier.athlete.menstrual.recovery', p: PRIORITY.athlete },
      { copyId: 'action.modifier.athlete.menstrual.movement', p: PRIORITY.athlete },
    ],
    follicular: [
      { copyId: 'action.modifier.athlete.follicular.training', p: PRIORITY.athlete },
    ],
    '*': [{ copyId: 'action.modifier.athlete.fuel', p: PRIORITY.sleep - 5 }],
  },
  student: {
    luteal: [
      { copyId: 'action.modifier.student.luteal.breaks', p: PRIORITY.student },
      { copyId: 'action.modifier.student.luteal.caffeine', p: PRIORITY.student },
    ],
    follicular: [
      { copyId: 'action.modifier.student.follicular.focus', p: PRIORITY.student },
    ],
    '*': [{ copyId: 'action.modifier.student.study', p: PRIORITY.sleep - 5 }],
  },
  nightOwl: {
    '*': [{ copyId: 'action.modifier.night-owl', p: PRIORITY.sleep }],
  },
  earlyBird: {
    '*': [{ copyId: 'action.modifier.early-bird', p: PRIORITY.sleep }],
  },
  onBirthControl: {
    '*': [{ copyId: 'action.modifier.birth-control', p: PRIORITY.birthControl }],
  },
}

export function sportAction(sport) {
  if (!sport) return null
  return {
    text: renderTipCopy('action.modifier.sport', { sport: sport.trim().toLowerCase() }),
    p: PRIORITY.sport,
  }
}
