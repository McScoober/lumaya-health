export default function MetabolicCard({ title, value, color, description, trendPoints = [] }) {
  const min = Math.min(...trendPoints)
  const max = Math.max(...trendPoints)
  const range = max === min ? 1 : max - min
  
  const points = trendPoints.map((val, i) => {
    const x = (i / (trendPoints.length - 1 || 1)) * 100
    const y = 100 - ((val - min) / range) * 100
    return `${x},${y}`
  }).join(' ')

  return (
    <div style={{
      background: '#fff',
      border: '1px solid rgba(44,24,16,0.08)',
      borderRadius: 14,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      boxShadow: '0 10px 30px rgba(44,24,16,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: color }} />
          <h3 style={{ margin: 0, color: '#2C1810', fontSize: 16 }}>{title}</h3>
        </div>
        <span style={{ color: '#2C1810', fontWeight: 600, fontSize: 14 }}>{value}</span>
      </div>
      
      {trendPoints.length > 0 && (
        <div style={{ height: 40, width: '100%', padding: '4px 0' }}>
          <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 -5 100 110">
            <polyline 
              points={points} 
              fill="none" 
              stroke={color} 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          </svg>
        </div>
      )}
      
      <p style={{ margin: 0, color: '#5C3D2E', fontSize: 13, lineHeight: 1.4 }}>
        {description}
      </p>
    </div>
  )
}
