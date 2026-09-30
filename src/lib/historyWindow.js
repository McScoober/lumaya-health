import { addDays, dateKeyLocal } from '../engine/cyclePredictor.js'

export const INITIAL_HISTORY_MONTHS = 18
export const HISTORY_PAGE_MONTHS = 12

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

export function initialHistoryStart(now = new Date()) {
  return dateKeyLocal(addMonths(startOfMonth(now), -(INITIAL_HISTORY_MONTHS - 1)))
}

export function bufferedMonthRange(month) {
  const first = startOfMonth(month)
  const nextMonth = addMonths(first, 1)
  return {
    start: dateKeyLocal(addDays(first, -7)),
    end: dateKeyLocal(addDays(nextMonth, 6)),
  }
}

export function historyPageRange(beforeDate, months = HISTORY_PAGE_MONTHS) {
  const parsedBefore = beforeDate instanceof Date ? beforeDate : new Date(`${beforeDate}T00:00:00`)
  const endExclusive = startOfMonth(parsedBefore)
  const start = addMonths(endExclusive, -months)
  return {
    start: dateKeyLocal(start),
    end: dateKeyLocal(addDays(endExclusive, -1)),
    nextBefore: dateKeyLocal(start),
  }
}

export function monthCacheKey(userId, month) {
  return `${userId}:${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
}
