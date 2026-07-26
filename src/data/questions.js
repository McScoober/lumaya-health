// ============================================================
// Deep Symptom Check-In question set (TRD Section 7.3)
// + Personalization questions (Section 5.2)
// Rendered generically by the CheckIn / Personalization screens.
// ============================================================

// Pain scale anchors (Section 7.2)
export const PAIN_ANCHORS = [
  { range: [0, 0], label: 'No pain', desc: 'No pain at all.' },
  {
    range: [1, 3],
    label: 'Mild',
    desc: 'Noticeable, but doesn’t interfere with daily activities; able to play sport to full capacity; doesn’t affect focus in school.',
  },
  {
    range: [4, 6],
    label: 'Moderate',
    desc: 'Interferes with some activities; hard to ignore; interferes with playing sport to full capacity; impacts focus in school.',
  },
  {
    range: [7, 9],
    label: 'Severe',
    desc: 'Interferes with most activities; hard to focus on anything else; unable to play sports; limited focus in school.',
  },
  {
    range: [10, 10],
    label: 'Worst pain imaginable',
    desc: 'Unable to function; may need to stop all activity; unable to play sports or focus in school.',
  },
]

export function painLabel(value) {
  const a = PAIN_ANCHORS.find((x) => value >= x.range[0] && value <= x.range[1])
  return a ? a.label : ''
}

// ---- Personalization (Section 5.2) ----
// Note: the TRD numbers these P1–P5 but the scoring/prediction text ("P1 = Yes")
// refers to the hormonal-birth-control answer collected inside the deep check-in.
// We keep student/athlete and sleep here; birth control lives in the check-in.
export const PERSONALIZATION = [
  {
    id: 'profile',
    key: 'studentAthlete',
    text: 'Which of these best describes you?',
    help: 'This helps us tailor your tips and a couple of scoring nudges.',
    type: 'chips',
    options: ['Student', 'Athlete', 'Both', 'Neither'],
  },
  {
    id: 'sleep',
    key: 'sleep',
    text: 'What’s your sleep schedule usually like?',
    type: 'chips',
    options: ['Early to bed, early to rise', 'Night owl', 'All over the place'],
  },
]

