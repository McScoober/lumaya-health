// Profile.jsx — Unified Profile, Settings & Parent/Support Hub
// Combines user identity, cycle personalization, parent/support connection,
// notifications, and privacy controls under one cohesive tab.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../state/store.jsx'
import { TopBar, Card, Button, ChipGroup } from '../components/ui.jsx'
import Mascot from '../components/Mascot.jsx'
import { addDays, dateKeyLocal } from '../engine/cyclePredictor.js'
import { supabase } from '../lib/supabase.js'
import SupportAccess from '../components/SupportAccess.jsx'
import { clearLegacyHealthStorage } from '../lib/trackerRecords.js'

const SA_OPTIONS = ['Student', 'Athlete', 'Both', 'Neither']
const SLEEP_OPTIONS = ['Early to bed, early to rise', 'Night owl', 'All over the place']

function recentCheckInCount(dailyLogs = {}, today = new Date(), days = 5) {
  let count = 0
  for (let i = 0; i < days; i++) {
    const key = dateKeyLocal(addDays(today, -i))
    const log = dailyLogs[key]
    if (log?.checkinCompleted || log?.mood || log?.vibe !== undefined || log?.symptoms?.length || log?.pain !== undefined || log?.impact !== undefined) {
      count += 1
    }
  }
  return count
}

export default function Profile() {
  const navigate = useNavigate()
  const { state, dispatch } = useStore()
  const { profile, identity, notifyPrefs } = state
  const isMinor = identity.isMinor

  const [activeTab, setActiveTab] = useState('settings') // 'settings' | 'support'
  const [toast, setToast] = useState('')

  const ageDisplay = identity.ageBand ? `${identity.ageBand} yrs old` : 'Teen'
  const recentLogs = recentCheckInCount(state.dailyLogs)

  function flash(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 1800)
  }

  function updateProfile(payload) {
    dispatch({ type: 'SET_PROFILE', payload })
    flash('Preferences saved')
  }

  async function deleteData() {
    if (!confirm('Sign out and clear Maisie data from this device? Saved account data will remain available when you sign in again.')) return
    if (supabase) {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) { flash('Could not sign out. Please try again.'); return }
    }
    clearLegacyHealthStorage(localStorage)
    dispatch({ type: 'RESET' })
    navigate('/')
  }

  return (
    <div className="screen screen--pad-bottom">
      {toast && <div className="toast">{toast}</div>}

      <TopBar title="Profile & Account" onBack={false} />

      {/* User Card Header */}
      <Card style={{ marginTop: 12, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Mascot size={72} mood="happy" />
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>
              {identity.name || 'Maisie User'}
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--text-secondary)' }}>
              {ageDisplay} · {identity.isMinor ? 'Teen account' : 'Independent account'}
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <span
                style={{
                  background: 'rgba(224, 76, 122, 0.1)',
                  color: 'var(--pink-accent)',
                  padding: '3px 9px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {recentLogs} days logged this week
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Segmented Tab Switcher */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
          background: 'rgba(0,0,0,0.05)',
          padding: 4,
          borderRadius: 14,
          marginTop: 14,
          marginBottom: 14,
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          style={{
            padding: '9px 12px',
            borderRadius: 10,
            border: 'none',
            background: activeTab === 'settings' ? '#fff' : 'transparent',
            color: activeTab === 'settings' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: 13,
            boxShadow: activeTab === 'settings' ? '0 2px 5px rgba(0,0,0,0.08)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <span>⚙️</span> Preferences
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('support')}
          style={{
            padding: '9px 12px',
            borderRadius: 10,
            border: 'none',
            background: activeTab === 'support' ? '#fff' : 'transparent',
            color: activeTab === 'support' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: 13,
            boxShadow: activeTab === 'support' ? '0 2px 5px rgba(0,0,0,0.08)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <span>🤝</span> {isMinor ? 'Parent Dashboard' : 'Support Contact'}
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: PREFERENCES AND NOTIFICATIONS                                  */}
      {/* ===================================================================== */}
      {activeTab === 'settings' && (
        <div className="stack-16" style={{ animation: 'fadeIn 0.2s ease' }}>
          {/* Lifestyle Preferences */}
          <Card>
            <div className="card__label">Student & Athlete Status</div>
            <div style={{ marginTop: 8 }}>
              <ChipGroup
                options={SA_OPTIONS}
                value={profile.studentAthlete}
                onChange={(v) => updateProfile({ studentAthlete: v })}
                columns={2}
              />
            </div>

            <div className="card__label" style={{ marginTop: 18 }}>Sleep Habits</div>
            <div style={{ marginTop: 8 }}>
              <ChipGroup
                options={SLEEP_OPTIONS}
                value={profile.sleep}
                onChange={(v) => updateProfile({ sleep: v })}
                stack
              />
            </div>
          </Card>

          {/* Notifications */}
          <Card>
            <div className="card__label">Notifications</div>
            <Toggle
              label="Period Check-ins"
              desc="Gentle reminders around your learned period window."
              on={notifyPrefs.periodCheckin}
              onChange={(v) => dispatch({ type: 'SET_NOTIFY', payload: { periodCheckin: v } })}
            />

          </Card>

          <p className="muted center" style={{ fontSize: 11, marginTop: 12 }}>
            Maisie Health · Pattern-awareness tool, not a diagnostic device
          </p>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: PARENT / SUPPORT DASHBOARD                                     */}
      {/* ===================================================================== */}
      {activeTab === 'support' && <SupportAccess />}

    </div>
  )
}

function Toggle({ label, desc, on, onChange }) {
  return (
    <div className="row row--between" style={{ alignItems: 'flex-start', gap: 12 }}>
      <div>
        <strong style={{ fontSize: 14 }}>{label}</strong>
        {desc && <p className="muted" style={{ margin: '2px 0 0', fontSize: 12.5 }}>{desc}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        style={{
          width: 44,
          height: 26,
          borderRadius: 99,
          border: 'none',
          background: on ? 'var(--pink-accent)' : '#E2E8F0',
          position: 'relative',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'background 0.2s ease',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: on ? 21 : 3,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            transition: 'left 0.2s ease',
          }}
        />
      </button>
    </div>
  )
}
