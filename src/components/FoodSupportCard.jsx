import { ChatCircleText, Phone } from '@phosphor-icons/react'
import { FOOD_SUPPORT } from '../content/foodSupport.js'

export default function FoodSupportCard({ compact = false }) {
  return (
    <aside style={{ border: '1px solid #B6D0B9', borderRadius: 12, padding: compact ? 13 : 16, background: '#F2F8F3' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <ChatCircleText size={22} weight="duotone" color="#4E7554" aria-hidden="true" />
        <div>
          <strong style={{ display: 'block', color: '#315B39', fontSize: 14 }}>{FOOD_SUPPORT.title}</strong>
          <p style={{ margin: '4px 0 0', color: '#4D6852', fontSize: 12.5, lineHeight: 1.45 }}>{FOOD_SUPPORT.body}</p>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
        {FOOD_SUPPORT.resources.map((resource) => (
          <a key={resource.name} href={resource.href} target="_blank" rel="noreferrer" style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#315B39', fontSize: 12.5, textDecoration: 'none', fontWeight: 700 }}>
            <Phone size={17} weight="regular" aria-hidden="true" />
            <span>{resource.name}: <span style={{ fontWeight: 500 }}>{resource.detail}</span></span>
          </a>
        ))}
      </div>
    </aside>
  )
}
