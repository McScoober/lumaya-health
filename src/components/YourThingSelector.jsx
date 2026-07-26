import { useState } from 'react'

const CATEGORIES = [
  { id: 'team_sport', label: 'team sport', icon: '⚽' },
  { id: 'solo_sport', label: 'solo sport', icon: '🏃‍♀️' },
  { id: 'dance', label: 'dance', icon: '🩰' },
  { id: 'music_band', label: 'music / band', icon: '🎺' },
  { id: 'drama', label: 'drama', icon: '🎭' },
  { id: 'art', label: 'art', icon: '🎨' },
  { id: 'cheer_gymnastics', label: 'cheer / gymnastics', icon: '🎀' },
  { id: 'martial_arts', label: 'martial arts', icon: '🥋' },
  { id: 'other', label: 'something else', icon: '➕' },
]

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function YourThingSelector({ value = {}, onChange }) {
  const [selectedCats, setSelectedCats] = useState(value.categories || [])
  const [specifics, setSpecifics] = useState(value.specifics || '')
  const [practiceDays, setPracticeDays] = useState(value.practiceDays || [])

  const toggleCategory = (id) => {
    const next = selectedCats.includes(id) ? selectedCats.filter(c => c !== id) : [...selectedCats, id]
    setSelectedCats(next)
    onChange && onChange({ categories: next, specifics, practiceDays })
  }

  const toggleDay = (day) => {
    const next = practiceDays.includes(day) ? practiceDays.filter(d => d !== day) : [...practiceDays, day]
    setPracticeDays(next)
    onChange && onChange({ categories: selectedCats, specifics, practiceDays: next })
  }

  const handleSpecifics = (e) => {
    setSpecifics(e.target.value)
    onChange && onChange({ categories: selectedCats, specifics: e.target.value, practiceDays })
  }

  return (
    <div className="stack-24" style={{ textAlign: 'left', width: '100%' }}>
      <p style={{ fontWeight: 600, fontSize: 17, margin: 0, color: 'var(--text-primary)' }}>ok, what's your thing?</p>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12
      }}>
        {CATEGORIES.map(cat => {
          const isSelected = selectedCats.includes(cat.id)
          return (
            <button
              key={cat.id}
              onClick={() => toggleCategory(cat.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '16px 8px', borderRadius: 'var(--radius)',
                border: `1.5px solid ${isSelected ? 'var(--pink-accent)' : 'var(--border-light)'}`,
                background: isSelected ? 'var(--pink-light)' : 'var(--surface)',
                color: isSelected ? 'var(--pink-accent)' : 'var(--text-primary)',
                transition: 'all 150ms ease'
              }}
            >
              <span style={{ fontSize: 24 }} aria-hidden="true">{cat.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.1, textAlign: 'center' }}>
                {cat.label}
              </span>
            </button>
          )
        })}
      </div>

      {selectedCats.length > 0 && (
        <div style={{ animation: 'rise 300ms ease' }} className="stack-16">
          <div className="field" style={{ margin: 0 }}>
            <label>Specifics (optional)</label>
            <input 
              type="text" 
              className="input" 
              placeholder="e.g. ballet, violin, swimming"
              value={specifics}
              onChange={handleSpecifics}
            />
          </div>

          <div className="field" style={{ margin: 0 }}>
            <label>Regular practice or rehearsal days</label>
            <div className="chips">
              {DAYS.map(day => (
                <button
                  key={day}
                  className="chip"
                  aria-pressed={practiceDays.includes(day)}
                  onClick={() => toggleDay(day)}
                  style={{ padding: '8px 14px', fontSize: 14 }}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
