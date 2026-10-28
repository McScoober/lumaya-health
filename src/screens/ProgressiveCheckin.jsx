import { ArrowRight, SlidersHorizontal } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { ProgressBar } from '../components/ui.jsx'
import { healthBackgroundProgress, healthBackgroundValues } from '../lib/healthBackground.js'

export default function ProgressiveCheckin() {
  const navigate = useNavigate()
  const { state } = useStore()
  const progress = healthBackgroundProgress(healthBackgroundValues(state.answers, state.history))

  if (progress.complete) return null

  return (
    <button
      type="button"
      className="home-personalize"
      onClick={() => navigate('/me/health-background', { state: { from: 'home' } })}
    >
      <span className="home-personalize__icon" aria-hidden="true"><SlidersHorizontal size={22} weight="duotone" /></span>
      <div className="home-personalize__copy">
        <strong>Personalize Maisie</strong>
        <span className="home-personalize__count">{progress.answered} of {progress.total} answered</span>
        <ProgressBar value={progress.ratio} />
      </div>
      <ArrowRight size={19} weight="bold" aria-hidden="true" />
    </button>
  )
}
