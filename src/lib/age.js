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

export function ageFromBirthDate(birthMonth, birthDay, birthYear, now = new Date()) {
  const month = Number(birthMonth)
  const day = Number(birthDay)
  const year = Number(birthYear)
  if (!Number.isInteger(month) || month < 1 || month > 12) return null
  if (!Number.isInteger(year) || year < 1900) return null
  if (!Number.isInteger(day) || day < 1 || day > new Date(year, month, 0).getDate()) return null

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const birthday = new Date(year, month - 1, day)
  if (birthday > today) return null

  let age = today.getFullYear() - year
  if (today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day)) age -= 1
  return age
}

export function ageBandFromBirthDate(birthMonth, birthDay, birthYear, now = new Date()) {
  const age = ageFromBirthDate(birthMonth, birthDay, birthYear, now)
  if (age === null || age < 13) return null
  return age >= 18 ? '18+' : String(age)
}
