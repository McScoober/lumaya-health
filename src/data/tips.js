// ============================================================
// Tagged tip content cards (TRD Section 6.3)
// Each card: phase tag, optional modifier tags, headline, why, actions.
// Actions carry a priority so the tag-combination rule (6.3) can rank them:
// birth-control + phase physiology outrank lifestyle tags, cap at 3.
// ============================================================

// priority: higher = kept first when merging/deduping (6.3).
// The phase's physiological framing is always preserved via the headline + "why"
// (those come from the base card). Among ACTIONS, birth-control adjustment ranks
// highest, then lifestyle modifiers personalize the list, and the generic base
// actions act as fallback fill — matching the stacked examples in Section 6.3
// (e.g. luteal + athlete surfaces the athlete actions, not the generic ones).
export const PRIORITY = {
  birthControl: 90, // birth-control adjustment always outranks lifestyle
  student: 40,
  athlete: 40,
  sport: 35,
  sleep: 30,
  physiology: 20, // generic phase self-care — fallback fill beneath modifiers
}

// Base per-phase cards (no modifiers) — the physiological "why" + core actions.
export const PHASE_CARDS = {
  menstrual: {
    headline: 'Your period may affect energy and comfort.',
    why: 'Hormone levels are lower during this phase, and some people notice less energy or more cramps.',
    actions: [
      { text: 'Try a heating pad or warm drink for cramps.', p: PRIORITY.physiology },
      { text: 'Drink water regularly, especially if you feel bloated.', p: PRIORITY.physiology },
      { text: 'Rest or go to bed earlier if your energy is low.', p: PRIORITY.physiology },
    ],
  },
  follicular: {
    headline: 'Energy may increase after your period.',
    why: 'Estrogen rises during the follicular phase, and some people notice changes in mood, focus, or energy.',
    actions: [
      { text: 'Use higher-energy days for tasks that need more focus.', p: PRIORITY.physiology },
      { text: 'Choose movement that feels comfortable for you.', p: PRIORITY.physiology },
      { text: 'Keep your sleep schedule consistent.', p: PRIORITY.physiology },
    ],
  },
  ovulation: {
    headline: 'Some people notice more energy around ovulation.',
    why: 'Hormone changes around ovulation can affect energy, mood, and discharge differently for each person.',
    actions: [
      { text: 'Plan demanding activities for higher-energy days if that matches your pattern.', p: PRIORITY.physiology },
      { text: 'Drink water regularly. Changes in discharge can be normal around ovulation.', p: PRIORITY.physiology },
      { text: 'Try not to skip meals on busy days.', p: PRIORITY.physiology },
    ],
  },
  luteal: {
    headline: 'You may feel more tired or low right now.',
    why: 'Progesterone rises during the luteal phase, which can affect energy and mood.',
    actions: [
      { text: 'Allow more time for rest if you feel tired.', p: PRIORITY.physiology },
      { text: 'A short walk may help with mood or discomfort.', p: PRIORITY.physiology },
      { text: 'Drink water regularly and note changes in cravings or bloating.', p: PRIORITY.physiology },
    ],
  },
  // Birth-control track (6.1): no ovulation/luteal prediction.
  bc_active: {
    headline: 'Symptoms may be steadier on active-pill days.',
    why: 'Your method keeps hormone levels even, so you may not notice the usual ups and downs.',
    actions: [
      { text: 'Take your method at the same time each day if it’s time-sensitive.', p: PRIORITY.birthControl },
      { text: 'Keep sleep, hydration, and movement routines consistent.', p: PRIORITY.birthControl },
    ],
  },
  bc_break: {
    headline: 'Symptoms can change during break or placebo days.',
    why: 'During the hormone-free days, a withdrawal bleed and mild cramps can show up.',
    actions: [
      { text: 'Warmth, water, and rest may help with mild symptoms.', p: PRIORITY.birthControl },
      { text: 'Don’t skip restarting your next pack on schedule.', p: PRIORITY.birthControl },
    ],
  },
  bc_generic: {
    headline: 'Check how you have felt this week.',
    why: 'Hormonal birth control can change cycle patterns, so your own logged symptoms are most useful.',
    actions: [
      { text: 'Keep your medication and daily routines consistent.', p: PRIORITY.birthControl },
      { text: 'Note anything that feels off so you can mention it later.', p: PRIORITY.birthControl },
    ],
  },
}

// Modifier action packs — merged onto phase cards by tag (6.3).
// Keyed by phase so advice is phase-appropriate; fall back to '*' for any phase.
export const MODIFIER_ACTIONS = {
  athlete: {
    luteal: [
      { text: 'Consider a lighter training day.', p: PRIORITY.athlete + 1 },
      { text: 'Prioritize protein and iron-rich food; don’t skip your warm-up.', p: PRIORITY.athlete },
    ],
    menstrual: [
      { text: 'Iron-rich food helps recovery this week.', p: PRIORITY.athlete },
      { text: 'Lower-intensity movement is fine — listen to your body.', p: PRIORITY.athlete },
    ],
    follicular: [
      { text: 'Increase training only if your energy and recovery feel normal.', p: PRIORITY.athlete },
    ],
    '*': [{ text: 'Fuel before and after training; don’t train underfed.', p: PRIORITY.sleep - 5 }],
  },
  student: {
    luteal: [
      { text: 'Schedule short breaks if it is harder to focus.', p: PRIORITY.student },
      { text: 'Caffeine in moderation.', p: PRIORITY.student },
    ],
    follicular: [
      { text: 'Plan harder work for times when your focus is better.', p: PRIORITY.student },
    ],
    '*': [{ text: 'Short, spaced study blocks beat one long cram.', p: PRIORITY.sleep - 5 }],
  },
  nightOwl: {
    '*': [
      { text: 'If you’re up late anyway, keep the lights low and skip the late caffeine — it helps tomorrow more than tonight.', p: PRIORITY.sleep },
    ],
  },
  earlyBird: {
    '*': [{ text: 'Keep your wake time consistent and get morning light when possible.', p: PRIORITY.sleep }],
  },
  onBirthControl: {
    '*': [
      { text: 'Your method keeps things steadier — track how you actually feel, not just the calendar.', p: PRIORITY.birthControl },
    ],
  },
}

// Sport-specific flavor (P5) — light touch, appended when a sport is named.
export function sportAction(sport) {
  if (!sport) return null
  return {
    text: `Recovery matters for ${sport.trim().toLowerCase()} — a little extra sleep and hydration goes a long way this week.`,
    p: PRIORITY.sport,
  }
}
