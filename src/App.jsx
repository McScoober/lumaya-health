import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useStore } from './state/store.jsx'
import TabBar from './components/TabBar.jsx'
import KeyboardViewport from './components/KeyboardViewport.jsx'
import MaisieLogo from './components/MaisieLogo.jsx'
import { ArrowClockwise, CloudSlash } from '@phosphor-icons/react'

import Auth from './screens/Auth.jsx'
import AuthCallback from './screens/AuthCallback.jsx'
import Welcome from './screens/Welcome.jsx'
import AgeConsent from './screens/AgeConsent.jsx'
import Personalization from './screens/Personalization.jsx'
import TrackingSetup from './screens/TrackingSetup.jsx'
import CheckIn from './screens/CheckIn.jsx'
import Result from './screens/Result.jsx'
import Home from './screens/Home.jsx'
import DailyCheckIn from './screens/DailyCheckIn.jsx'
import PhaseTip from './screens/PhaseTip.jsx'
import Advisor from './screens/Advisor.jsx'
import Dashboard from './screens/Dashboard.jsx'
import ParentView from './screens/ParentView.jsx'
import Settings from './screens/Settings.jsx'
import Messages from './screens/Messages.jsx'
import { features } from './config/features.js'
import {
  RouteCare,
  RouteDismissed,
  RouteExport,
  RouteHome,
  RouteSummary,
  RouteTalk,
} from './screens/Route.jsx'

const APP_TABS = ['/home', '/patterns', '/route', '/learn', '/me']

function AppStatus({ message, error = false }) {
  return (
    <div className="screen" role={error ? 'alert' : 'status'} style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 14 }}>
      <MaisieLogo size={64} style={{ opacity: 0.64 }} />
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontWeight: 600 }}>{message}</p>
      {error && <button className="btn btn--soft" onClick={() => window.location.reload()}>Try again</button>}
    </div>
  )
}

function RequireOnboarded({ children }) {
  const { state, authLoading, accountError } = useStore()
  if (authLoading) return <AppStatus message="Loading your saved information..." />
  if (accountError && !state.accountId) return <AppStatus message={accountError} error />
  if (!state.onboarded) return <Navigate to={state.accountId ? '/age' : '/'} replace />
  return children
}

function SyncNotice({ status, onRetry, aboveTabs }) {
  if (!['offline', 'error', 'blocked'].includes(status.state)) return null
  const offline = status.state === 'offline'
  const blocked = status.state === 'blocked'

  return (
    <div
      className={`sync-notice${aboveTabs ? ' sync-notice--above-tabs' : ''}`}
      role="status"
      aria-live="polite"
    >
      <CloudSlash size={20} weight="duotone" aria-hidden="true" />
      <span className="sync-notice__message">
        {offline
          ? "You're offline. Changes will sync when you're connected."
          : blocked
            ? "This change couldn't be saved. Try again or contact support if it continues."
            : "Changes haven't synced yet. We'll keep trying."}
      </span>
      <button type="button" className="sync-notice__retry" onClick={onRetry}>
        <ArrowClockwise size={16} weight="bold" aria-hidden="true" />
        Try again
      </button>
    </div>
  )
}

import DailyLog from './screens/DailyLog.jsx'
import Patterns from './screens/Patterns.jsx'

import { LearnArticle, LearnCategory, LearnHome, LegacyLearnRedirect } from './screens/Learn.jsx'
import Profile from './screens/Profile.jsx'
import HealthBackground from './screens/HealthBackground.jsx'

export default function App() {
  const { pathname } = useLocation()
  const { syncStatus, retryAccountSync } = useStore()
  
  // UX RULE: Nav hidden during the log screen.
  const isLogScreen = pathname === '/log'
  const isFocusedFlow = pathname === '/me/health-background'
  const showTabs = APP_TABS.some((t) => pathname.startsWith(t)) && !isLogScreen && !isFocusedFlow

  return (
    <div className="app-frame">
      <KeyboardViewport />
      <div className="phone">
        <Routes>
          {/* Onboarding & Auth flow */}
          <Route path="/" element={<Welcome />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/age" element={<AgeConsent />} />
          <Route path="/personalize" element={<Personalization />} />
          <Route path="/personalize/tracking" element={<TrackingSetup />} />
          <Route path="/checkin" element={<CheckIn />} />
          <Route path="/result" element={<Result />} />

          {/* New Maisie App Routes */}
          <Route path="/home" element={<RequireOnboarded><Home /></RequireOnboarded>} />
          <Route path="/signals" element={<Navigate to="/patterns?tab=signals" replace />} />
          <Route path="/patterns" element={<RequireOnboarded><Patterns /></RequireOnboarded>} />
          <Route path="/learn" element={<RequireOnboarded><LearnHome /></RequireOnboarded>} />
          <Route path="/learn/c/:category" element={<RequireOnboarded><LearnCategory /></RequireOnboarded>} />
          <Route path="/learn/:slug" element={<RequireOnboarded><LearnArticle /></RequireOnboarded>} />
          <Route path="/library" element={<Navigate to="/learn" replace />} />
          <Route path="/library/:slug" element={<RequireOnboarded><LegacyLearnRedirect /></RequireOnboarded>} />
          <Route path="/me" element={<RequireOnboarded><Profile /></RequireOnboarded>} />
          <Route path="/me/health-background" element={<RequireOnboarded><HealthBackground /></RequireOnboarded>} />
          <Route path="/profile" element={<Navigate to="/me" replace />} />
          <Route path="/route" element={<RequireOnboarded><RouteHome /></RequireOnboarded>} />
          <Route path="/route/summary" element={<RequireOnboarded><RouteSummary /></RequireOnboarded>} />
          <Route path="/route/summary/export" element={<RequireOnboarded><RouteExport /></RequireOnboarded>} />
          <Route path="/route/summary/print" element={<RequireOnboarded><RouteExport /></RequireOnboarded>} />
          <Route path="/route/talk" element={<RequireOnboarded><RouteTalk /></RequireOnboarded>} />
          <Route path="/route/talk/dismissed" element={<RequireOnboarded><RouteDismissed /></RequireOnboarded>} />
          <Route path="/route/care" element={<RequireOnboarded><RouteCare /></RequireOnboarded>} />
          <Route path="/route/care/urgent" element={<RequireOnboarded><RouteCare urgent /></RequireOnboarded>} />
          <Route path="/support" element={<Navigate to="/me" replace />} />
          <Route path="/dashboard" element={<Navigate to="/me" replace />} />
          
          {/* Ongoing app - existing but might need refactoring */}
          <Route path="/log" element={<RequireOnboarded><DailyLog /></RequireOnboarded>} />
          <Route path="/daily" element={<Navigate to="/log" replace />} />
          <Route path="/tip/:phase" element={<RequireOnboarded><PhaseTip /></RequireOnboarded>} />
          <Route path="/advisor" element={features.routeSummary ? <Navigate to="/route/talk" replace /> : <RequireOnboarded><Advisor /></RequireOnboarded>} />
          <Route path="/messages" element={<RequireOnboarded><Messages /></RequireOnboarded>} />
          <Route path="/settings" element={<Navigate to="/me" replace />} />

          {/* Standalone parent/support dashboard view (shared link) */}
          <Route path="/parent" element={<ParentView />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <SyncNotice status={syncStatus} onRetry={retryAccountSync} aboveTabs={showTabs} />
        {showTabs && <TabBar />}
      </div>
    </div>
  )
}
