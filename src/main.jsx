import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { StoreProvider } from './state/store.jsx'
import App from './App.jsx'
import { implicitAuthCallbackUrl } from './lib/authRedirect.js'
import './styles/global.css'

// Supabase may fall back to the configured Site URL when a requested redirect
// is not allow-listed. Normalize that valid implicit-flow response before the
// router renders so the callback can establish the session and clear the hash.
const implicitCallbackUrl = implicitAuthCallbackUrl(window.location)
if (implicitCallbackUrl) window.history.replaceState(null, '', implicitCallbackUrl)

// Hash-based routing for single-file/static hosts that can't rewrite URLs
// (build with VITE_ROUTER=hash). Normal deploys keep clean BrowserRouter URLs.
const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <StoreProvider>
        <App />
      </StoreProvider>
    </Router>
  </React.StrictMode>,
)
