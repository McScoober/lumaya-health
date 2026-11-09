import { useEffect, useId, useRef, useState } from 'react'
import { CaretDown } from '@phosphor-icons/react'

export default function InlineDropdown({ id, value, options, placeholder, onChange, disabled = false, multiple = false, exclusiveValues = [] }) {
  const generatedId = useId()
  const controlId = id || generatedId
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const dropdownRef = useRef(null)
  const triggerRef = useRef(null)
  const optionRefs = useRef([])
  const selectedValues = multiple && Array.isArray(value) ? value : []
  const selected = options.find((option) => String(option.value) === String(value))
  const selectedIndex = multiple
    ? options.findIndex((option) => selectedValues.some((selectedValue) => String(selectedValue) === String(option.value)))
    : options.findIndex((option) => String(option.value) === String(value))

  function openMenu(index = selectedIndex >= 0 ? selectedIndex : 0) {
    setActiveIndex(Math.max(0, index))
    setOpen(true)
  }

  function chooseOption(option, index) {
    if (multiple) {
      const isSelected = selectedValues.some((selectedValue) => String(selectedValue) === String(option.value))
      let nextValues
      if (isSelected) {
        nextValues = selectedValues.filter((selectedValue) => String(selectedValue) !== String(option.value))
      } else if (exclusiveValues.some((exclusiveValue) => String(exclusiveValue) === String(option.value))) {
        nextValues = [option.value]
      } else {
        nextValues = [
          ...selectedValues.filter((selectedValue) => !exclusiveValues.some((exclusiveValue) => String(exclusiveValue) === String(selectedValue))),
          option.value,
        ]
      }
      onChange(nextValues)
      setActiveIndex(index)
      return
    }
    if (String(option.value) !== String(value)) onChange(option.value)
    setActiveIndex(index)
    setOpen(false)
    triggerRef.current?.focus({ preventScroll: true })
  }

  useEffect(() => {
    if (!open) return undefined
    function closeOutside(event) {
      if (!dropdownRef.current?.contains(event.target)) setOpen(false)
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus({ preventScroll: true })
      }
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const activeOption = optionRefs.current[activeIndex]
    activeOption?.focus({ preventScroll: true })
    activeOption?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  function handleTriggerKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      openMenu(event.key === 'ArrowUp' ? options.length - 1 : selectedIndex)
    }
  }

  function handleMenuKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((current) => (current + direction + options.length) % options.length)
      return
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      setActiveIndex(event.key === 'Home' ? 0 : options.length - 1)
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      chooseOption(options[activeIndex], activeIndex)
      return
    }
    if (event.key === 'Tab') setOpen(false)
  }

  return (
    <div className="inline-dropdown" ref={dropdownRef}>
      <button
        ref={triggerRef}
        id={controlId}
        type="button"
        className={`inline-dropdown__trigger ${selected ? '' : 'inline-dropdown__trigger--placeholder'}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${controlId}-options`}
        disabled={disabled}
        onKeyDown={handleTriggerKeyDown}
        onClick={() => (open ? setOpen(false) : openMenu())}
      >
        <span className="inline-dropdown__label">
          {multiple
            ? selectedValues.length ? `${selectedValues.length} selected` : placeholder
            : selected?.label || placeholder}
        </span>
        <CaretDown className={open ? 'inline-dropdown__caret inline-dropdown__caret--open' : 'inline-dropdown__caret'} size={18} weight="bold" aria-hidden="true" />
      </button>
      {open && (
        <div
          id={`${controlId}-options`}
          className="inline-dropdown__options"
          role="listbox"
          aria-labelledby={controlId}
          aria-multiselectable={multiple || undefined}
          tabIndex={-1}
          onKeyDown={handleMenuKeyDown}
        >
          {options.map((option, index) => {
            const isSelected = multiple
              ? selectedValues.some((selectedValue) => String(selectedValue) === String(option.value))
              : String(option.value) === String(value)
            return (
              <button
                key={option.value}
                ref={(element) => { optionRefs.current[index] = element }}
                type="button"
                className="inline-dropdown__option"
                role="option"
                aria-selected={isSelected}
                tabIndex={index === activeIndex ? 0 : -1}
                onFocus={() => setActiveIndex(index)}
                onClick={() => chooseOption(option, index)}
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
