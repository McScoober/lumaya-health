import { ChatCircleText, Phone, ShieldCheck } from '@phosphor-icons/react'

export default function MoodSafetyCard({ compact = false }) {
  return (
    <section className={`mood-safety-card${compact ? ' mood-safety-card--compact' : ''}`} role="alert" aria-labelledby="mood-safety-title">
      <span className="mood-safety-card__icon" aria-hidden="true"><ShieldCheck size={24} weight="duotone" /></span>
      <div>
        <h2 id="mood-safety-title">You deserve support right now</h2>
        <p>Tell a trusted adult who can stay with you. If you might act on these feelings or are in immediate danger, call 911 or go to the nearest emergency department.</p>
        <div className="mood-safety-card__actions">
          <a href="tel:988"><Phone size={18} weight="bold" /> Call 9-8-8</a>
          <a href="sms:988"><ChatCircleText size={18} weight="bold" /> Text 9-8-8</a>
          <a href="sms:686868"><ChatCircleText size={18} weight="bold" /> Text Kids Help Phone</a>
        </div>
        <small>9-8-8 and Kids Help Phone are available across Canada. Tracking is not a substitute for immediate support.</small>
      </div>
    </section>
  )
}
