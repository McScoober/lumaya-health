export const ROUTE_CARE_REVIEW = Object.freeze({
  sourceVerifiedAt: '2026-10-18',
  clinicalReview: 'pending',
  legalReview: 'pending',
})

export const ONTARIO_CARE_OPTIONS = Object.freeze([
  {
    id: 'primary-care',
    group: 'ongoing-care',
    title: 'Family doctor or nurse practitioner',
    summary: 'Ongoing concerns, follow-up, and referrals.',
    text: 'A starting point for an ongoing concern, follow-up, and referrals when needed.',
    sourceLabel: 'Find a family doctor or nurse practitioner',
    sourceUrl: 'https://www.ontario.ca/page/find-family-doctor-or-nurse-practitioner',
  },
  {
    id: 'walk-in',
    group: 'care-soon',
    title: 'Walk-in clinic',
    summary: 'Non-urgent care when your usual clinic is unavailable.',
    text: 'An option for a non-urgent concern when your regular clinic is unavailable or you do not have one.',
    sourceLabel: 'Ontario walk-in clinics',
    sourceUrl: 'https://www.ontario.ca/page/walk-clinics',
  },
  {
    id: 'health-811',
    group: 'care-soon',
    title: 'Health811',
    summary: 'Free advice from a registered nurse, day or night.',
    text: 'Call 811 or use the online service to speak with a registered nurse or find nearby health services.',
    sourceLabel: 'Ontario Health811',
    sourceUrl: 'https://www.ontario.ca/page/your-health',
  },
  {
    id: 'health-care-connect',
    group: 'ongoing-care',
    title: 'Health Care Connect',
    summary: 'Help finding a family doctor or nurse practitioner.',
    text: 'Eligible Ontario residents without primary care can register to be matched with a family doctor, nurse practitioner, or primary care team.',
    sourceLabel: 'Ontario Health Care Connect',
    sourceUrl: 'https://www.ontario.ca/page/find-family-doctor-or-nurse-practitioner',
  },
  {
    id: 'sexual-health',
    group: 'private-support',
    title: 'Sexual health clinic',
    summary: 'Confidential sexual-health care without a referral.',
    text: 'Free and confidential sexual-health counselling and services are available without a referral or health card. Services vary by clinic.',
    sourceLabel: 'Ontario sexual health clinics',
    sourceUrl: 'https://www.ontario.ca/page/sexual-health-clinics',
  },
  {
    id: 'youth-mental-health',
    group: 'private-support',
    title: 'Youth mental-health support',
    summary: 'Free counselling, helplines, and youth services.',
    text: 'Ontario lists free services for young people, including immediate counselling, helplines, and Youth Wellness Hubs.',
    sourceLabel: 'Find mental-health support',
    sourceUrl: 'https://www.ontario.ca/page/find-mental-health-support',
  },
])

export const OHIP_NOTE = Object.freeze({
  text: 'OHIP covers medically necessary visits to doctors, including eligible walk-in and virtual visits. Coverage and eligibility can vary by service.',
  sourceLabel: 'What OHIP covers',
  sourceUrl: 'https://www.ontario.ca/page/what-ohip-covers',
})

export const URGENT_CARE_OPTIONS = Object.freeze([
  {
    title: 'If there is immediate danger',
    text: 'Call 911 or go to the nearest emergency department.',
    sourceLabel: 'Ontario emergency guidance',
    sourceUrl: 'https://www.ontario.ca/page/getting-settled-ontario',
  },
  {
    title: 'If you are unsure where to go',
    text: 'Call 811 to speak with a registered nurse for free, confidential health advice and help finding services.',
    sourceLabel: 'Ontario Health811',
    sourceUrl: 'https://www.ontario.ca/page/your-health',
  },
])
