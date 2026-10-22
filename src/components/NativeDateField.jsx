import { useRef } from 'react'
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
  const inputRef = useRef(null)

  function openPicker() {
    const input = inputRef.current
    if (!input) return
    input.focus({ preventScroll: true })
    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker()
        return
      } catch {
        // Safari and older WebViews fall back to a direct input click.
      }
    }
    input.click()
  }

  return (
    <div className="native-date-field">
      <button
        type="button"
        className="native-date-field__trigger"
        onClick={openPicker}
        aria-label={`${label}${value ? `, ${displayDate(value)}` : ''}`}
      >
        <CalendarBlank size={21} weight="duotone" />
        <span className={value ? '' : 'native-date-field__placeholder'}>{displayDate(value)}</span>
        <CaretDown size={18} weight="bold" />
      </button>
      <input
        ref={inputRef}
        id={id}
        className="native-date-field__input"
        type="date"
        max={max}
        value={value}
        onChange={onChange}
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  )
}
