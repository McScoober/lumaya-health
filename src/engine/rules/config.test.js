import test from 'node:test'
import assert from 'node:assert/strict'
import { RULE_CONFIG_STATUS, RULE_CONFIG_VERSION, ruleValue, serverRuleVersionStatus, validateRuleRegistry } from './config.js'

test('rule registry is versioned and every threshold has review metadata', () => {
  assert.match(RULE_CONFIG_VERSION, /^\d{4}-\d{2}-\d{2}\.\d+$/)
  assert.equal(RULE_CONFIG_STATUS, 'active')
  assert.deepEqual(validateRuleRegistry(), [])
})

test('rule registry rejects unknown keys and identifies stale server results', () => {
  assert.equal(ruleValue('signals.windowDays'), 8)
  assert.throws(() => ruleValue('missing.threshold'), /Unknown rule threshold/)
  assert.equal(serverRuleVersionStatus({
    ruleVersion: RULE_CONFIG_VERSION,
    configVersion: RULE_CONFIG_VERSION,
    configStatus: RULE_CONFIG_STATUS,
  }), 'current')
  assert.equal(serverRuleVersionStatus({ ruleVersion: 'legacy' }), 'missing')
  assert.equal(serverRuleVersionStatus({
    ruleVersion: 'legacy',
    configVersion: 'legacy',
    configStatus: 'active',
  }), 'stale')
})
