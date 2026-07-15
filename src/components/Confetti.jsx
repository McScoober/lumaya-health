// Capped celebration moment (TRD 13.2.5) — brief, only at milestones.
import { useEffect, useState } from 'react'

const COLORS = ['#C25070', '#7FB069', '#E8B84B', '#9B7FC2', '#E08097']

export default function Confetti({ show, onDone }) {
  const [pieces] = useState(() =>
    Array.from({ length: 40 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 300,
      color: COLORS[i % COLORS.length],
      rot: Math.random() * 360,
    })),
  )
  useEffect(() => {
    if (!show) return
    const t = setTimeout(() => onDone && onDone(), 1600)
    return () => clearTimeout(t)
  }, [show, onDone])

  if (!show) return null
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <i
          key={i}
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}ms`,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  )
}
