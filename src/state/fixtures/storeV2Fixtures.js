export const STORE_V2_FIXTURES = [
  {
    name: 'guest with legacy pain and Route preferences',
    state: {
      version: 2,
      onboarded: true,
      profile: {
        trackingModules: { core: true, symptoms: true, sleep: false, skin: true, food: true, movement: false, pain: true, period: true },
        dietPreferences: ['Vegetarian'],
        periodProducts: ['Pads'],
      },
      notifyPrefs: { periodCheckin: true, phaseTips: false, reminderTime: '19:15' },
      dailyLogs: {
        '2026-09-10': { checkinCompleted: true, pain: 4, reliefAttempted: ['Pain medicine'], reliefReceived: 'Helped a little' },
      },
      periodLogs: { '2026-09-10': { period: true, flow: 'medium' } },
    },
    routePreferences: {
      checklist: { summary: true },
      selectedQuestions: ['What should I keep tracking?'],
      personalNote: 'Pain affects school.',
      nameMode: 'initials',
      exportSections: { mood: false },
      privacyWarningSeen: true,
      lastExportedAt: '2026-09-11T12:00:00.000Z',
    },
  },
  {
    name: 'minimal legacy account',
    state: {
      onboarded: true,
      profile: {},
      dailyLogs: { '2026-08-01': { checkinCompleted: true, pain: 0, symptoms: [] } },
      periodLogs: {},
    },
    routePreferences: {},
  },
]
