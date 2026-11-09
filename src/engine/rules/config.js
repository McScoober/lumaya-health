import registry from '../../config/thresholds.v1.json' with { type: 'json' }

const REQUIRED_METADATA = ['source', 'reviewedBy', 'reviewedAt', 'reviewStatus']

export const RULE_CONFIG_VERSION = registry.version
export const RULE_CONFIG_STATUS = registry.activationStatus

export function ruleEntry(key) {
  const entry = registry.thresholds[key]
  if (!entry) throw new Error(`Unknown rule threshold: ${key}`)
  return entry
}

export function ruleValue(key) {
  return ruleEntry(key).value
}

export function ruleMetadata(key) {
  const { value: _value, ...metadata } = ruleEntry(key)
  return metadata
}

export function ruleDefinition(id) {
  const definition = registry.rules?.[id]
  if (!definition) throw new Error(`Unknown rule definition: ${id}`)
  return definition
}

export function validateRuleRegistry() {
  const errors = []
  if (!registry.version) errors.push('Registry version is required.')
  if (!['active', 'paused'].includes(registry.activationStatus)) {
    errors.push('Registry activationStatus is invalid.')
  }
  if (!['pending', 'reviewed', 'changes-requested'].includes(registry.clinicalReviewStatus)) {
    errors.push('Registry clinicalReviewStatus is invalid.')
  }
  for (const [key, entry] of Object.entries(registry.thresholds)) {
    if (entry.value === undefined) errors.push(`${key} is missing a value.`)
    for (const field of REQUIRED_METADATA) {
      if (!(field in entry)) errors.push(`${key} is missing ${field}.`)
    }
    if (!['pending', 'reviewed', 'changes-requested'].includes(entry.reviewStatus)) {
      errors.push(`${key} has an invalid reviewStatus.`)
    }
    if (entry.reviewStatus === 'reviewed' && (!entry.reviewedBy || !entry.reviewedAt)) {
      errors.push(`${key} is marked reviewed without a reviewer and date.`)
    }
  }
  for (const [id, definition] of Object.entries(registry.rules || {})) {
    for (const field of REQUIRED_METADATA) {
      if (!(field in definition)) errors.push(`${id} is missing ${field}.`)
    }
    if (!['pending', 'reviewed', 'changes-requested'].includes(definition.reviewStatus)) {
      errors.push(`${id} has an invalid reviewStatus.`)
    }
    if (!definition.evaluationStatus) errors.push(`${id} is missing evaluationStatus.`)
    if (!definition.presentationStatus) errors.push(`${id} is missing presentationStatus.`)
    if (definition.reviewStatus === 'reviewed' && (!definition.reviewedBy || !definition.reviewedAt)) {
      errors.push(`${id} is marked reviewed without a reviewer and date.`)
    }
  }
  return errors
}

export function withRuleVersion(value) {
  return {
    ...value,
    ruleVersion: RULE_CONFIG_VERSION,
    configVersion: RULE_CONFIG_VERSION,
    configStatus: RULE_CONFIG_STATUS,
  }
}

export function serverRuleVersionStatus(result) {
  if (!result?.ruleVersion || !result?.configVersion || !result?.configStatus) return 'missing'
  return result.ruleVersion === RULE_CONFIG_VERSION &&
    result.configVersion === RULE_CONFIG_VERSION &&
    result.configStatus === RULE_CONFIG_STATUS
    ? 'current'
    : 'stale'
}
