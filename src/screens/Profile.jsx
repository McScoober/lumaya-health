// Profile.jsx — Unified Profile, Settings & Parent/Support Hub
// Combines user identity, cycle personalization, app theme, parent/support connection,
// notifications, and privacy controls under one cohesive tab.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, THEME_MAP } from '../state/store.jsx'
import { TopBar, Card, Button, ChipGroup, PillTag } from '../components/ui.jsx'
import Mascot from '../components/Mascot.jsx'
import { ShieldCheck, UserCheck, Bell, Sparkle, Heart, Palette } from '@phosphor-icons/react'

const THEME_OPTIONS = ['Calm pastels', 'Bold & bright', 'Minimal & clean', 'Surprise me']
const SA_OPTIONS = ['Student', 'Athlete', 'Both', 'Neither']
const SLEEP_OPTIONS = ['Early to bed, early to rise', 'Night owl', 'All over the place']

const TRANSPARENCY_MODES = [
  { id: 'full', label: 'Full visibility', desc: 'Sees every check-in, result updates, and monthly overview.' },
  { id: 'flags', label: 'Flags only', desc: 'Notified only if severe pain or red flags occur. Routine days stay private.' },
  { id: 'digest', label: 'Monthly digest', desc: 'One rolled-up monthly summary of general trends and cycle regularity.' },
]

