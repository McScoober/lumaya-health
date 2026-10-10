import { CalendarBlank, CaretDown } from '@phosphor-icons/react'

function displayDate(value) {
  if (!value) return 'Choose a date'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return 'Choose a date'
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export default function NativeDateField({ id, value, max, onChange, label = 'Date' }) {
  return (
    <label className="native-date-field" htmlFor={id}>
      <span className="native-date-field__display" aria-hidden="true">
        <CalendarBlank size={21} weight="duotone" />
        <span className={value ? '' : 'native-date-field__placeholder'}>{displayDate(value)}</span>
        <CaretDown size={18} weight="bold" />
      </span>
      <input
        id={id}
        className="native-date-field__input"
        type="date"
        max={max}
        value={value}
        onChange={onChange}
        aria-label={label}
      />
    </label>
  )
}
