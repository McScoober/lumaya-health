import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'

const compiled = await build({
  entryPoints: ['src/state/store.jsx'], bundle: true, write: false, format: 'esm', platform: 'node',
  define: { 'import.meta.env': '{}', 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'offline-account-services', setup(builder) {
    builder.onResolve({ filter: /lib\/(supabase|sync)\.js$/ }, (args) => ({ path: args.path, namespace: 'test-services' }))
    builder.onLoad({ filter: /.*/, namespace: 'test-services' }, (args) => ({ contents: args.path.endsWith('/sync.js')
      ? 'export const pullFromSupabase=async()=>null, pushToSupabase=async()=>null, clearSyncCache=()=>{};'
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
test('a changed symptom invalidates stale results until the server recalculates', () => {
  const before = { ...freshState(), result: { authoritative: true, level: 'Clear' } }
  const after = reducer(before, { type: 'LOG_DAILY', dateKey: '2026-09-11', pain: 8 })
  assert.equal(after.result, null)
  assert.equal(after.dailyLogs['2026-09-11'].pain, 8)
})
test('a later period never confirms questionnaire flags in the browser', () => {
  const before = { ...freshState(), pendingTier2: ['PAIN-01'] }
  const after = reducer(before, { type: 'UPDATE_PERIOD_STATUS', dateKey: '2026-09-11', period: true })
  assert.deepEqual(after.confirmedTier2, [])
  assert.equal(after.result, null)
})
