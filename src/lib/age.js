export function ageFromBirthMonthYear(birthMonth, birthYear, now = new Date()) {
  const month = Number(birthMonth)
  const year = Number(birthYear)
  if (!Number.isInteger(month) || month < 1 || month > 12) return null
  if (!Number.isInteger(year) || year < 1900) return null

  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  if (year > currentYear || (year === currentYear && month > currentMonth)) return null

  // With no exact day, keep the user in the younger band throughout their
  // birth month. This avoids treating a minor as an adult too early.
  return currentYear - year - (currentMonth <= month ? 1 : 0)
}

export function ageBandFromBirthMonthYear(birthMonth, birthYear, now = new Date()) {
  const age = ageFromBirthMonthYear(birthMonth, birthYear, now)
  if (age === null || age < 13) return null
  return age >= 18 ? '18+' : String(age)
}
