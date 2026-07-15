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
    headline: 'Your period’s here — be gentle with yourself.',
    why: 'Hormones are at their lowest right now, which is why energy can dip and cramps show up.',
    actions: [
      { text: 'Warmth helps — a heating pad or a warm drink eases cramps.', p: PRIORITY.physiology },
      { text: 'Keep water close; it can take the edge off bloating.', p: PRIORITY.physiology },
      { text: 'Rest is productive too. Early night if you can.', p: PRIORITY.physiology },
    ],
  },
  follicular: {
    headline: 'You’re heading into your follicular phase — energy’s coming back.',
    why: 'Estrogen is rising after your period, which tends to lift mood, focus, and energy.',
    actions: [
      { text: 'Great window to start something new or tackle the harder stuff.', p: PRIORITY.physiology },
      { text: 'Your body recovers faster now — a good time to move.', p: PRIORITY.physiology },
      { text: 'Ride the momentum, but keep sleep steady.', p: PRIORITY.physiology },
    ],
  },
  ovulation: {
    headline: 'Peak energy — you’re around ovulation.',
    why: 'Estrogen peaks and testosterone gives a small bump, so many people feel their most social and strong.',
    actions: [
      { text: 'Good day for anything that needs confidence or energy.', p: PRIORITY.physiology },
      { text: 'Stay hydrated — you may notice a little more warmth or discharge; that’s normal.', p: PRIORITY.physiology },
      { text: 'Lean into it, but don’t skip meals on a busy day.', p: PRIORITY.physiology },
    ],
  },
  luteal: {
    headline: 'You may feel more tired or low right now.',
    why: 'Progesterone rises during the luteal phase, which can affect energy and mood.',
    actions: [
      { text: 'Extra rest tonight — you’ve earned it.', p: PRIORITY.physiology },
      { text: 'A short walk can lift a low mood more than you’d expect.', p: PRIORITY.physiology },
      { text: 'Keep water handy; cravings and bloating are normal now.', p: PRIORITY.physiology },
    ],
  },
  // Birth-control track (6.1): no ovulation/luteal prediction.
  bc_active: {
    headline: 'Active-pill days — a steady stretch.',
    why: 'Your method keeps hormone levels even, so you may not notice the usual ups and downs.',
    actions: [
      { text: 'Take your method at the same time each day if it’s time-sensitive.', p: PRIORITY.birthControl },
      { text: 'Steady routines — sleep, water, movement — pay off most now.', p: PRIORITY.birthControl },
    ],
  },
  bc_break: {
    headline: 'Break / placebo days — a little dip is normal.',
    why: 'During the hormone-free days, a withdrawal bleed and mild cramps can show up.',
    actions: [
      { text: 'Treat it like a light period week: warmth, water, rest.', p: PRIORITY.birthControl },
      { text: 'Don’t skip restarting your next pack on schedule.', p: PRIORITY.birthControl },
    ],
  },
  bc_generic: {
    headline: 'A quick check-in for the week.',
    why: 'Since your cycle is guided by your method, here’s a simple steady-state nudge.',
    actions: [
      { text: 'Keep your routine consistent — it’s doing more than you think.', p: PRIORITY.birthControl },
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
      { text: 'Strength gains come easier now — a good week to push.', p: PRIORITY.athlete },
    ],
    '*': [{ text: 'Fuel before and after training; don’t train underfed.', p: PRIORITY.sleep - 5 }],
  },
  student: {
    luteal: [
      { text: 'Build in a study break — focus dips are normal now.', p: PRIORITY.student },
      { text: 'Caffeine in moderation.', p: PRIORITY.student },
    ],
    follicular: [
      { text: 'Sharp-focus window — front-load your hardest work.', p: PRIORITY.student },
    ],
    '*': [{ text: 'Short, spaced study blocks beat one long cram.', p: PRIORITY.sleep - 5 }],
  },
  nightOwl: {
    '*': [
      { text: 'If you’re up late anyway, keep the lights low and skip the late caffeine — it helps tomorrow more than tonight.', p: PRIORITY.sleep },
    ],
  },
  earlyBird: {
    '*': [{ text: 'Your early routine is a real asset — protect that morning light.', p: PRIORITY.sleep }],
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
