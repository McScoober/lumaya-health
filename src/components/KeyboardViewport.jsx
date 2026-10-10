import { useEffect } from 'react'

const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'date',
  'file',
  'hidden',
  'month',
  'radio',
  'range',
  'reset',
  'submit',
  'time',
])

function isTextEntry(element) {
  if (!(element instanceof HTMLElement)) return false
  if (element.matches('textarea, [contenteditable="true"]')) return true
  if (!element.matches('input')) return false
  return !NON_TEXT_INPUT_TYPES.has(element.type)
}

function revealFocusedField(element) {
  const screen = element.closest('.screen')
  if (!screen) return

  const screenRect = screen.getBoundingClientRect()
  const actionBar = screen.querySelector('.screen__actions')
  const actionTop = actionBar?.getBoundingClientRect().top ?? screenRect.bottom
  const fieldRect = element.getBoundingClientRect()
  const visibleTop = screenRect.top + 18
  const visibleBottom = Math.min(screenRect.bottom, actionTop) - 18

  if (fieldRect.top < visibleTop || fieldRect.bottom > visibleBottom) {
    element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' })
  }
}

export default function KeyboardViewport() {
  useEffect(() => {
    const root = document.documentElement
    const viewport = window.visualViewport
    let focusedField = null
    let revealTimers = []

    const updateViewportHeight = () => {
      const height = Math.round(viewport?.height || window.innerHeight)
      root.style.setProperty('--app-viewport-height', `${height}px`)
    }

    const clearRevealTimers = () => {
      revealTimers.forEach(window.clearTimeout)
      revealTimers = []
    }

    const scheduleReveal = () => {
      if (!focusedField) return
      clearRevealTimers()
      revealTimers = [80, 320].map((delay) => window.setTimeout(() => {
        if (focusedField === document.activeElement) revealFocusedField(focusedField)
      }, delay))
    }

    const handleFocusIn = (event) => {
      if (!isTextEntry(event.target)) return
      focusedField = event.target
      root.classList.add('keyboard-active')
      scheduleReveal()
    }

    const handleFocusOut = () => {
      window.setTimeout(() => {
        if (isTextEntry(document.activeElement)) return
        focusedField = null
        root.classList.remove('keyboard-active')
        clearRevealTimers()
      }, 0)
    }

    const handleViewportChange = () => {
      updateViewportHeight()
      scheduleReveal()
    }

    updateViewportHeight()
    viewport?.addEventListener('resize', handleViewportChange)
    viewport?.addEventListener('scroll', handleViewportChange)
    window.addEventListener('resize', handleViewportChange)
    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)

    return () => {
      viewport?.removeEventListener('resize', handleViewportChange)
      viewport?.removeEventListener('scroll', handleViewportChange)
      window.removeEventListener('resize', handleViewportChange)
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
      clearRevealTimers()
      root.classList.remove('keyboard-active')
      root.style.removeProperty('--app-viewport-height')
    }
  }, [])

  return null
}
