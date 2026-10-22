import { Component } from 'react'
import MaisieLogo from './MaisieLogo.jsx'

export default class AppErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, details) {
    console.error('Unhandled app error', error, details)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="app-frame">
        <main className="phone app-error" role="alert">
          <MaisieLogo size={64} style={{ opacity: 0.72 }} />
          <div>
            <h1>We couldn't open this screen.</h1>
            <p className="muted">Reload the app to try again.</p>
          </div>
          <button className="btn btn--primary" type="button" onClick={() => window.location.reload()}>
            Reload app
          </button>
        </main>
      </div>
    )
  }
}
