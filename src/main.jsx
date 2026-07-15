import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { StoreProvider } from './state/store.jsx'
import App from './App.jsx'
import './styles/global.css'

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
