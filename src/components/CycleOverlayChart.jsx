// CycleOverlayChart, teen-friendly version
import { useState } from 'react'

const PHASES = [
  { label: 'Period', days: 5, color: '#E8A0B0', lightColor: '#FDF0F4' },
  { label: 'Building Up', days: 9, color: '#A0C4A4', lightColor: '#F0F7F0' },
  { label: 'Peak', days: 4, color: '#E8C86A', lightColor: '#FDF8EC' },
  { label: 'Wind Down', days: 10, color: '#C4A8E0', lightColor: '#F5F0FC' },
]
const TOTAL_DAYS = PHASES.reduce((s, p) => s + p.days, 0)

const SIGNALS = [
  {
    key: 'energy',
    label: '⚡ Energy',
    color: '#E8C86A',
    values: [2, 2, 3, 3, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4, 3, 3, 3, 2, 2, 2, 2, 2],
    insight: 'Your energy usually builds after your period ends and peaks mid-cycle. It can dip in the wind-down week, which is normal.',
  },
  {
    key: 'skin',
    label: '✨ Skin',
    color: '#E8A0B0',
    values: [3, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4, 4, 3, 3, 3, 2, 2, 2, 3, 3, 3, 3],
    insight: 'Skin can look clearer during the building-up phase. Breakouts before your period are common and not your fault.',
  },
  {
    key: 'sleep',
    label: '💤 Sleep',
    color: '#C4A8E0',
    values: [3, 3, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 3, 3, 3, 2, 2, 2, 2, 3, 3, 3],
    insight: 'Sleep is often best mid-cycle. Restless nights can show up in the wind-down week, so protect your sleep routine then.',
  },
  {
    key: 'mood',
    label: '💚 Mood',
    color: '#A0C4A4',
    values: [2, 2, 2, 3, 3, 4, 4, 5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 3, 3, 3, 2, 2, 2, 2, 2, 3, 3, 3],
    insight: 'Mood often lifts in the building-up and peak phases. The wind-down week can feel heavier, and tracking helps you plan ahead.',
  },
]

function makePath(values, W, H, padX = 4, padY = 14) {
  const n = values.length
  const maxVal = 5
  const points = values.map((v, i) => ({
    x: padX + (i / (n - 1)) * (W - padX * 2),
    y: padY + ((maxVal - v) / maxVal) * (H - padY * 2),
  }))
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const cp1x = points[i - 1].x + (points[i].x - points[i - 1].x) / 2
    const cp1y = points[i - 1].y
    const cp2x = cp1x
    const cp2y = points[i].y
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${points[i].x} ${points[i].y}`
  }
  return d
}

export default function CycleOverlayChart({ cycleDay = 14 }) {
  const W = 320
  const H = 140
  const padX = 4

  const todayX = padX + ((Math.min(cycleDay - 1, TOTAL_DAYS - 1) / (TOTAL_DAYS - 1)) * (W - padX * 2))

  let xCursor = padX
  const phaseBands = PHASES.map((p) => {
    const bw = (p.days / TOTAL_DAYS) * (W - padX * 2)
    const band = { ...p, x: xCursor, w: bw }
    xCursor += bw
    return band
  })

  // Find which phase today falls in.
  let dayCount = 0
  const todayPhase = PHASES.find((p) => {
    dayCount += p.days
    return cycleDay <= dayCount
  }) || PHASES[PHASES.length - 1]

  return (
    <div style={{ width: '100%' }}>
      <SignalChart
        phaseBands={phaseBands}
        todayX={todayX}
        todayPhase={todayPhase}
        W={W}
        H={H}
        padX={padX}
        cycleDay={cycleDay}
      />
    </div>
  )
}

function SignalChart({ phaseBands, todayX, todayPhase, W, H, padX, cycleDay }) {
  const [activeKey, setActiveKey] = useState('energy')

  const signal = SIGNALS.find(s => s.key === activeKey) || SIGNALS[0]

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '10px 12px 4px' }}>
        {SIGNALS.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveKey(s.key)}
            style={{
              padding: '5px 12px',
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 600,
              border: activeKey === s.key ? `2px solid ${s.color}` : '2px solid transparent',
              background: activeKey === s.key ? '#fff' : 'rgba(44,24,16,0.08)',
              color: activeKey === s.key ? s.color : '#5C3D2E',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H + 30}`} width="100%" style={{ display: 'block' }}>
        {phaseBands.map(p => (
          <rect key={p.label} x={p.x} y={0} width={p.w} height={H} fill={p.lightColor} />
        ))}
        {phaseBands.slice(1).map(p => (
          <line key={p.label + '-d'} x1={p.x} y1={0} x2={p.x} y2={H} stroke="#e8e0da" strokeWidth={1} />
        ))}

        <defs>
          <linearGradient id={`grad-${signal.key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={signal.color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={signal.color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={makePath(signal.values, W, H, padX) + ` L ${W - padX} ${H} L ${padX} ${H} Z`}
          fill={`url(#grad-${signal.key})`}
        />

        <path
          d={makePath(signal.values, W, H, padX)}
          fill="none"
          stroke={signal.color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <line x1={todayX} y1={0} x2={todayX} y2={H} stroke="#E0528A" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.7} />
        <circle cx={todayX} cy={(() => {
          const dayIdx = Math.min(cycleDay - 1, signal.values.length - 1)
          const v = signal.values[dayIdx]
          return 14 + ((5 - v) / 5) * (H - 28)
        })()} r={4} fill="#E0528A" />

        {phaseBands.map(p => (
          <text key={p.label + '-lbl'} x={p.x + p.w / 2} y={H + 16} textAnchor="middle" fontSize={8.5} fill={p.color} fontWeight="700" fontFamily="'DM Sans', sans-serif">
            {p.label}
          </text>
        ))}
      </svg>

      <div style={{
        margin: '4px 12px 12px',
        padding: '10px 14px',
        background: '#fff',
        borderRadius: 12,
        borderLeft: `3px solid ${signal.color}`,
        fontSize: 13,
        lineHeight: 1.5,
        color: '#2C1810',
      }}>
        {signal.insight}
      </div>
    </div>
  )
}
