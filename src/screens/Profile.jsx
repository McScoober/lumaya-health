import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Bell, Cake, CaretRight, CheckCircle, CloudArrowUp, Database, IdentificationCard, Info,
  DownloadSimple, Lightbulb, PencilSimple, ShieldCheck, SlidersHorizontal, Trash, UsersThree, X,
} from '@phosphor-icons/react'
import { useStore } from '../state/store.jsx'
import { Button, Chip, ChipGroup } from '../components/ui.jsx'
import FoodSupportCard from '../components/FoodSupportCard.jsx'
import SupportAccess from '../components/SupportAccess.jsx'
import BirthMonthYearFields from '../components/BirthMonthYearFields.jsx'
import { supabase } from '../lib/supabase.js'
import { clearLegacyHealthStorage } from '../lib/trackerRecords.js'
import { clearSignupDraft } from '../lib/signupDraft.js'
import { clearGuestTracker } from '../lib/guestTracker.js'
import { deleteCurrentAccount } from '../lib/sync.js'
import { ageBandFromBirthMonthYear } from '../lib/age.js'
import {
  profilePayloadForTrackingModules,
  DIET_PREFERENCES,
  foodSensitiveModeIsActive,
  PERIOD_PRODUCTS,
  trackingModulesFromProfile,
  visibleTrackingModules,
} from '../lib/trackingPreferences.js'
import { healthBackgroundProgress, healthBackgroundValues } from '../lib/healthBackground.js'

