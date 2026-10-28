import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_TRACKING_MODULES,
  foodSensitiveModeIsActive,
  profilePayloadForTrackingModules,
  shouldShowBleedingDetails,
  shouldShowPainRelief,
  symptomIsEnabled,
  trackingModulesFromProfile,
} from './trackingPreferences.js'

test('tracking preferences use safe defaults and keep food optional', () => {
  assert.deepEqual(trackingModulesFromProfile({}), DEFAULT_TRACKING_MODULES)
})

test('food-sensitive mode starts after five of the last fourteen logged days report very few meals', () => {
  const dailyLogs = Object.fromEntries(Array.from({ length: 14 }, (_, index) => [
    `2026-10-${String(index + 1).padStart(2, '0')}`,
    { checkinCompleted: true, fuel: { meals: index < 5 ? 'few' : 'most' } },
  ]))
  assert.equal(foodSensitiveModeIsActive({}, dailyLogs), true)
  dailyLogs['2026-10-01'].fuel.meals = 'most'
  assert.equal(foodSensitiveModeIsActive({}, dailyLogs), false)
})

test('legacy food preference is reflected in tracking modules', () => {
  assert.equal(trackingModulesFromProfile({ foodModule: true }).food, true)
})

test('saving tracking preferences keeps the learn food module in sync', () => {
  const payload = profilePayloadForTrackingModules({ ...DEFAULT_TRACKING_MODULES, food: true })
  assert.equal(payload.foodModule, true)
  assert.equal(payload.trackingModules.food, true)
})

test('symptoms appear when at least one related module is enabled', () => {
  const modules = { ...DEFAULT_TRACKING_MODULES, symptoms: true, skinHair: false }
  assert.equal(symptomIsEnabled('Cramps', modules), true)
  assert.equal(symptomIsEnabled('Skin breakout', modules), false)
  assert.equal(symptomIsEnabled('Spotting', { ...modules, symptoms: false, bleedingDetail: true }), true)
  assert.equal(symptomIsEnabled('Spotting', { ...modules, symptoms: true, bleedingDetail: false }), false)
})

test('core stays enabled even when optional modules are all disabled', () => {
  const payload = profilePayloadForTrackingModules(Object.fromEntries(
    Object.keys(DEFAULT_TRACKING_MODULES).map((key) => [key, false]),
  ))
  assert.equal(payload.trackingModules.core, true)
})

test('food opt-out disables the module and its content preference', () => {
  const payload = profilePayloadForTrackingModules({ ...DEFAULT_TRACKING_MODULES, food: true }, { hideFoodContent: true })
  assert.equal(payload.trackingModules.food, false)
  assert.equal(payload.foodModule, false)
  assert.equal(payload.hideFoodContent, true)
})

test('explicitly restoring food clears conflicting food visibility preferences', () => {
  const payload = profilePayloadForTrackingModules(
    { ...DEFAULT_TRACKING_MODULES, food: true },
    { hideFoodContent: true, restoreFoodContent: true },
  )
  assert.equal(payload.trackingModules.food, true)
  assert.equal(payload.foodModule, true)
  assert.equal(payload.hideFoodContent, false)
  assert.equal(payload.sensitiveFoodMode, false)
})

test('legacy module choices migrate without dropping pain or bleeding details', () => {
  const modules = trackingModulesFromProfile({ trackingModules: { pain: true, period: true, sleep: false, skin: true } })
  assert.equal(modules.painRelief, true)
  assert.equal(modules.bleedingDetail, true)
  assert.equal(modules.sleep, false)
  assert.equal(modules.skinHair, true)
})

test('pain relief starts at pain 4 and respects the module preference', () => {
  assert.equal(shouldShowPainRelief({ painRelief: true }, 3), false)
  assert.equal(shouldShowPainRelief({ painRelief: true }, 4), true)
  assert.equal(shouldShowPainRelief({ painRelief: false }, 8), false)
})

test('bleeding details only appear with current or previously entered bleeding context', () => {
  const modules = { bleedingDetail: true }
  assert.equal(shouldShowBleedingDetails(modules, {}), false)
  assert.equal(shouldShowBleedingDetails(modules, { period: true }), true)
  assert.equal(shouldShowBleedingDetails(modules, { spotting: true }), true)
  assert.equal(shouldShowBleedingDetails({ bleedingDetail: false }, { period: true }), false)
})
