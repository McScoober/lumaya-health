// Shared UI primitives — thin wrappers over the design-system CSS (global.css).
import { useNavigate } from 'react-router-dom'

export function Button({ variant = 'primary', block, className = '', ...props }) {
  return (
    <button
      className={`btn btn--${variant} ${block ? 'btn--block' : ''} ${className}`}
      {...props}
    />
  )
}

export function Chip({ selected, children, stack, ...props }) {
  return (
    <button
      type="button"
      className={`chip ${stack ? 'chip--stack' : ''}`}
      aria-pressed={selected ? 'true' : 'false'}
      {...props}
    >
      {children}
    </button>
  )
}

export function ChipGroup({ options, value, onChange, stack, columns }) {
  return (
    <div className="chips" style={columns ? { display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)` } : undefined}>
      {options.map((opt) => (
        <Chip key={opt} stack={stack} selected={value === opt} onClick={() => onChange(opt)}>
          {opt}
        </Chip>
      ))}
    </div>
  )
}

export function ProgressBar({ value }) {
  return (
    <div className="progress" role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress__fill" style={{ width: `${Math.min(100, value * 100)}%` }} />
    </div>
  )
}

const BADGE_CLASS = { Clear: 'clear', Mild: 'mild', Moderate: 'moderate', Urgent: 'urgent' }
export function Badge({ level }) {
  return (
    <span className={`badge badge--${BADGE_CLASS[level] || 'clear'}`}>
      <span className="badge__dot" aria-hidden="true" />
      {level}
    </span>
  )
}

export function Card({ accent, label, children, className = '', ...props }) {
  return (
    <div className={`card ${accent ? 'card--accent' : ''} ${className}`} {...props}>
      {label && <div className="card__label">{label}</div>}
      {children}
    </div>
  )
}

export function PillTag({ children }) {
  return <span className="pill-tag">{children}</span>
}

export function TopBar({ title, onBack, right }) {
  const navigate = useNavigate()
  return (
    <div className="topbar">
      {onBack !== false && (
        <button className="topbar__back" aria-label="Go back" onClick={onBack || (() => navigate(-1))}>
          ‹
        </button>
      )}
      {title && <h3 style={{ margin: 0, flex: 1 }}>{title}</h3>}
      {right}
    </div>
  )
}
