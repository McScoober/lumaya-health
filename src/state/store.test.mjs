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
test('a later period never confirms questionnaire flags in the browser', () => {
  const before = { ...freshState(), pendingTier2: ['PAIN-01'] }
  const after = reducer(before, { type: 'UPDATE_PERIOD_STATUS', dateKey: '2026-09-11', period: true })
  assert.deepEqual(after.confirmedTier2, [])
  assert.equal(after.result, null)
})
