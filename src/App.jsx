import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useStore } from './state/store.jsx'
import TabBar from './components/TabBar.jsx'

import Auth from './screens/Auth.jsx'
import AuthCallback from './screens/AuthCallback.jsx'
import Welcome from './screens/Welcome.jsx'
import AgeConsent from './screens/AgeConsent.jsx'
import Personalization from './screens/Personalization.jsx'
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

const APP_TABS = ['/home', '/patterns', '/library', '/profile']

function RequireOnboarded({ children }) {
  const { state } = useStore()
  if (!state.onboarded) return <Navigate to="/" replace />
  return children
}

import DailyLog from './screens/DailyLog.jsx'
import Patterns from './screens/Patterns.jsx'

import Library from './screens/Library.jsx'
import Profile from './screens/Profile.jsx'

export default function App() {
  const { pathname } = useLocation()
  
  // UX RULE: Nav hidden during the log screen.
  const isLogScreen = pathname === '/log'
  const showTabs = APP_TABS.some((t) => pathname.startsWith(t)) && !isLogScreen

  return (
    <div className="app-frame">
      <div className="phone">
        <Routes>
          {/* Onboarding & Auth flow */}
          <Route path="/" element={<Welcome />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/age" element={<AgeConsent />} />
          <Route path="/personalize" element={<Personalization />} />
          <Route path="/checkin" element={<CheckIn />} />
          <Route path="/result" element={<Result />} />

          {/* New Maisie App Routes */}
          <Route path="/home" element={<RequireOnboarded><Home /></RequireOnboarded>} />
          <Route path="/signals" element={<Navigate to="/patterns?tab=signals" replace />} />
          <Route path="/patterns" element={<RequireOnboarded><Patterns /></RequireOnboarded>} />
          <Route path="/library" element={<RequireOnboarded><Library /></RequireOnboarded>} />
          <Route path="/profile" element={<RequireOnboarded><Profile /></RequireOnboarded>} />
          <Route path="/support" element={<Navigate to="/profile" replace />} />
          <Route path="/dashboard" element={<Navigate to="/profile" replace />} />
          
          {/* Ongoing app - existing but might need refactoring */}
          <Route path="/log" element={<RequireOnboarded><DailyLog /></RequireOnboarded>} />
          <Route path="/daily" element={<Navigate to="/log" replace />} />
          <Route path="/tip/:phase" element={<RequireOnboarded><PhaseTip /></RequireOnboarded>} />
          <Route path="/advisor" element={<RequireOnboarded><Advisor /></RequireOnboarded>} />
          <Route path="/messages" element={<RequireOnboarded><Messages /></RequireOnboarded>} />
          <Route path="/settings" element={<Navigate to="/profile" replace />} />

          {/* Standalone parent/support dashboard view (shared link) */}
          <Route path="/parent" element={<ParentView />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {showTabs && <TabBar />}
      </div>
    </div>
  )
}
