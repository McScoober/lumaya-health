import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useStore } from './state/store.jsx'
import TabBar from './components/TabBar.jsx'

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

const APP_TABS = ['/home', '/messages', '/dashboard', '/settings']

function RequireOnboarded({ children }) {
  const { state } = useStore()
  if (!state.onboarded) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { pathname } = useLocation()
  const showTabs = APP_TABS.some((t) => pathname.startsWith(t))

  return (
    <div className="app-frame">
      <div className="phone">
        <Routes>
          {/* Onboarding flow */}
          <Route path="/" element={<Welcome />} />
          <Route path="/age" element={<AgeConsent />} />
          <Route path="/personalize" element={<Personalization />} />
          <Route path="/checkin" element={<CheckIn />} />
          <Route path="/result" element={<Result />} />

          {/* Ongoing app */}
          <Route path="/home" element={<RequireOnboarded><Home /></RequireOnboarded>} />
          <Route path="/daily" element={<RequireOnboarded><DailyCheckIn /></RequireOnboarded>} />
          <Route path="/tip/:phase" element={<RequireOnboarded><PhaseTip /></RequireOnboarded>} />
          <Route path="/advisor" element={<RequireOnboarded><Advisor /></RequireOnboarded>} />
          <Route path="/dashboard" element={<RequireOnboarded><Dashboard /></RequireOnboarded>} />
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
