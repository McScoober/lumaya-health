import test from 'node:test'
import assert from 'node:assert/strict'
import { MODIFIER_ACTIONS, PHASE_ACTIONS } from '../data/tips.js'
import { TIP_V2 } from '../engine/tipEngine.js'
import { getTipCopy, renderTipCopy, TIP_COPY_REGISTRY } from './tipRegistry.js'

test('tip registry entries have copy and review metadata', () => {
  assert.ok(Object.keys(TIP_COPY_REGISTRY).length > 0)

  for (const [id, copy] of Object.entries(TIP_COPY_REGISTRY)) {
    assert.ok(id.trim(), 'copy keys are non-empty')
    assert.ok(Object.values(copy).some((value) => typeof value === 'string' && value.trim()), `${id} has copy`)
    assert.ok(Array.isArray(copy.sources), `${id} has sources metadata`)
    assert.ok(Object.hasOwn(copy, 'reviewedBy'), `${id} has reviewer metadata`)
    assert.ok(Object.hasOwn(copy, 'reviewedAt'), `${id} has review-date metadata`)
    assert.ok(['pending', 'reviewed', 'changes-requested'].includes(copy.reviewStatus), `${id} has a valid review status`)
  }
})

test('all live tip selection keys resolve in the registry', () => {
  const actionIds = [
    ...Object.values(PHASE_ACTIONS).flat(),
    ...Object.values(MODIFIER_ACTIONS).flatMap((phases) => Object.values(phases).flat()),
  ].map(({ copyId }) => copyId)

  for (const id of [...TIP_V2.map(({ copyId }) => copyId), ...actionIds]) {
    assert.ok(getTipCopy(id), `missing tip copy: ${id}`)
  }
})

test('tip copy interpolation replaces template values', () => {
  assert.equal(
    renderTipCopy('action.modifier.sport', { sport: 'soccer' }),
    'Recovery matters for soccer — a little extra sleep and hydration goes a long way this week.',
  )
})