// ---- Deep Symptom Check-In, 18 questions (Section 7.3) ----
export const DEEP_QUESTIONS = [
  {
    id: 'q1',
    key: 'age',
    section: 'About you',
    text: 'How old are you?',
    type: 'chips',
    options: ['13', '14', '15', '16', '17', '18+'],
    isAgeGate: true,
  },
  {
    id: 'q2',
    key: 'started',
    section: 'About you',
    text: 'Have you started your period?',
    type: 'chips',
    options: ['Yes', 'Not yet'],
  },
  {
    id: 'ob3_your_thing',
    key: 'yourThing',
    section: 'Your Activity',
    text: '', 
    type: 'your_thing',
  },
  {
    id: 'q3',
    key: 'lastStart',
    section: 'Your cycle',
    text: 'When did your last period start?',
    type: 'date',
    skipIf: (a) => a.started === 'Not yet',
  },
  {
    id: 'q4',
    key: 'lastEnd',
    section: 'Your cycle',
    text: 'When did your last period end?',
    type: 'date',
    skipIf: (a) => a.started === 'Not yet',
  },
  {
    id: 'q5',
    key: 'prevStart',
    section: 'Your cycle',
    text: 'When did the period before that start?',
    type: 'date',
    skipIf: (a) => a.started === 'Not yet',
  },
  {
    id: 'q6',
    key: 'flow',
    section: 'Your flow',
    text: 'How heavy is your flow on your heaviest day?',
    type: 'chips',
    options: ['Very light', 'Light', 'Moderate', 'Heavy', 'Very heavy'],
    skipIf: (a) => a.started === 'Not yet',
  },
  {
    id: 'q7',
    key: 'changes',
    section: 'Your flow',
    text: 'On your heaviest day, how many times do you change protection?',
    type: 'chips',
    options: ['1', '2', '3', '4', '5', '6', 'More than 6', 'More than once/hour'],
    skipIf: (a) => a.started === 'Not yet',
  },
  {
    id: 'q8',
    key: 'clots',
    section: 'Your flow',
    text: 'Do you pass blood clots during your period?',
    type: 'chips',
    options: ['No', 'Small clots', 'Large clots'],
    skipIf: (a) => a.started === 'Not yet',
  },
  {
    id: 'q9',
    key: 'painWorst',
    section: 'Pain',
    text: 'At its worst, how would you rate your period pain?',
    type: 'slider',
    skipIf: (a) => a.started === 'Not yet',
  },
  {
    id: 'q10',
    key: 'painBetween',
    section: 'Pain',
    text: 'How would you rate any pain between periods?',
    type: 'slider',
    skipIf: (a) => a.started === 'Not yet',
  },
  {
    id: 'q11',
    key: 'painTrend',
    section: 'Pain',
    text: 'Is your pain now worse, the same, or better than when it started?',
    type: 'chips',
    options: ['Worse', 'Same', 'Better', 'Just started'],
    skipIf: (a) => a.started === 'Not yet',
  },
  {
    id: 'q12',
    key: 'missedDays',
    section: 'Pain',
    text: 'In the last 3 months, how many school days, work days, or activities did you miss because of your period?',
    type: 'chips',
    options: ['0', '1', '2', '3', '4', '5+'],
    skipIf: (a) => a.started === 'Not yet',
  },
  {
    id: 'q13',
    key: 'relievers',
    section: 'Pain',
    text: 'Do pain relievers (e.g. Advil or Tylenol) help your period pain?',
    type: 'chips',
    options: ['Yes, completely', 'Somewhat', 'Not really', 'I don’t take them'],
    skipIf: (a) => a.started === 'Not yet',
  },
  {
    id: 'q14',
    key: 'bathroomPain',
    section: 'Pain',
    text: 'Do you get pain when going to the bathroom during your period?',
    type: 'chips',
    options: ['No', 'Sometimes', 'Yes, often'],
    skipIf: (a) => a.started === 'Not yet',
  },
  {
    id: 'q15',
    key: 'nausea',
    section: 'Pain',
    text: 'Do you feel nauseous or throw up during your period?',
    type: 'chips',
    options: ['No', 'Sometimes', 'Yes, regularly'],
    skipIf: (a) => a.started === 'Not yet',
  },
  {
    id: 'q16',
    key: 'acne',
    section: 'Physical signs',
    text: 'How would you describe your acne?',
    type: 'chips',
    options: ['None', 'Mild', 'Moderate', 'Severe'],
  },
  {
    id: 'q17',
    key: 'signs',
    section: 'Physical signs',
    text: 'Noticed any of these? Select all that apply.',
    help: 'New hair growth (face, chest, back) or dark velvety skin patches.',
    type: 'multi',
    options: ['Hair growth', 'Dark patches', 'Neither'],
    exclusive: 'Neither',
  },
  {
    id: 'bc',
    key: 'birthControl',
    section: 'Lifestyle',
    text: 'Are you currently using hormonal birth control (the pill, IUD, implant, ring, or patch)?',
    type: 'chips',
    options: ['Yes', 'No', 'Not sure'],
  },
  {
    id: 'q18',
    key: 'lifestyle',
    section: 'Lifestyle',
    text: 'Which of these applies to you?',
    type: 'chips',
    options: [
      'Exercise intensely 5+ days/wk',
      'Limit eating or count calories',
      'Both',
      'Neither',
    ],
  },
]

// Ordered flow with Section 7.1 skip logic:
// if Q2 = "Not yet", skip Q3–Q15 and jump to Q16.
export function activeQuestions(answers) {
  return DEEP_QUESTIONS.filter((q) => !(q.skipIf && q.skipIf(answers)))
}
