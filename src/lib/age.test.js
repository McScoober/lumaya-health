import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ageBandFromBirthDate,
  ageFromBirthDate,
  ageBandFromBirthMonthYear,
  ageFromBirthMonthYear,
} from './age.js'

const september2026 = new Date(2026, 8, 30)

test('derives age from birth month and year', () => {
  assert.equal(ageFromBirthMonthYear(8, 2011, september2026), 15)
  assert.equal(ageFromBirthMonthYear(10, 2011, september2026), 14)
})

test('uses teen screening bands and groups adults as 18+', () => {
  assert.equal(ageBandFromBirthMonthYear(8, 2013, september2026), '13')
  assert.equal(ageBandFromBirthMonthYear(8, 2008, september2026), '18+')
  assert.equal(ageBandFromBirthMonthYear(10, 2013, september2026), null)
})

test('does not move a user into an older band before their birthday day is known', () => {
  assert.equal(ageBandFromBirthMonthYear(9, 2008, september2026), '17')
  assert.equal(ageBandFromBirthMonthYear(9, 2008, new Date(2026, 9, 1)), '18+')
})

test('uses the exact birthday when it is known', () => {
  assert.equal(ageFromBirthDate(9, 30, 2008, september2026), 18)
  assert.equal(ageFromBirthDate(10, 1, 2008, september2026), 17)
  assert.equal(ageBandFromBirthDate(9, 30, 2008, september2026), '18+')
})

test('validates calendar dates, including leap days', () => {
  assert.equal(ageFromBirthDate(2, 29, 2008, new Date(2026, 1, 28)), 17)
  assert.equal(ageFromBirthDate(2, 29, 2009, september2026), null)
  assert.equal(ageBandFromBirthDate(12, 1, 2026, september2026), null)
})
