// Bottom navigation for the ongoing app (post-onboarding).
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { House, Lightning, PencilLine, CalendarBlank, Handshake, Books } from '@phosphor-icons/react'

const TABS = [
  { to: '/home', label: 'Home', Icon: House },
  { to: '/signals', label: 'Signals', Icon: Lightning },
  { to: '/log/0', label: 'Log', Icon: PencilLine },
  { to: '/patterns', label: 'Patterns', Icon: CalendarBlank },
  { to: '/support', label: 'Support', Icon: Handshake },
  { to: '/library', label: 'Library', Icon: Books },
]

export default function TabBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { state } = useStore()
  const unread = state.messages.filter((m) => !m.read).length

  return (
    <nav className="tabbar" aria-label="Primary">
      {TABS.map((t) => {
        const active = pathname.startsWith(t.to)
        const IconComponent = t.Icon
        return (
          <button
            key={t.to}
            className="tabbar__item"
            aria-current={active ? 'page' : undefined}
            onClick={() => navigate(t.to)}
          >
            <span className="tabbar__icon" aria-hidden="true" style={{ position: 'relative' }}>
              <IconComponent 
                size={22} 
                weight={active ? 'fill' : 'duotone'} 
                color={active ? 'var(--pink-accent)' : 'var(--text-secondary)'} 
              />
              {t.to === '/messages' && unread > 0 && (
                <span
                  style={{
                    position: 'absolute', top: -4, right: -8,
                    background: 'var(--red)', color: '#fff', borderRadius: 999,
                    fontSize: 10, minWidth: 16, height: 16, display: 'grid', placeItems: 'center',
                    padding: '0 4px', fontFamily: 'var(--font-body)',
                  }}
                >
                  {unread}
                </span>
              )}
            </span>
            {t.label}
          </button>
        )
      })}
    </nav>
  )
}
