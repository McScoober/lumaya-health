import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'

const compiled = await build({
  entryPoints: ['src/state/store.jsx'], bundle: true, write: false, format: 'esm', platform: 'node',
  define: { 'import.meta.env': '{}', 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'offline-account-services', setup(builder) {
    builder.onResolve({ filter: /lib\/(supabase|sync)\.js$/ }, (args) => ({ path: args.path, namespace: 'test-services' }))
    builder.onLoad({ filter: /.*/, namespace: 'test-services' }, (args) => ({ contents: args.path.endsWith('/sync.js')
      ? 'export const pullFromSupabase=async()=>null, pushToSupabase=async()=>null, clearSyncCache=()=>{}, loadHistoryPage=async()=>null, loadHistoryRange=async()=>({dailyLogs:{},periodLogs:{}});'
      : 'export const isSupabaseConfigured=false, supabase=null;' }))
  } }],
})
const { reducer, freshState } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`)
const { periodStartKeys } = await import('../engine/cyclePredictor.js')

test('marking a period automatically derives the first day and backfilling moves it', () => {
  let state = freshState()
  state = reducer(state, { type: 'UPDATE_PERIOD_STATUS', dateKey: '2026-09-12', period: true })
  state = reducer(state, { type: 'UPDATE_PERIOD_STATUS', dateKey: '2026-09-13', period: true })
  assert.deepEqual(periodStartKeys(state.periodLogs), ['2026-09-12'])
  state = reducer(state, { type: 'UPDATE_PERIOD_STATUS', dateKey: '2026-09-11', period: true })
  assert.deepEqual(periodStartKeys(state.periodLogs), ['2026-09-11'])
  state = reducer(state, { type: 'UPDATE_PERIOD_STATUS', dateKey: '2026-09-11', period: false })
  assert.deepEqual(periodStartKeys(state.periodLogs), ['2026-09-12'])
})
test('hydrating another account never merges the previous account health data', () => {
  const a = { ...freshState(), accountId: 'a', dailyLogs: { '2026-09-11': { pain: 8 } } }
  const b = reducer(a, { type: 'HYDRATE', payload: { userId: 'b', onboarded: true, dailyLogs: {} } })
  assert.equal(b.accountId, 'b')
  assert.deepEqual(b.dailyLogs, {})
})
test('loading an older month merges observations without replacing recent state', () => {
  const before = { ...freshState(), dailyLogs: { '2026-09-30': { pain: 2 } } }
  const after = reducer(before, {
    type: 'MERGE_HISTORY',
    dailyLogs: { '2025-02-10': { pain: 7 } },
    periodLogs: { '2025-02-10': { period: true, status: 'confirmed' } },
  })
  assert.equal(after.dailyLogs['2026-09-30'].pain, 2)
  assert.equal(after.dailyLogs['2025-02-10'].pain, 7)
  assert.equal(after.periodLogs['2025-02-10'].period, true)
})
test('a changed symptom invalidates stale results until the server recalculates', () => {
  const before = { ...freshState(), result: { authoritative: true, level: 'Clear' } }
  const after = reducer(before, { type: 'LOG_DAILY', dateKey: '2026-09-11', pain: 8 })
  assert.equal(after.result, null)
  assert.equal(after.dailyLogs['2026-09-11'].pain, 8)
})
test('editing a daily log replaces its answers without removing unrelated fields', () => {
  const before = {
    ...freshState(),
    streak: 4,
    lastCheckinDate: '2026-09-15',
    dailyLogs: {
      '2026-09-11': {
        checkinCompleted: true,
        mood: 'Rough',
        pain: 8,
        symptoms: ['Cramps'],
        period: true,
      },
    },
  }
  const after = reducer(before, {
    type: 'LOG_DAILY',
    dateKey: '2026-09-11',
    mood: 'Good',
    vibe: 4,
    vibeLabel: 'good',
    symptoms: [],
    impact: [],
    clearPain: true,
  })
  assert.equal(after.dailyLogs['2026-09-11'].mood, 'Good')
  assert.equal(after.dailyLogs['2026-09-11'].period, true)
  assert.equal('pain' in after.dailyLogs['2026-09-11'], false)
  assert.deepEqual(after.dailyLogs['2026-09-11'].symptoms, [])
  assert.equal(after.streak, 4)
  assert.equal(after.lastCheckinDate, '2026-09-15')
})
test('optional daily observations can be saved and cleared without changing unrelated fields', () => {
  const dateKey = '2026-09-11'
  let state = {
    ...freshState(),
    dailyLogs: { [dateKey]: { checkinCompleted: true, mood: 'Okay', period: true } },
  }
  state = reducer(state, {
    type: 'LOG_DAILY', dateKey,
    painTiming: 'While bleeding',
    reliefAttempted: ['Heat', 'Rest'],
    reliefReceived: 'Helped a little',
    bleedingExperience: 'Soaked protection',
    bleedingDuration: '2-3 days',
    clearOptionalDetails: true,
  })
  assert.equal(state.dailyLogs[dateKey].painTiming, 'While bleeding')
  assert.deepEqual(state.dailyLogs[dateKey].reliefAttempted, ['Heat', 'Rest'])
  assert.equal(state.dailyLogs[dateKey].reliefReceived, 'Helped a little')
  assert.equal(state.dailyLogs[dateKey].bleedingExperience, 'Soaked protection')
  assert.equal(state.dailyLogs[dateKey].bleedingDuration, '2-3 days')
  assert.equal(state.dailyLogs[dateKey].period, true)

  state = reducer(state, {
    type: 'LOG_DAILY', dateKey,
    painTiming: '', reliefAttempted: [], reliefReceived: '',
    bleedingExperience: '', bleedingDuration: '', clearOptionalDetails: true,
  })
  assert.equal('painTiming' in state.dailyLogs[dateKey], false)
  assert.equal('reliefAttempted' in state.dailyLogs[dateKey], false)
  assert.equal('reliefReceived' in state.dailyLogs[dateKey], false)
  assert.equal('bleedingExperience' in state.dailyLogs[dateKey], false)
  assert.equal('bleedingDuration' in state.dailyLogs[dateKey], false)
  assert.equal(state.dailyLogs[dateKey].period, true)
})

test('daily period status can keep a neutral flow observation', () => {
  const dateKey = '2026-10-22'
  const logged = reducer(freshState(), {
    type: 'UPDATE_PERIOD_STATUS', dateKey, period: true, flow: 'medium', periodPromptAnswered: true,
  })
  assert.equal(logged.periodLogs[dateKey].flow, 'medium')

  const removed = reducer(logged, {
    type: 'UPDATE_PERIOD_STATUS', dateKey, period: false, periodPromptAnswered: true,
  })
  assert.equal('flow' in removed.periodLogs[dateKey], false)
})
test('structured tracking fields and edit metadata are stored without removing older observations', () => {
  const dateKey = '2026-10-20'
  const editedAt = '2026-10-22T14:00:00.000Z'
  const state = reducer({
    ...freshState(),
    dailyLogs: { [dateKey]: { checkinCompleted: true, symptoms: ['Cramps'], reliefAttempted: ['Pain medicine'] } },
  }, {
    type: 'LOG_DAILY', dateKey, editedAt,
    energy: 2, sleepHours: '6-7', rested: 'Not rested', movement: 'Light movement',
    fuel: { meals: 'most', appetite: 'About usual', cravings: ['Salty'], ironFood: true, water: 'Some' },
    bleeding: { productFullness: { light: 1, moderate: 2, full: 0 }, clots: 'Small', flooding: false },
    medicineTaken: true, medicineRelief: 'partial',
    moodItems: { irritable: 3, anxious: 2, hopeless: 1 }, functionalImpact: 'some', safetyConcern: false,
  })
  const log = state.dailyLogs[dateKey]
  assert.equal(log.editedAt, editedAt)
  assert.equal(log.energy, 2)
  assert.equal(log.fuel.ironFood, true)
  assert.equal(log.bleeding.productFullness.moderate, 2)
  assert.equal(log.medicineRelief, 'partial')
  assert.equal(log.moodItems.irritable, 3)
  assert.equal(log.functionalImpact, 'some')
  assert.equal('safetyConcern' in log, false)
  assert.equal('reliefAttempted' in log, false)
  assert.deepEqual(log.symptoms, ['Cramps'])
})

test('tip history is bounded and keeps the latest display date', () => {
  let state = freshState()
  let latestDate = ''
  for (let index = 0; index < 65; index += 1) {
    latestDate = new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10)
    state = reducer(state, { type: 'RECORD_TIPS', dateKey: latestDate, ids: [`tip-${index}`] })
  }
  assert.equal(Object.keys(state.tipHistory).length, 60)
  assert.equal(state.tipHistory['tip-64'], latestDate)
})
test('a later period never confirms questionnaire flags in the browser', () => {
  const before = { ...freshState(), pendingTier2: ['PAIN-01'] }
  const after = reducer(before, { type: 'UPDATE_PERIOD_STATUS', dateKey: '2026-09-11', period: true })
  assert.deepEqual(after.confirmedTier2, [])
  assert.equal(after.result, null)
})

test('foundation and Route preference actions update synchronized state structures', () => {
  let state = freshState()
  state = reducer(state, { type: 'SET_TRACKING', payload: { reminderTime: '18:30', modules: { fuel: true } } })
  state = reducer(state, { type: 'SET_NUTRITION', payload: { dietPattern: ['Vegan'], foodTipsEnabled: true } })
  state = reducer(state, { type: 'SET_HISTORY', payload: { consentedAt: '2026-10-22T12:00:00.000Z' } })
  state = reducer(state, { type: 'ADD_PERIODIC_CHECKIN', checkin: { id: 'pc-1', type: 'leaf', date: '2026-10-22', answers: {}, score: null } })
  state = reducer(state, { type: 'SET_CHECKLISTS', payload: { talkToDoctor: { summary: true } } })
  state = reducer(state, { type: 'SET_ROUTE_PREFERENCES', payload: { personalNote: 'Ask about pain.' } })

  assert.equal(state.version, 3)
  assert.equal(state.tracking.modules.fuel, true)
  assert.equal(state.notifyPrefs.reminderTime, '18:30')
  assert.deepEqual(state.nutrition.dietPattern, ['Vegan'])
  assert.equal(state.history.consentedAt, '2026-10-22T12:00:00.000Z')
  assert.equal(state.periodicCheckins[0].id, 'pc-1')
  assert.equal(state.checklists.talkToDoctor.summary, true)
  assert.equal(state.routePreferences.personalNote, 'Ask about pain.')
})

test('health background answers update together and keep birth control context synchronized', () => {
  const before = { ...freshState(), answers: { started: 'Yes', flow: 'Light' }, result: { authoritative: true } }
  const after = reducer(before, {
    type: 'SAVE_HEALTH_BACKGROUND',
    answers: { flow: 'Moderate', birthControl: 'Yes', signs: ['Neither'] },
  })

  assert.equal(after.answers.started, 'Yes')
  assert.equal(after.answers.flow, 'Moderate')
  assert.equal(after.answers.birthControl, 'Yes')
  assert.deepEqual(after.answers.signs, ['Neither'])
  assert.equal(after.profile.onBirthControl, true)
  assert.equal(after.result, null)
})

test('optional family history stays in synchronized history state', () => {
  const state = reducer(freshState(), {
    type: 'SET_HISTORY',
    payload: { familyStatus: 'yes', familyText: 'A parent has very heavy periods.' },
  })
  assert.equal(state.history.familyStatus, 'yes')
  assert.equal(state.history.familyText, 'A parent has very heavy periods.')
  assert.equal(state.answers.familyStatus, undefined)
})
