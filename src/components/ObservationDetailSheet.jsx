import { useEffect, useRef } from 'react'
import { ArrowRight, CalendarDots, ChatCircleText, Check, ClipboardText, Plus, X } from '@phosphor-icons/react'

function formatDate(dateKey) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatDates(dates = []) {
  const labels = dates.map(formatDate)
  if (labels.length === 0) return 'No matching dates are available in this view.'
  if (labels.length === 1) return labels[0]
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')}, and ${labels.at(-1)}`
}

export default function ObservationDetailSheet({
  observation,
  selected,
  onToggleSelected,
  onReviewSummary,
  onPrepare,
  onClose,
}) {
  const closeRef = useRef(null)

  useEffect(() => {
    closeRef.current?.focus()
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="signal-sheet-backdrop" role="presentation" onClick={onClose}>
      <section
        className="signal-sheet observation-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="observation-sheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="signal-sheet__header">
          <div>
            <p className="eyebrow">Repeated observation</p>
            <h2 id="observation-sheet-title">{observation.title}</h2>
          </div>
          <button ref={closeRef} type="button" className="signal-sheet__close" onClick={onClose} aria-label="Close">
            <X size={21} weight="bold" aria-hidden="true" />
          </button>
        </header>

        <div className="signal-sheet__details">
          <DetailBlock label="What Maisie noticed" text={observation.body} />
          <DetailBlock
            label="When it was logged"
            text={formatDates(observation.dates)}
            Icon={CalendarDots}
          />
          <DetailBlock
            label="Daily impact"
            text={observation.impactDays > 0
              ? `Daily impact was also logged on ${observation.impactDays} of ${observation.dates.length} matching ${observation.dates.length === 1 ? 'day' : 'days'}.`
              : 'No daily impact was entered on these matching days.'}
          />
          <DetailBlock label="What could make this clearer" text={observation.missing} />
          <DetailBlock label="What to keep logging" text={observation.next} />
        </div>

        <div className="observation-sheet__actions">
          <button type="button" className="observation-sheet__select" aria-pressed={selected} onClick={onToggleSelected}>
            {selected ? <Check size={18} weight="bold" /> : <Plus size={18} weight="bold" />}
            <span>{selected ? 'Added to visit' : 'Add to visit'}</span>
          </button>
          <button type="button" onClick={onReviewSummary}>
            <ClipboardText size={18} weight="duotone" />
            <span>Review summary</span>
            <ArrowRight size={16} weight="bold" />
          </button>
          <button type="button" onClick={onPrepare}>
            <ChatCircleText size={18} weight="duotone" />
            <span>Prepare what to say</span>
            <ArrowRight size={16} weight="bold" />
          </button>
        </div>

        <p className="muted signal-sheet__basis">This describes information entered in Maisie. It is not a diagnosis or medical assessment.</p>
      </section>
    </div>
  )
}

function DetailBlock({ label, text, Icon }) {
  return (
    <div>
      <div className="card__label">{Icon && <Icon size={15} weight="duotone" aria-hidden="true" />} {label}</div>
      <p>{text}</p>
    </div>
  )
}