export default function Profile() {
  const navigate = useNavigate()
  const { state, dispatch } = useStore()
  const { profile, identity, notifyPrefs } = state
  const isMinor = identity.isMinor

  const [activeTab, setActiveTab] = useState('settings') // 'settings' | 'support'
  const [nickname, setNickname] = useState(profile.cycleNickname || '')
  const [parentEmail, setParentEmail] = useState(identity.parentEmail || '')
  const [supportName, setSupportName] = useState('')
  const [supportEmail, setSupportEmail] = useState('')
  const [toast, setToast] = useState('')

  const themeLabel = Object.keys(THEME_MAP).find((k) => THEME_MAP[k] === profile.theme) || 'Calm pastels'
  const firstName = identity.name?.split(' ')[0] || 'You'
  const ageDisplay = identity.ageBand ? `${identity.ageBand} yrs old` : 'Teen'

  function flash(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 1800)
  }

  function updateProfile(payload) {
    dispatch({ type: 'SET_PROFILE', payload })
    flash('Preferences saved')
  }

  function deleteData() {
    if (confirm('Delete all your Maisie data from this device? This cannot be undone.')) {
      localStorage.clear()
      dispatch({ type: 'RESET' })
      navigate('/')
    }
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
              {ageDisplay} · {identity.isMinor ? 'Minor Account (Consented)' : 'Independent Account'}
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
                {state.streak}🔥 streak
              </span>
              <span
                style={{
                  background: 'rgba(0,0,0,0.05)',
                  color: 'var(--text-secondary)',
                  padding: '3px 9px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {themeLabel}
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
          <span>⚙️</span> Preferences & Theme
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
      {/* TAB 1: PREFERENCES, THEME, NOTIFICATIONS                              */}
      {/* ===================================================================== */}
      {activeTab === 'settings' && (
        <div className="stack-16" style={{ animation: 'fadeIn 0.2s ease' }}>
          {/* Cycle Nickname */}
          <Card>
            <div className="card__label">Cycle Nickname</div>
            <p className="muted" style={{ margin: '0 0 10px', fontSize: 13 }}>
              What do you call your period? (e.g. Shark Week, The Crimson Tide)
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Give it a fun nickname"
                style={{ flex: 1 }}
              />
              <Button
                variant="secondary"
                onClick={() => updateProfile({ cycleNickname: nickname.trim() })}
              >
                Save
              </Button>
            </div>
          </Card>

          {/* Color Theme */}
          <Card>
            <div className="card__label">App Color Theme</div>
            <p className="muted" style={{ margin: '0 0 10px', fontSize: 13 }}>
              Personalize the tints and styling across your app.
            </p>
            <ChipGroup
              options={THEME_OPTIONS}
              value={themeLabel}
              onChange={(t) => updateProfile({ themeChoice: t })}
              stack
            />
          </Card>

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
              desc="Gentle reminders during your predicted period window."
              on={notifyPrefs.periodCheckin}
              onChange={(v) => dispatch({ type: 'SET_NOTIFY', payload: { periodCheckin: v } })}
            />
            <hr className="divider" style={{ margin: '12px 0' }} />
            <Toggle
              label="Phase Tips"
              desc="Weekly bite-sized tips tailored to your current phase."
              on={notifyPrefs.phaseTips}
              onChange={(v) => dispatch({ type: 'SET_NOTIFY', payload: { phaseTips: v } })}
            />
          </Card>

          {/* Privacy & Data */}
          <Card>
            <div className="card__label">Privacy & Data</div>
            <p className="muted" style={{ fontSize: 13, margin: '0 0 12px' }}>
              Your health answers are encrypted and joined only by an anonymous user ID. They are never sold to advertisers. You can delete all local data at any time.
            </p>
            <Button variant="ghost" style={{ color: 'var(--red)', padding: 0 }} onClick={deleteData}>
              Delete all my data from this device
            </Button>
          </Card>

          <p className="muted center" style={{ fontSize: 11, marginTop: 12 }}>
            Maisie Health · Pattern-awareness tool, not a diagnostic device
          </p>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: PARENT / SUPPORT DASHBOARD                                     */}
      {/* ===================================================================== */}
      {activeTab === 'support' && (
        <div className="stack-16" style={{ animation: 'fadeIn 0.2s ease' }}>
          {isMinor ? (
            <>
              {/* Minor Parent Dashboard Controls */}
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}>
                      Parent Dashboard
                    </h3>
                    <p className="muted" style={{ margin: '2px 0 0', fontSize: 13 }}>
                      {identity.dashboardActive ? 'Dashboard is currently active' : 'Dashboard is paused'}
                    </p>
                  </div>
                  <PillTag>{identity.dashboardActive ? 'Active' : 'Off'}</PillTag>
                </div>

                <p className="muted" style={{ fontSize: 13, margin: '12px 0' }}>
                  Your parent gave permission for you to use Maisie. Whether they see an ongoing view is completely your choice.
                </p>

                {!identity.dashboardActive ? (
                  <div>
                    <div className="card__label">Parent's Email</div>
                    <input
                      className="input"
                      type="email"
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                      placeholder="parent@example.com"
                      style={{ marginBottom: 10 }}
                    />
                    <Button
                      variant="primary"
                      block
                      disabled={!/.+@.+\..+/.test(parentEmail)}
                      onClick={() => {
                        dispatch({ type: 'ACTIVATE_DASHBOARD', email: parentEmail.trim() })
                        flash('Parent dashboard activated')
                      }}
                    >
                      Turn On Parent Dashboard
                    </Button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ padding: '10px 12px', background: '#F9F8F6', borderRadius: 10, fontSize: 13 }}>
                      Connected to: <strong>{identity.parentEmail}</strong>
                    </div>

                    <div className="card__label" style={{ marginTop: 8 }}>Transparency Level</div>
                    {TRANSPARENCY_MODES.map((m) => (
                      <Card
                        key={m.id}
                        onClick={() => dispatch({ type: 'SET_TRANSPARENCY', mode: m.id })}
                        role="button"
                        tabIndex={0}
                        style={{
                          cursor: 'pointer',
                          borderColor: identity.transparencyMode === m.id ? 'var(--pink-accent)' : 'rgba(0,0,0,0.08)',
                          borderWidth: identity.transparencyMode === m.id ? 2 : 1,
                          padding: 12,
                        }}
                      >
                        <div className="row row--between">
                          <strong style={{ fontSize: 13.5 }}>{m.label}</strong>
                          {identity.transparencyMode === m.id && (
                            <span style={{ color: 'var(--pink-accent)', fontWeight: 800 }}>✓</span>
                          )}
                        </div>
                        <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
                          {m.desc}
                        </p>
                      </Card>
                    ))}

                    <Button
                      variant="soft"
                      block
                      style={{ marginTop: 10 }}
                      onClick={() => navigate('/parent')}
                    >
                      Preview What Your Parent Sees 👁️
                    </Button>

                    <Button
                      variant="ghost"
                      block
                      style={{ color: 'var(--red)', marginTop: 4 }}
                      onClick={() => {
                        dispatch({ type: 'DEACTIVATE_DASHBOARD' })
                        flash('Parent dashboard turned off')
                      }}
                    >
                      Turn Off Parent Dashboard
                    </Button>
                  </div>
                )}
              </Card>

              {/* Trust Note Card */}
              <Card style={{ background: '#F0F9F0', borderColor: 'rgba(75, 175, 107, 0.2)' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <ShieldCheck size={24} color="#2B7A41" style={{ flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: 12.5, color: '#1A5328', lineHeight: 1.5 }}>
                    <strong>The Privacy Boundary:</strong> Parents only ever see your overall category level and check-in dates — <strong>never</strong> your private individual answers, pain ratings, or condition details.
                  </p>
                </div>
              </Card>
            </>
          ) : (
            <>
              {/* 18+ Adult Support Contact */}
              <Card>
                <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}>
                  Support Contact
                </h3>
                <p className="muted" style={{ margin: '4px 0 14px', fontSize: 13 }}>
                  Loop in a trusted person — a parent, partner, roommate, or trusted adult. You can revoke access at any time.
                </p>

                {identity.supportContact ? (
                  <div>
                    <div style={{ padding: '12px', background: '#F9F8F6', borderRadius: 10, fontSize: 13, marginBottom: 12 }}>
                      Connected to: <strong>{identity.supportContact.name}</strong> ({identity.supportContact.email})
                    </div>
                    <Button
                      variant="ghost"
                      style={{ color: 'var(--red)' }}
                      onClick={() => dispatch({ type: 'REVOKE_SUPPORT' })}
                    >
                      Revoke Support Access
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="field" style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 12, fontWeight: 600 }}>Their Name</label>
                      <input
                        className="input"
                        value={supportName}
                        onChange={(e) => setSupportName(e.target.value)}
                        placeholder="e.g. Mom, Maya"
                      />
                    </div>
                    <div className="field" style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 12, fontWeight: 600 }}>Their Email</label>
                      <input
                        className="input"
                        type="email"
                        value={supportEmail}
                        onChange={(e) => setSupportEmail(e.target.value)}
                        placeholder="support@example.com"
                      />
                    </div>
                    <Button
                      variant="primary"
                      block
                      disabled={!supportName.trim() || !/.+@.+\..+/.test(supportEmail)}
                      onClick={() => {
                        dispatch({
                          type: 'INVITE_SUPPORT',
                          contact: { name: supportName.trim(), email: supportEmail.trim() },
                        })
                        flash('Support contact added')
                      }}
                    >
                      Invite Support Contact
                    </Button>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      )}
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
