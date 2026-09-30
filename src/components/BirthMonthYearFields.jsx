import InlineDropdown from './InlineDropdown.jsx'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 88 }, (_, index) => currentYear - 13 - index)
const MONTH_OPTIONS = MONTHS.map((label, index) => ({ value: index + 1, label }))
const YEAR_OPTIONS = YEARS.map((year) => ({ value: year, label: String(year) }))

function SelectField({ id, label, value, placeholder, options, onChange, onBlur }) {
  return (
    <div className="birth-field" onBlur={onBlur}>
      <label htmlFor={id}>{label}</label>
      <InlineDropdown id={id} value={value} options={options} placeholder={placeholder} onChange={onChange} />
    </div>
  )
}

export default function BirthMonthYearFields({ idPrefix, birthMonth, birthYear, onChange, onBlur }) {
  return (
    <div className="birth-fields" role="group" aria-label="Birth month and year">
      <SelectField
        id={`${idPrefix}-month`}
        label="Month"
        value={birthMonth}
        placeholder="Choose month"
        options={MONTH_OPTIONS}
        onBlur={onBlur}
        onChange={(month) => onChange(Number(month), birthYear)}
      />

      <SelectField
        id={`${idPrefix}-year`}
        label="Year"
        value={birthYear}
        placeholder="Choose year"
        options={YEAR_OPTIONS}
        onBlur={onBlur}
        onChange={(year) => onChange(birthMonth, Number(year))}
      />
    </div>
  )
}
