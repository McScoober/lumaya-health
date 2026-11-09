import { X } from '@phosphor-icons/react'

export default function SignalDetailSheet({ signal, logCount, onClose }) {
  return (
    <div className="signal-sheet-backdrop" role="presentation" onClick={onClose}>
      <section
        className="signal-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`${signal.title} details`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="signal-sheet__header">
          <div>
            <p className="eyebrow">Body signal</p>
            <h2>{signal.title}</h2>
          </div>
          <button type="button" className="signal-sheet__close" onClick={onClose} aria-label="Close">
            <X size={21} weight="bold" aria-hidden="true" />
          </button>
        </header>
        <div className="signal-sheet__details">
          <DetailBlock label="What it means" text={signal.means} />
          <DetailBlock label="How Maisie got this" text={signal.derived} />
          <DetailBlock label="Inputs used" text={signal.uses} />
          <DetailBlock label="What helps next" text={signal.next} />
        </div>
        <p className="muted signal-sheet__basis">
          {logCount < 3
            ? `Still collecting: ${logCount} check-in${logCount === 1 ? '' : 's'} in this view.`
            : `Based on ${logCount} check-ins in this view.`}
        </p>
      </section>
    </div>
  )
}

function DetailBlock({ label, text }) {
  return <div><div className="card__label">{label}</div><p>{text}</p></div>
}
