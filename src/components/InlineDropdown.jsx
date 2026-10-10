import { useEffect, useRef, useState } from 'react'
import { CaretDown } from '@phosphor-icons/react'

export default function InlineDropdown({ id, value, options, placeholder, onChange, disabled = false }) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const dropdownRef = useRef(null)
  const triggerRef = useRef(null)
  const optionRefs = useRef([])
  const selected = options.find((option) => String(option.value) === String(value))
  const selectedIndex = options.findIndex((option) => String(option.value) === String(value))

  function openMenu(index = selectedIndex >= 0 ? selectedIndex : 0) {
    setActiveIndex(Math.max(0, index))
    setOpen(true)
  }

  function chooseOption(option, index) {
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
        id={id}
        type="button"
        className={`inline-dropdown__trigger ${selected ? '' : 'inline-dropdown__trigger--placeholder'}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        disabled={disabled}
        onKeyDown={handleTriggerKeyDown}
        onClick={() => (open ? setOpen(false) : openMenu())}
      >
        <span className="inline-dropdown__label">{selected?.label || placeholder}</span>
        <CaretDown className={open ? 'inline-dropdown__caret inline-dropdown__caret--open' : 'inline-dropdown__caret'} size={18} weight="bold" aria-hidden="true" />
      </button>
      {open && (
        <div
          id={`${id}-options`}
          className="inline-dropdown__options"
          role="listbox"
          aria-labelledby={id}
          tabIndex={-1}
          onKeyDown={handleMenuKeyDown}
        >
          {options.map((option, index) => {
            const isSelected = String(option.value) === String(value)
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
