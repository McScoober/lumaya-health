// Bottom navigation for the ongoing app (post-onboarding).
import { useLocation, useNavigate } from 'react-router-dom'
import { House, CalendarBlank, Books, FirstAid, UserCircle } from '@phosphor-icons/react'
import { features } from '../config/features.js'

const TABS = [
  { to: '/home', label: 'Home', Icon: House },
  { to: '/patterns', label: 'Patterns', Icon: CalendarBlank },
  ...(features.routeSummary ? [{ to: '/route', label: 'Route', Icon: FirstAid }] : []),
  { to: '/learn', label: 'Learn', Icon: Books },
  { to: '/me', label: 'Me', Icon: UserCircle },
]

export default function TabBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

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
            </span>
            {t.label}
          </button>
        )
      })}
    </nav>
  )
}
