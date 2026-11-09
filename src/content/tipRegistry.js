// User-facing tip and tip-like guidance copy. Keep selection rules elsewhere.
// Copy review metadata remains pending until sources and a reviewer are recorded.
function entry(copy) {
  return Object.freeze({
    ...copy,
    sources: Object.freeze([]),
    reviewedBy: null,
    reviewedAt: null,
    reviewStatus: 'pending',
  })
}

export const TIP_COPY_REGISTRY = Object.freeze({
  'recent.pain-comfort-01': entry({
    text: 'You logged pain recently. If warmth or rest usually helps you, keep that option close. If it is not helping, Route can help you organize what to bring up at a visit.',
  }),
  'recent.sleep-reset-01': entry({
    text: 'You logged shorter sleep or not feeling rested a few times. Setting out what you need for tomorrow may make tonight a little easier.',
  }),
  'recent.energy-pacing-01': entry({
    text: 'Lower energy came up in a few check-ins. Pick one thing to focus on today, and leave room for a pause.',
  }),
  'recent.fuel-regular-01': entry({
    text: 'You logged fewer meals than usual recently. If it feels okay, choose something familiar and easy to have today.',
  }),
  'recent.water-check-01': entry({
    text: 'Water was easy to miss in a couple of recent check-ins. Keeping a drink nearby may make it easier to remember today.',
  }),
  'recent.route-pain-01': entry({
    text: 'Pain showed up in several recent check-ins. Route can help you review the pattern and prepare for a visit.',
  }),
  'recent.mood-gentle-01': entry({
    headline: 'Make today a little lighter.',
    action: 'Choose one small thing you can postpone, share, or ask for help with.',
    why: 'Your recent check-ins show that mood has been getting in the way.',
  }),
  'recent.mood-timing-01': entry({
    headline: 'Your mood timing is worth reviewing.',
    action: 'Open Route to see the before-and-after pattern and prepare what you want to ask.',
    why: 'Mood changes appeared before a logged period and affected your day.',
  }),
  'fallback.phase-disabled': entry({
    text: 'A few check-ins will help Maisie point out patterns. For now, you could have some water, eat something steady, and log anything that stood out today.',
    textWithoutFood: 'A few check-ins will help Maisie point out patterns. For now, you could have some water and log anything that stood out today.',
    actions: {
      foodEnabled: 'For now, you could have some water, eat something steady, and log anything that stood out today.',
      foodDisabled: 'For now, you could have some water and log anything that stood out today.',
    },
  }),
  'phase.menstrual': entry({
    headline: 'Comfort during your period',
  }),
  'phase.follicular': entry({
    headline: 'Energy after your period',
  }),
  'phase.ovulation': entry({
    headline: 'Around ovulation',
  }),
  'phase.luteal': entry({
    headline: 'Before your period',
  }),
  'phase.bc_active': entry({
    headline: 'Symptoms may be steadier on active-pill days.',
    why: 'Your method keeps hormone levels even, so you may not notice the usual ups and downs.',
  }),
  'phase.bc_break': entry({
    headline: 'Symptoms can change during break or placebo days.',
    why: 'During the hormone-free days, a withdrawal bleed and mild cramps can show up.',
  }),
  'phase.bc_generic': entry({
    headline: 'Check how you have felt this week.',
    why: 'Hormonal birth control can change cycle patterns, so your own logged symptoms are most useful.',
  }),
  'action.phase.menstrual.heat': entry({ text: 'If cramps are bothering you, warmth is one comfort option some people choose. Use what feels comfortable for you.' }),
  'action.phase.follicular.focus': entry({ text: 'Some people notice energy or focus shifts after bleeding. If that matches your experience, you could save a demanding task for a time that suits you.' }),
  'action.phase.ovulation.activity': entry({ text: 'Some people notice changes around ovulation, and some do not. Your own check-ins are a better guide than the calendar for deciding how much to take on.' }),
  'action.phase.luteal.rest': entry({ text: 'If you are feeling more tired, it is okay to make a little more room for rest. Your experience may be different from cycle to cycle.' }),
  'action.phase.menstrual.water': entry({ text: 'Drink water regularly, especially if you feel bloated.' }),
  'action.phase.menstrual.rest': entry({ text: 'Rest or go to bed earlier if your energy is low.' }),
  'action.phase.follicular.movement': entry({ text: 'Choose movement that feels comfortable for you.' }),
  'action.phase.follicular.sleep': entry({ text: 'Keep your sleep schedule consistent.' }),
  'action.phase.ovulation.water': entry({ text: 'Drink water regularly. Changes in discharge can be normal around ovulation.' }),
  'action.phase.ovulation.meals': entry({ text: 'Try not to skip meals on busy days.' }),
  'action.phase.luteal.walk': entry({ text: 'A short walk may help with mood or discomfort.' }),
  'action.phase.luteal.water': entry({ text: 'Drink water regularly and note changes in cravings or bloating.' }),
  'action.phase.bc_active.timing': entry({ text: 'Take your method at the same time each day if it is time-sensitive.' }),
  'action.phase.bc_active.routine': entry({ text: 'Keep sleep, hydration, and movement routines consistent.' }),
  'action.phase.bc_break.comfort': entry({ text: 'Warmth, water, and rest may help with mild symptoms.' }),
  'action.phase.bc_break.restart': entry({ text: 'Do not skip restarting your next pack on schedule.' }),
  'action.phase.bc_generic.routine': entry({ text: 'Keep your medication and daily routines consistent.' }),
  'action.phase.bc_generic.note': entry({ text: 'Note anything that feels off so you can mention it later.' }),
  'action.modifier.athlete.luteal.training': entry({ text: 'Consider a lighter training day.' }),
  'action.modifier.athlete.luteal.recovery': entry({ text: 'Prioritize protein and iron-rich food; do not skip your warm-up.' }),
  'action.modifier.athlete.menstrual.recovery': entry({ text: 'Iron-rich food helps recovery this week.' }),
  'action.modifier.athlete.menstrual.movement': entry({ text: 'Lower-intensity movement is fine — listen to your body.' }),
  'action.modifier.athlete.follicular.training': entry({ text: 'Increase training only if your energy and recovery feel normal.' }),
  'action.modifier.athlete.fuel': entry({ text: 'Fuel before and after training; do not train underfed.' }),
  'action.modifier.student.luteal.breaks': entry({ text: 'Schedule short breaks if it is harder to focus.' }),
  'action.modifier.student.luteal.caffeine': entry({ text: 'Caffeine in moderation.' }),
  'action.modifier.student.follicular.focus': entry({ text: 'Plan harder work for times when your focus is better.' }),
  'action.modifier.student.study': entry({ text: 'Short, spaced study blocks beat one long cram.' }),
  'action.modifier.night-owl': entry({ text: 'If you are up late anyway, keep the lights low and skip the late caffeine — it helps tomorrow more than tonight.' }),
  'action.modifier.early-bird': entry({ text: 'Keep your wake time consistent and get morning light when possible.' }),
  'action.modifier.birth-control': entry({ text: 'Your method can change how your cycle looks. Tracking how you actually feel will tell you more than the calendar.' }),
  'action.modifier.sport': entry({ text: 'Recovery matters for {sport} — a little extra sleep and hydration goes a long way this week.' }),
  'message.phase.menstrual.athlete': entry({ text: 'Reduce {activity} intensity if pain or fatigue affects training.' }),
  'message.phase.menstrual.rest': entry({ text: 'You may want a bit more rest during your period.' }),
  'message.phase.menstrual.student': entry({ text: "If symptoms make it harder to focus, try shorter study blocks and take breaks." }),
  'message.phase.menstrual.general': entry({ text: "If pain or fatigue is affecting your day, it's fine to adjust your schedule." }),
  'message.phase.follicular.1': entry({ text: 'Some people notice more energy after their period.' }),
  'message.phase.follicular.2': entry({ text: 'You could track whether your focus or energy changes during this phase.' }),
  'message.phase.ovulation.1': entry({ text: "Some people notice more energy around ovulation, and some don't." }),
  'message.phase.ovulation.2': entry({ text: 'Your own energy and symptoms are the best guide to how much activity feels right.' }),
  'message.phase.luteal.athlete': entry({ text: 'Reduce {activity} intensity if fatigue or other symptoms affect training.' }),
  'message.phase.luteal.general': entry({ text: 'Energy and mood can shift in the days before a period for some people.' }),
  'message.phase.luteal.food': entry({ text: 'You could track cravings, fatigue, or mood changes to see whether they repeat.' }),
  'message.phase.luteal.no-food': entry({ text: 'You could track fatigue or mood changes to see whether they repeat.' }),
  'message.phase.bc_active.1': entry({ text: 'Steady hormone levels today. Notice how you feel compared to last week.' }),
  'message.phase.bc_active.2': entry({ text: 'Your cycle on the pill looks different. That is expected.' }),
  'message.phase.bc_break.1': entry({ text: 'Withdrawal week. You might feel more tired or emotional -- that is normal.' }),
  'message.phase.bc_break.2': entry({ text: 'Rest this week if you need it. Your body is adjusting.' }),
  'message.profile.night-owl': entry({ text: 'If you are up late anyway, keep the lights low and skip the late caffeine — it helps tomorrow more than tonight.' }),
  'message.profile.early-bird': entry({ text: 'Keep your wake time consistent and get morning light when possible.' }),
  'daily-log.pain': entry({ text: 'A heating pad on your lower abdomen or back may help with cramps. Rest and drink water if you can.' }),
  'daily-log.headache': entry({ text: 'Drink some water and lower your screen brightness. Rest in a quiet space if possible.' }),
  'daily-log.nausea': entry({ text: 'Try small sips of water and a plain snack. Eat slowly and stop if the nausea gets worse.' }),
  'daily-log.bloating': entry({ text: 'A short walk or gentle stretch may help with bloating.' }),
  'daily-log.back-pain': entry({ text: 'Try lying down with a pillow under your knees to reduce pressure on your lower back.' }),
  'daily-log.fatigue.food': entry({ text: 'Rest if you can, and consider a snack with protein or iron.' }),
  'daily-log.fatigue.no-food': entry({ text: 'Rest if you can, and notice whether the fatigue keeps returning.' }),
  'daily-log.sleep': entry({ text: 'Lower the lights, avoid late caffeine, and put your phone down a little earlier.' }),
  'daily-log.mood': entry({ text: 'Take things slowly today. If a low mood feels intense or lasts, talk to someone you trust.' }),
  'daily-log.skin': entry({ text: 'Wash gently, moisturize, and avoid picking at breakouts.' }),
  'daily-log.impact': entry({ text: 'Note what was affected today. This can help you explain the pattern later.' }),
  'daily-log.positive.food': entry({ text: 'Think about what helped today, such as sleep, food, movement, or less stress.' }),
  'daily-log.positive.no-food': entry({ text: 'Think about what helped today, such as sleep, movement, or less stress.' }),
  'daily-log.saved': entry({ text: 'Your check-in is saved. Keep logging when you notice changes.' }),
  'visit.support-person': entry({ text: 'You can bring a parent, guardian, or older sibling into the exam room with you. They can help make sure the doctor hears your concerns and takes your symptoms seriously.' }),
  'message.sms.open': entry({ text: 'Tap for a few ideas.' }),
  'message.sms.fallback': entry({ text: 'Tap for a quick tip.' }),
  'cycle-insight.energy': entry({ text: 'Your energy usually builds after your period ends and peaks mid-cycle. It can dip in the wind-down week, which is normal.' }),
  'cycle-insight.skin': entry({ text: 'Skin can look clearer during the building-up phase. Breakouts before your period are common and not your fault.' }),
  'cycle-insight.sleep': entry({ text: 'Sleep is often best mid-cycle. Restless nights can show up in the wind-down week, so protect your sleep routine then.' }),
  'cycle-insight.mood': entry({ text: 'Mood often lifts in the building-up and peak phases. The wind-down week can feel heavier, and tracking helps you plan ahead.' }),
})

export function getTipCopy(id) {
  const copy = TIP_COPY_REGISTRY[id]
  if (!copy) throw new Error(`Unknown tip copy key: ${id}`)
  return copy
}

export function renderTipCopy(id, values = {}) {
  return getTipCopy(id).text.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''))
}
