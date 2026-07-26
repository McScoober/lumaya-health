import { TopBar, Card } from '../components/ui.jsx'

export default function Patterns() {
  
  // Dummy 30-day dot grid map spanning roughly 5 weeks
  const mockDays = Array.from({length: 35}, (_, i) => {
    // leave earlier days empty, populate last 30
    if (i < 5) return { val: 0, impact: false }
    const severity = Math.random() > 0.8 ? 3 : Math.random() > 0.6 ? 2 : Math.random() > 0.3 ? 1 : 0
    const impact = severity === 3 && Math.random() > 0.5
    return { val: severity, impact, isToday: i === 34 }
  })

  const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  return (
    <div className="screen screen--pad-bottom">
      <TopBar title="30-Day View" />
      
      <Card style={{marginTop: 16}}>
        <div className="cal">
          {DOW.map((d, i) => <div key={i} className="cal__dow">{d}</div>)}
          {mockDays.map((cell, i) => {
            const colors = ['rgba(240,234,226,.6)', 'var(--pink-mid)', 'var(--phase-menstrual)', 'var(--pink-accent)']
            return (
              <div key={i} style={{
                aspectRatio: '1', borderRadius: '50%',
                background: colors[cell.val],
                border: cell.isToday ? '2.5px solid var(--text-primary)' : 'none',
                position: 'relative'
              }}>
                {cell.impact && (
                  <div style={{
                    position: 'absolute', top: -2, right: -2,
                    width: 8, height: 8, borderRadius: '50%',
                    background: 'var(--pink-accent)', border: '1px solid #fff'
                  }} />
                )}
              </div>
            )
          })}
        </div>
        
        <div className="row" style={{ marginTop: 24, gap: 12, flexWrap: 'wrap', fontSize: 11, justifyContent: 'center' }}>
          <span className="row" style={{ gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(240,234,226,.6)' }} /> None</span>
          <span className="row" style={{ gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--pink-mid)' }} /> Mild</span>
          <span className="row" style={{ gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--phase-menstrual)' }} /> Mod</span>
          <span className="row" style={{ gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--pink-accent)' }} /> Severe</span>
        </div>
      </Card>

      <div className="stack-16" style={{ marginTop: 24 }}>
        <p className="eyebrow">Pattern Highlights</p>
        
        <Card>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
            your cramps have been above a 3 on day 1 and 2 for the past 3 cycles. that's worth mentioning to a doctor!
          </p>
        </Card>
        
        <Card>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
            you missed dance 4 times in the last 30 days, all in days 16 to 22. that's your luteal phase.
          </p>
        </Card>
      </div>
    </div>
  )
}
