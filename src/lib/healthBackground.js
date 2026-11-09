import {
  DEEP_QUESTIONS,
  birthControlMethodFromAnswers,
  lifestyleSignals,
  normalizeLifestyleAnswer,
} from '../data/questions.js'
import { ruleValue } from '../engine/rules/config.js'

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
    science: 'Birth control methods can affect bleeding and cycle timing in different ways. Why a method is used can also help explain which changes matter to you. Exercise, eating patterns, and family experiences may guide a health professional’s next questions; none of these answers identifies a condition on its own.',
    keys: ['birthControlMethod', 'birthControlReasons', 'lifestyle', 'familyStatus'],
  },
].map((section) => ({
  ...section,
  questions: section.keys.map((key) => key === 'familyStatus' ? FAMILY_HISTORY_QUESTION : QUESTION_BY_KEY.get(key)).filter(Boolean),
}))

export function healthBackgroundValues(answers = {}, history = {}) {
  return {
    ...answers,
    birthControlMethod: birthControlMethodFromAnswers(answers),
    birthControlReasons: Array.isArray(answers.birthControlReasons) ? answers.birthControlReasons : [],
    lifestyle: normalizeLifestyleAnswer(answers.lifestyle),
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

function healthBackgroundAnswerSummary(key, value) {
  const labels = {
    flow: `${value} flow`,
    changes: value === 'More than once/hour' ? 'Changes more than once an hour' : `${value} changes on the heaviest day`,
    clots: value,
    painWorst: `${value}/10 pain at worst`,
    painBetween: `${value}/10 between periods`,
    painTrend: `Pain is ${String(value).toLowerCase()}`,
    relievers: `Pain relief: ${String(value).toLowerCase()}`,
    missedDays: value === '0' ? 'No days missed' : `${value} days missed`,
    bathroomPain: `Bathroom pain: ${String(value).toLowerCase()}`,
    nausea: `Nausea: ${String(value).toLowerCase()}`,
    acne: `${value} acne`,
    birthControlMethod: value === 'None' ? 'No birth control method' : value,
    lifestyle: value,
    familyStatus: {
      yes: 'Family experience added',
      no: 'No known family history',
      unsure: 'Family history not known',
      skipped: 'Family history skipped',
    }[value],
  }
  if (key === 'signs') return Array.isArray(value) && value.includes('Neither') ? 'No listed hair or skin changes' : Array.isArray(value) ? value.join(', ') : ''
  if (key === 'birthControlReasons') {
    if (!Array.isArray(value) || !value.length) return ''
    if (value.includes('Prefer not to say')) return 'Purpose not shared'
    return value.length === 1 ? `Used for: ${value[0].toLowerCase()}` : `${value.length} purposes added`
  }
  if (key === 'lifestyle' && value === 'Neither') return 'No listed lifestyle factors'
  return labels[key] || (Array.isArray(value) ? value.join(', ') : String(value))
}

export function healthBackgroundSectionStatus(section, answers = {}) {
  const questions = applicableHealthQuestions(section, answers)
  const answeredQuestions = questions.filter((question) => isHealthBackgroundAnswer(answers[question.key]))
  const summaryQuestions = section.id === 'background'
    ? [...answeredQuestions].sort((a, b) => ['birthControlMethod', 'birthControlReasons', 'familyStatus', 'lifestyle'].indexOf(a.key) - ['birthControlMethod', 'birthControlReasons', 'familyStatus', 'lifestyle'].indexOf(b.key))
    : answeredQuestions
  const details = summaryQuestions
    .map((question) => healthBackgroundAnswerSummary(question.key, answers[question.key]))
    .filter(Boolean)
    .slice(0, 2)
  return {
    answered: answeredQuestions.length,
    total: questions.length,
    complete: questions.length > 0 && answeredQuestions.length === questions.length,
    summary: details.length ? details.join(' · ') : 'Not started',
  }
}

export function recommendedLearnSlugs(answers = {}) {
  const recommendations = []
  if (['Heavy', 'Very heavy'].includes(answers.flow) || ['More than 6', 'More than once/hour'].includes(answers.changes) || answers.clots === 'Large clots') {
    recommendations.push('heavy-periods')
  }
  if ((typeof answers.painWorst === 'number' && answers.painWorst >= ruleValue('flags.moderatePainMinimum')) || (typeof answers.painBetween === 'number' && answers.painBetween >= ruleValue('flags.moderatePainMinimum')) || answers.bathroomPain === 'Yes, often') {
    recommendations.push('painful-periods')
  }
  if (['Moderate', 'Severe'].includes(answers.acne) || (answers.signs || []).some((item) => item !== 'Neither')) {
    recommendations.push('acne-hair-hormones')
  }
  if (['1', '2', '3', '4', '5+'].includes(answers.missedDays)) {
    recommendations.push('talking-to-your-doctor')
  }
  if (lifestyleSignals(answers.lifestyle).intenseActivity) {
    recommendations.push('cycle-and-sport')
  }
  if (!recommendations.length && answers.started === 'Not yet') recommendations.push('period-101')
  return [...new Set(recommendations)].slice(0, 2)
}
