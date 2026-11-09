import InlineDropdown from './InlineDropdown.jsx'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 88 }, (_, index) => currentYear - 13 - index)
const MONTH_OPTIONS = MONTHS.map((label, index) => ({ value: index + 1, label }))
const YEAR_OPTIONS = YEARS.map((year) => ({ value: year, label: String(year) }))

function daysInMonth(month, year) {
  if (!month || !year) return 31
  return new Date(Number(year), Number(month), 0).getDate()
}

function SelectField({ id, label, value, placeholder, options, onChange, onBlur }) {
  return (
    <div className="birth-field" onBlur={onBlur}>
      <label htmlFor={id}>{label}</label>
      <InlineDropdown id={id} value={value} options={options} placeholder={placeholder} onChange={onChange} />
    </div>
  )
}

export default function BirthMonthYearFields({ idPrefix, birthMonth, birthDay, birthYear, onChange, onBlur }) {
  const dayOptions = Array.from({ length: daysInMonth(birthMonth, birthYear) }, (_, index) => ({
    value: index + 1,
    label: String(index + 1),
  }))

  return (
    <div className="birth-fields" role="group" aria-label="Birth date">
      <SelectField
        id={`${idPrefix}-month`}
        label="Month"
        value={birthMonth}
        placeholder="Choose month"
        options={MONTH_OPTIONS}
        onBlur={onBlur}
        onChange={(month) => {
          const nextMonth = Number(month)
          const nextDay = birthDay && birthDay > daysInMonth(nextMonth, birthYear) ? null : birthDay
          onChange(nextMonth, nextDay, birthYear)
        }}
      />

      <SelectField
        id={`${idPrefix}-day`}
        label="Day"
        value={birthDay}
        placeholder="Choose day"
        options={dayOptions}
        onBlur={onBlur}
        onChange={(day) => onChange(birthMonth, Number(day), birthYear)}
      />

      <SelectField
        id={`${idPrefix}-year`}
        label="Year"
        value={birthYear}
        placeholder="Choose year"
        options={YEAR_OPTIONS}
        onBlur={onBlur}
        onChange={(year) => {
          const nextYear = Number(year)
          const nextDay = birthDay && birthDay > daysInMonth(birthMonth, nextYear) ? null : birthDay
          onChange(birthMonth, nextDay, nextYear)
        }}
      />
    </div>
  )
}
