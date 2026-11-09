import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateRules } from './evaluate.js'
import { RULE_CONFIG_VERSION } from './config.js'

test('one evaluation stamps screening and safety with the same rule version', () => {
  const result = evaluateRules({
    answers: { age: '16', started: 'Yes', flow: 'Light' },
    today: new Date('2026-11-07T12:00:00'),
  })
  assert.equal(result.authority, 'local-rules-engine')
  assert.equal(result.ruleVersion, RULE_CONFIG_VERSION)
  assert.equal(result.safety.configVersion, RULE_CONFIG_VERSION)
})
