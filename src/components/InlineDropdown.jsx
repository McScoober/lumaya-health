import { useEffect, useRef, useState } from 'react'
import { CaretDown } from '@phosphor-icons/react'

export default function InlineDropdown({ id, value, options, placeholder, onChange, disabled = false }) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)
  const selected = options.find((option) => String(option.value) === String(value))

  useEffect(() => {
    if (!open) return undefined
    function closeOutside(event) {
      if (!dropdownRef.current?.contains(event.target)) setOpen(false)
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div className="inline-dropdown" ref={dropdownRef}>
      <button
        id={id}
        type="button"
        className={`inline-dropdown__trigger ${selected ? '' : 'inline-dropdown__trigger--placeholder'}`}
        aria-expanded={open}
        aria-controls={`${id}-options`}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.label || placeholder}</span>
        <CaretDown className={open ? 'inline-dropdown__caret inline-dropdown__caret--open' : 'inline-dropdown__caret'} size={18} weight="bold" aria-hidden="true" />
      </button>
      {open && (
        <div id={`${id}-options`} className="inline-dropdown__options">
          {options.map((option) => {
            const isSelected = String(option.value) === String(value)
            return (
              <button
                key={option.value}
                type="button"
                className="inline-dropdown__option"
                aria-pressed={isSelected}
                onClick={() => {
                  if (!isSelected) onChange(option.value)
                  setOpen(false)
                }}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
