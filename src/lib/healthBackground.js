import { DEEP_QUESTIONS } from '../data/questions.js'

const QUESTION_BY_KEY = new Map(DEEP_QUESTIONS.map((question) => [question.key, question]))
const FAMILY_HISTORY_QUESTION = {
  key: 'familyStatus',
  type: 'family-history',
  text: 'Does anyone in your family have very painful periods, very heavy periods, or a bleeding problem?',
  help: 'Optional. Only you can see this unless you choose to include it in a report.',
}

export const HEALTH_BACKGROUND_SECTIONS = [
  {
    id: 'bleeding',
    title: 'Bleeding',
    description: 'Your usual experience, in your own words.',
    whyItMatters: 'Helps describe your usual bleeding and any changes over time.',
    science: 'Bleeding amount, clots, and duration are details health professionals may use when considering iron levels and possible causes of heavy or prolonged bleeding. They do not identify a condition on their own.',
    keys: ['flow', 'changes', 'clots'],
  },
  {
    id: 'pain',
    title: 'Pain',
    description: 'What pain can feel like and what tends to help.',
    whyItMatters: 'Helps describe when pain happens, its intensity, and what helps.',
    science: 'Pain timing and its effect on daily life can help a health professional decide what follow-up may be useful and whether to explore possible causes.',
    keys: ['painWorst', 'painBetween', 'painTrend', 'relievers'],
  },
  {
    id: 'impact',
    title: 'Daily impact',
    description: 'How periods may affect school, activities, or everyday routines.',
    whyItMatters: 'Shows how symptoms affect school, sleep, activities, and daily life.',
    science: 'Daily impact gives health professionals context that a symptom score alone cannot provide. It can help you explain what has changed and what support you need.',
    keys: ['missedDays', 'bathroomPain', 'nausea'],
  },
  {
    id: 'skin-body',
    title: 'Skin, hair and body',
    description: 'Changes you may want Maisie to keep in context.',
    whyItMatters: 'Keeps skin, hair, and cycle changes together as useful context.',
    science: 'Irregular cycles together with persistent acne or hair changes can give a health professional useful context. These changes can also overlap with normal puberty, so they cannot identify a condition by themselves.',
    keys: ['acne', 'signs'],
  },
  {
    id: 'background',
    title: 'Health background',
    description: 'Optional context that can make your questions and summaries more useful.',
    whyItMatters: 'Adds context that can make health conversations more complete.',
    science: 'Medicines, exercise, eating patterns, and family experiences can affect periods or guide a health professional’s next questions. Maisie does not use family history to identify a condition.',
    keys: ['birthControl', 'lifestyle', 'familyStatus'],
  },
].map((section) => ({
  ...section,
  questions: section.keys.map((key) => key === 'familyStatus' ? FAMILY_HISTORY_QUESTION : QUESTION_BY_KEY.get(key)).filter(Boolean),
}))

export function healthBackgroundValues(answers = {}, history = {}) {
  return {
    ...answers,
    familyStatus: history.familyStatus || null,
    familyText: history.familyText || '',
  }
}

export function isHealthBackgroundAnswer(value) {
  if (Array.isArray(value)) return value.length > 0
  return value !== undefined && value !== null && value !== ''
}

export function applicableHealthQuestions(section, answers = {}) {
  return section.questions.filter((question) => !question.skipIf?.(answers))
}

export function healthBackgroundProgress(answers = {}) {
  const questions = HEALTH_BACKGROUND_SECTIONS.flatMap((section) => applicableHealthQuestions(section, answers))
  const answered = questions.filter((question) => isHealthBackgroundAnswer(answers[question.key])).length
  const total = questions.length
  return {
    answered,
    total,
    ratio: total ? answered / total : 1,
    complete: total > 0 && answered === total,
  }
}

export function firstIncompleteHealthSection(answers = {}) {
  const index = HEALTH_BACKGROUND_SECTIONS.findIndex((section) =>
    applicableHealthQuestions(section, answers).some((question) => !isHealthBackgroundAnswer(answers[question.key])),
  )
  return index === -1 ? 0 : index
}

export function recommendedLearnSlugs(answers = {}) {
  const recommendations = []
  if (['Heavy', 'Very heavy'].includes(answers.flow) || ['More than 6', 'More than once/hour'].includes(answers.changes) || answers.clots === 'Large clots') {
    recommendations.push('heavy-periods')
  }
  if ((typeof answers.painWorst === 'number' && answers.painWorst >= 4) || (typeof answers.painBetween === 'number' && answers.painBetween >= 4) || answers.bathroomPain === 'Yes, often') {
    recommendations.push('painful-periods')
  }
  if (['Moderate', 'Severe'].includes(answers.acne) || (answers.signs || []).some((item) => item !== 'Neither')) {
    recommendations.push('acne-hair-hormones')
  }
  if (['1', '2', '3', '4', '5+'].includes(answers.missedDays)) {
    recommendations.push('talking-to-your-doctor')
  }
  if (['Exercise intensely 5+ days/wk', 'Both'].includes(answers.lifestyle)) {
    recommendations.push('cycle-and-sport')
  }
  if (!recommendations.length && answers.started === 'Not yet') recommendations.push('period-101')
  return [...new Set(recommendations)].slice(0, 2)
}