const SA_OPTIONS = ['Student', 'Athlete', 'Both', 'Neither']
const SLEEP_OPTIONS = ['Early to bed, early to rise', 'Night owl', 'All over the place']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function Profile() {
  const navigate = useNavigate()
  const { state, dispatch } = useStore()
  const { profile, identity, notifyPrefs } = state
  const hasSavedAccount = Boolean(state.accountId)
  const [activeSheet, setActiveSheet] = useState(null)
  const [sheetClosing, setSheetClosing] = useState(false)
  const [toast, setToast] = useState('')
  const [birthMonth, setBirthMonth] = useState(identity.birthMonth)
  const [birthYear, setBirthYear] = useState(identity.birthYear)
  const triggerRef = useRef(null)
  const closeTimerRef = useRef(null)

  const trackingModules = useMemo(() => trackingModulesFromProfile(profile), [profile])
  const trackingCount = Object.entries(trackingModules).filter(([id, enabled]) => id !== 'core' && enabled).length
  const backgroundProgress = useMemo(
    () => healthBackgroundProgress(healthBackgroundValues(state.answers, state.history)),
    [state.answers, state.history],
  )
  const ageDisplay = identity.ageBand === '18+' ? '18+ years old' : identity.ageBand ? `${identity.ageBand} years old` : 'Teen account'
  const birthLabel = birthMonth && birthYear ? `${MONTHS[birthMonth - 1].slice(0, 3)} ${birthYear}` : 'Add'
  const birthError = (birthMonth || birthYear) && !ageBandFromBirthMonthYear(birthMonth, birthYear)
    ? 'Maisie is for people age 13 and up.'
    : ''

  function flash(message) {
    setToast(message)
    window.setTimeout(() => setToast(''), 1800)
  }

  function openSheet(name, event) {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
    triggerRef.current = event?.currentTarget || null
    setSheetClosing(false)
    setActiveSheet(name)
  }

  const closeSheet = useCallback(() => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
    setSheetClosing(true)
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    closeTimerRef.current = window.setTimeout(() => {
      setActiveSheet(null)
      setSheetClosing(false)
      triggerRef.current?.focus()
    }, reduceMotion ? 0 : 190)
  }, [])

  useEffect(() => () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
  }, [])

  function updateProfile(payload, message = 'Preferences saved') {
    dispatch({ type: 'SET_PROFILE', payload })
    flash(message)
  }

  function updateBirthMonthYear(month, year) {
    setBirthMonth(month)
    setBirthYear(year)
    if (!ageBandFromBirthMonthYear(month, year)) return
    dispatch({ type: 'SET_BIRTH_MONTH_YEAR', birthMonth: month, birthYear: year })
    flash('Birthday saved')
  }

  async function clearDeviceData() {
    const message = hasSavedAccount
      ? 'Sign out and clear Maisie data from this device? Information saved to your account will still be there when you sign in again.'
      : 'Clear your Maisie tracker from this device? Because it is not saved to an account, this cannot be undone.'
    if (!window.confirm(message)) return
    if (supabase && hasSavedAccount) {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) {
        flash('Could not sign out. Please try again.')
        return
      }
    }
    clearLegacyHealthStorage(localStorage)
    clearSignupDraft(localStorage)
    clearGuestTracker(localStorage)
    dispatch({ type: 'RESET' })
    navigate('/')
  }

  async function deleteSavedAccount() {
    if (!supabase || !hasSavedAccount) throw new Error('Account deletion is not available right now.')
    await deleteCurrentAccount()
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
    clearLegacyHealthStorage(localStorage)
    clearSignupDraft(localStorage)
    clearGuestTracker(localStorage)
    dispatch({ type: 'RESET' })
    navigate('/', { replace: true })
  }

  function downloadData() {
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      profile: {
        name: identity.name,
        email: identity.email,
        ageBand: identity.ageBand,
        birthMonth: identity.birthMonth,
        birthYear: identity.birthYear,
        preferences: profile,
      },
      answers: state.answers,
      dailyLogs: state.dailyLogs,
      periodLogs: state.periodLogs,
      reminderPreferences: state.notifyPrefs,
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `maisie-data-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
    flash('Your data download is ready')
  }

  return (
    <div className="screen screen--pad-bottom profile-screen">
      {toast && <div className="toast" role="status">{toast}</div>}

      <h1 className="profile-screen__title">Me</h1>

      <section className="profile-identity" aria-label="Your profile">
        <div className="profile-avatar" aria-hidden="true">
          {(identity.name || 'M').trim().charAt(0).toUpperCase()}
        </div>
        <div className="profile-identity__copy">
          <h2>{identity.name || 'Maisie user'}</h2>
          <p>{ageDisplay}</p>
        </div>
        <button className="profile-icon-button" type="button" aria-label="Edit profile" onClick={(event) => openSheet('profile', event)}>
          <PencilSimple size={20} weight="regular" aria-hidden="true" />
        </button>
      </section>

      <ProfileGroup label="My Maisie">
        <ProfileRow
          Icon={CloudArrowUp}
          tone="sage"
          title={hasSavedAccount ? 'Account saved' : 'Tracker on this device'}
          subtitle={hasSavedAccount ? 'Available across your devices.' : 'Add an email to use another device.'}
          value={hasSavedAccount ? 'Saved' : 'Device'}
          valueTone={hasSavedAccount ? 'success' : undefined}
          onClick={(event) => openSheet('account', event)}
        />
        <ProfileRow Icon={SlidersHorizontal} tone="sage" title="What I track" subtitle="Choose your check-in areas." value={`${trackingCount} on`} onClick={(event) => openSheet('tracking', event)} />
        <ProfileRow Icon={IdentificationCard} title="My health background" subtitle="Review what personalizes Maisie." value={backgroundProgress.complete ? 'Review' : `${Math.round(backgroundProgress.ratio * 100)}%`} onClick={() => navigate('/me/health-background', { state: { from: 'me' } })} />
        <ProfileRow Icon={Lightbulb} title="Tips and preferences" subtitle="Personalize the guidance you see." onClick={(event) => openSheet('tips', event)} />
        <ProfileRow Icon={Bell} title="Check-in reminders" subtitle="Set your reminder preference." value={notifyPrefs.periodCheckin ? 'On' : 'Off'} onClick={(event) => openSheet('reminders', event)} />
        <ProfileRow Icon={Cake} tone="sage" title="Birthday" subtitle="Keep age guidance current." value={birthLabel} onClick={(event) => openSheet('birthday', event)} />
      </ProfileGroup>

      <ProfileGroup label="Support and privacy">
        <ProfileRow Icon={UsersThree} tone="sage" title="People I trust" subtitle="Manage who can see support signals." value="Manage" onClick={(event) => openSheet('support', event)} />
        <ProfileRow Icon={Database} title="My information" subtitle="Review storage and device controls." onClick={(event) => openSheet('data', event)} />
        <ProfileRow Icon={Info} title="About Maisie" subtitle="Privacy, sources, terms, and support." onClick={(event) => openSheet('about', event)} />
      </ProfileGroup>

      <aside className="profile-privacy-note">
        <span aria-hidden="true"><ShieldCheck size={19} weight="duotone" /></span>
        <p><strong>Your daily answers stay private.</strong> Supporters only see the access level you choose.</p>
      </aside>

      {activeSheet && createPortal(
        <ProfileSheet title={sheetTitle(activeSheet)} onClose={closeSheet} closing={sheetClosing} wide={activeSheet === 'support'}>
          {activeSheet === 'profile' && (
            <EditProfilePanel name={identity.name} onSave={(name) => {
              dispatch({ type: 'SET_IDENTITY', payload: { name } })
              flash('Profile saved')
              closeSheet()
            }} />
          )}
          {activeSheet === 'account' && (
            <AccountPanel
              email={identity.email}
              hasSavedAccount={hasSavedAccount}
              onAddEmail={() => navigate('/auth?next=/me&source=post-onboarding')}
              onOpenData={() => setActiveSheet('data')}
            />
          )}
          {activeSheet === 'tracking' && (
            <TrackingPanel profile={profile} dailyLogs={state.dailyLogs} modules={trackingModules} hideFoodContent={profile.hideFoodContent === true} onSave={(modules, hideFoodContent, context, restoreFoodContent) => {
              updateProfile({ ...profilePayloadForTrackingModules(modules, { hideFoodContent, restoreFoodContent }), ...context }, 'Tracking preferences saved')
              closeSheet()
            }} />
          )}
          {activeSheet === 'tips' && <TipsPanel profile={profile} notifyPrefs={notifyPrefs} updateProfile={updateProfile} dispatch={dispatch} />}
          {activeSheet === 'reminders' && (
            <RemindersPanel enabled={notifyPrefs.periodCheckin} reminderTime={notifyPrefs.reminderTime || '20:30'} onChange={(payload) => {
              dispatch({ type: 'SET_NOTIFY', payload })
              flash('Reminder preference saved')
            }} />
          )}
          {activeSheet === 'birthday' && <BirthdayPanel birthMonth={birthMonth} birthYear={birthYear} birthError={birthError} onChange={updateBirthMonthYear} />}
          {activeSheet === 'support' && <SupportAccess compact />}
          {activeSheet === 'data' && <DataPanel hasSavedAccount={hasSavedAccount} onDownload={downloadData} onClear={clearDeviceData} onDelete={deleteSavedAccount} />}
          {activeSheet === 'about' && <AboutPanel />}
        </ProfileSheet>,
        document.body,
      )}
    </div>
  )
}

function sheetTitle(sheet) {
  return {
    profile: 'Edit profile', account: 'Account', tracking: 'What I track',
    tips: 'Tips and preferences', reminders: 'Check-in reminders', birthday: 'Birthday',
    support: 'People I trust', data: 'My information', about: 'About Maisie',
  }[sheet]
}

function ProfileGroup({ label, children }) {
  return <section className="profile-group"><p className="profile-group__label">{label}</p><div className="profile-list">{children}</div></section>
}

function ProfileRow({ Icon, tone, title, subtitle, value, valueTone, onClick }) {
  return (
    <button className="profile-row" type="button" onClick={onClick}>
      <span className={`profile-row__icon ${tone === 'sage' ? 'profile-row__icon--sage' : ''}`} aria-hidden="true"><Icon size={21} weight="regular" /></span>
      <span className="profile-row__copy"><strong>{title}</strong><span>{subtitle}</span></span>
      {value && <span className={`profile-row__value ${valueTone === 'success' ? 'profile-row__value--success' : ''}`}>{value}</span>}
      <CaretRight className="profile-row__caret" size={17} weight="bold" aria-hidden="true" />
    </button>
  )
}

function ProfileSheet({ title, onClose, children, wide = false, closing = false }) {
  const closeRef = useRef(null)
  useEffect(() => {
    closeRef.current?.focus()
    function onKeyDown(event) { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className={`profile-sheet-backdrop ${closing ? 'profile-sheet-backdrop--closing' : ''}`} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`profile-sheet ${wide ? 'profile-sheet--wide' : ''} ${closing ? 'profile-sheet--closing' : ''}`} role="dialog" aria-modal="true" aria-labelledby="profile-sheet-title">
        <div className="profile-sheet__grabber" aria-hidden="true" />
        <header className="profile-sheet__header">
          <h2 id="profile-sheet-title">{title}</h2>
          <button ref={closeRef} className="profile-sheet__close" type="button" aria-label="Close" onClick={onClose}><X size={20} weight="bold" aria-hidden="true" /></button>
        </header>
        <div className="profile-sheet__body">{children}</div>
      </section>
    </div>
  )
}

function EditProfilePanel({ name, onSave }) {
  const [draft, setDraft] = useState(name || '')
  return (
    <form className="profile-panel" onSubmit={(event) => { event.preventDefault(); onSave(draft.trim()) }}>
      <p className="profile-panel__intro">Choose the name you want Maisie to use.</p>
      <label className="profile-field" htmlFor="profile-name"><span>Name</span><input id="profile-name" className="input" value={draft} maxLength={60} autoComplete="name" onChange={(event) => setDraft(event.target.value)} /></label>
      <Button block disabled={!draft.trim()}>Save changes</Button>
    </form>
  )
}

function AccountPanel({ email, hasSavedAccount, onAddEmail, onOpenData }) {
  return (
    <div className="profile-panel">
      <div className={`profile-account-summary ${hasSavedAccount ? 'profile-account-summary--saved' : ''}`}>
        {hasSavedAccount ? <CheckCircle size={24} weight="fill" aria-hidden="true" /> : <CloudArrowUp size={24} weight="duotone" aria-hidden="true" />}
        <div><strong>{hasSavedAccount ? 'Saved to your account' : 'Saved on this device'}</strong><span>{hasSavedAccount ? email || 'Signed in' : 'Add an email to use Maisie on another device.'}</span></div>
      </div>
      {!hasSavedAccount && <Button block onClick={onAddEmail}>Add email</Button>}
      <Button variant="ghost" block onClick={onOpenData}>My information and device controls</Button>
    </div>
  )
}

function TrackingPanel({ profile, dailyLogs, modules, hideFoodContent, onSave }) {
  const [draft, setDraft] = useState(modules)
  const [hideFood, setHideFood] = useState(hideFoodContent)
  const [restoreFoodContent, setRestoreFoodContent] = useState(false)
  const [dietPreferences, setDietPreferences] = useState(profile.dietPreferences || [])
  const [periodProducts, setPeriodProducts] = useState(profile.periodProducts || [])
  const availableModules = visibleTrackingModules()
  const foodSensitive = foodSensitiveModeIsActive(profile, dailyLogs)
  function toggleContext(value, current, setCurrent) {
    const exclusive = new Set(['No preference', 'Prefer not to say'])
    if (current.includes(value)) return setCurrent(current.filter((item) => item !== value))
    if (exclusive.has(value)) return setCurrent([value])
    setCurrent([...current.filter((item) => !exclusive.has(item)), value])
  }
  function toggleModule(moduleId, on) {
    setDraft((current) => ({ ...current, [moduleId]: on }))
    if (moduleId !== 'food') return
    if (on) {
      setHideFood(false)
      setRestoreFoodContent(true)
    } else {
      setRestoreFoodContent(false)
    }
  }
  return (
    <div className="profile-panel">
      <p className="profile-panel__intro">Choose what appears in check-ins and personalized learning. Existing entries are not removed.</p>
      <div className="profile-toggle-list">
        {availableModules.map((module) => module.locked
          ? <Toggle key={module.id} label={module.label} desc={module.description} on disabled />
          : <Toggle key={module.id} label={module.label} desc={module.description} on={draft[module.id]} onChange={(on) => toggleModule(module.id, on)} />)}
      </div>
      {draft.food && !hideFood && !foodSensitive && (
        <div className="profile-panel__section">
          <h3>Diet preferences</h3>
          <div className="chips">{DIET_PREFERENCES.map((option) => <Chip key={option} selected={dietPreferences.includes(option)} onClick={() => toggleContext(option, dietPreferences, setDietPreferences)}>{option}</Chip>)}</div>
        </div>
      )}
      {draft.bleedingDetail && (
        <div className="profile-panel__section">
          <h3>Period products</h3>
          <div className="chips">{PERIOD_PRODUCTS.map((option) => <Chip key={option} selected={periodProducts.includes(option)} onClick={() => toggleContext(option, periodProducts, setPeriodProducts)}>{option}</Chip>)}</div>
        </div>
      )}
      {foodSensitive && <FoodSupportCard compact />}
      <Button block onClick={() => onSave(draft, hideFood, { dietPreferences, periodProducts }, restoreFoodContent)}>Save changes</Button>
    </div>
  )
}

function TipsPanel({ profile, notifyPrefs, updateProfile, dispatch }) {
  return (
    <div className="profile-panel">
      <p className="profile-panel__intro">These choices help Maisie keep guidance relevant without making assumptions.</p>
      <div className="profile-panel__section"><h3>School and activity</h3><ChipGroup options={SA_OPTIONS} value={profile.studentAthlete} onChange={(studentAthlete) => updateProfile({ studentAthlete })} columns={2} /></div>
      <div className="profile-panel__section"><h3>Sleep habits</h3><ChipGroup options={SLEEP_OPTIONS} value={profile.sleep} onChange={(sleep) => updateProfile({ sleep })} stack /></div>
      <div className="profile-toggle-list">
        <Toggle label="Phase-based tips" desc="Use your cycle timing when choosing tips." on={notifyPrefs.phaseTips} onChange={(phaseTips) => dispatch({ type: 'SET_NOTIFY', payload: { phaseTips } })} />
      </div>
    </div>
  )
}

function RemindersPanel({ enabled, reminderTime, onChange }) {
  return (
    <div className="profile-panel">
      <p className="profile-panel__intro">Choose whether Maisie should use your learned period window for reminder preferences.</p>
      <div className="profile-toggle-list"><Toggle label="Period check-ins" desc="Keep this preference ready for private device reminders." on={enabled} onChange={(periodCheckin) => onChange({ periodCheckin })} /></div>
      {enabled && <label className="profile-field" htmlFor="reminder-time"><span>Reminder time</span><input id="reminder-time" className="input" type="time" value={reminderTime} onChange={(event) => onChange({ reminderTime: event.target.value })} /></label>}
      <p className="profile-panel__note">Native iPhone notifications are not enabled yet. Maisie will ask permission before sending any.</p>
    </div>
  )
}

function BirthdayPanel({ birthMonth, birthYear, birthError, onChange }) {
  return (
    <div className="profile-panel">
      <p className="profile-panel__intro">Maisie uses month and year to keep age guidance current. An exact day is not needed.</p>
      <BirthMonthYearFields idPrefix="profile-birth" birthMonth={birthMonth} birthYear={birthYear} onChange={onChange} />
      {birthError && <p className="profile-panel__error" role="alert">{birthError}</p>}
    </div>
  )
}

function DataPanel({ hasSavedAccount, onDownload, onClear, onDelete }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function deleteAccount() {
    if (deleting) return
    setDeleting(true)
    setDeleteError('')
    try {
      await onDelete()
    } catch (error) {
      if (import.meta.env.DEV) console.error('Account deletion failed', error)
      setDeleteError('Your account could not be deleted. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <div className="profile-panel">
      <p className="profile-panel__intro">{hasSavedAccount ? 'Your account information stays available after you clear this device.' : 'Your tracker is stored only on this device. Clearing it cannot be undone.'}</p>
      <div className="profile-data-note"><ShieldCheck size={22} weight="duotone" aria-hidden="true" /><p>Daily answers and pain ratings are not included in supporter access.</p></div>
      <Button variant="secondary" block onClick={onDownload}><DownloadSimple size={19} weight="bold" aria-hidden="true" /> Download my data</Button>
      <Button variant="ghost" block className="profile-destructive-action" onClick={onClear}>{hasSavedAccount ? 'Sign out and clear this device' : 'Clear this device'}</Button>
      {hasSavedAccount && <p className="profile-panel__note">This signs you out and clears this device. It does not delete your account.</p>}
      {hasSavedAccount && !confirmingDelete && (
        <Button variant="ghost" block className="profile-destructive-action" onClick={() => setConfirmingDelete(true)}>
          <Trash size={19} weight="bold" aria-hidden="true" /> Delete my account
        </Button>
      )}
      {hasSavedAccount && confirmingDelete && (
        <section className="profile-delete-confirm" aria-labelledby="delete-account-title">
          <div>
            <h3 id="delete-account-title">Delete account permanently?</h3>
            <p>This removes your account and saved Maisie information. It cannot be undone.</p>
          </div>
          {deleteError && <p className="profile-panel__error" role="alert">{deleteError}</p>}
          <div className="profile-delete-confirm__actions">
            <Button variant="ghost" disabled={deleting} onClick={() => { setConfirmingDelete(false); setDeleteError('') }}>Cancel</Button>
            <Button className="profile-delete-confirm__button" disabled={deleting} onClick={deleteAccount}>
              {deleting ? 'Deleting...' : 'Delete permanently'}
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}

function AboutPanel() {
  return (
    <div className="profile-panel">
      <div className="profile-about-mark" aria-hidden="true">M</div>
      <h3 className="profile-about-title">Maisie Health</h3>
      <p className="profile-panel__intro">Maisie helps teens understand what they are experiencing, prepare for care, and navigate what comes next.</p>
      <div className="profile-about-list">
        <div><strong>Not a diagnosis</strong><span>Maisie uses only what you log and does not diagnose medical conditions.</span></div>
        <div><strong>Sources</strong><span>Educational articles include their sources where available.</span></div>
        <div><strong>Version</strong><span>1.0.0</span></div>
      </div>
    </div>
  )
}

function Toggle({ label, desc, on, onChange, disabled = false }) {
  return (
    <div className="profile-toggle-row">
      <div><strong>{label}</strong>{desc && <span>{desc}</span>}</div>
      <button className="profile-switch" type="button" role="switch" aria-checked={Boolean(on)} aria-label={label} disabled={disabled} onClick={() => onChange?.(!on)}><span /></button>
    </div>
  )
}
