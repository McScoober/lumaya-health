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

const APP_TABS = ['/home', '/signals', '/patterns', '/support', '/library']

function RequireOnboarded({ children }) {
  const { state } = useStore()
  if (!state.onboarded) return <Navigate to="/" replace />
  return children
}

import DailyLog from './screens/DailyLog.jsx'
import Signals from './screens/Signals.jsx'
import Patterns from './screens/Patterns.jsx'

// Stubs for the new screens
const Library = () => <div className="screen center"><p>Educational Library Placeholder</p></div>

export default function App() {
  const { pathname } = useLocation()
  
  // UX RULE: Nav hidden during all log screens.
  const isLogScreen = pathname.startsWith('/log')
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
          <Route path="/signals" element={<RequireOnboarded><Signals /></RequireOnboarded>} />
          <Route path="/patterns" element={<RequireOnboarded><Patterns /></RequireOnboarded>} />
          <Route path="/support" element={<RequireOnboarded><Dashboard /></RequireOnboarded>} />
          <Route path="/library" element={<RequireOnboarded><Library /></RequireOnboarded>} />
          
          {/* Ongoing app - existing but might need refactoring */}
          <Route path="/log/:step" element={<RequireOnboarded><DailyLog /></RequireOnboarded>} />
          <Route path="/daily" element={<Navigate to="/log/0" replace />} />
          <Route path="/tip/:phase" element={<RequireOnboarded><PhaseTip /></RequireOnboarded>} />
          <Route path="/advisor" element={<RequireOnboarded><Advisor /></RequireOnboarded>} />
          <Route path="/messages" element={<RequireOnboarded><Messages /></RequireOnboarded>} />
          <Route path="/settings" element={<RequireOnboarded><Settings /></RequireOnboarded>} />

          {/* Standalone parent/support dashboard view (shared link) */}
          <Route path="/parent" element={<ParentView />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {showTabs && <TabBar />}
      </div>
    </div>
  )
}
