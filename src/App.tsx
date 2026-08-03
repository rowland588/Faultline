import { Component, type ReactNode } from 'react';
import { useBootResume } from './state/useResume';
import { Router } from './router';

/** A render error becomes a recoverable message, never a blank screen — a field
 *  app must not silently vanish. Local data is safe (it's in IndexedDB). */
class ErrorBoundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state: { err: Error | null } = { err: null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  render() {
    if (this.state.err) {
      return (
        <div className="wrap" style={{ paddingTop: 60, textAlign: 'center' }}>
          <div className="mark">Something broke</div>
          <p className="sub" style={{ marginTop: 8 }}>Your data is safe on this device. Reload to carry on.</p>
          <p className="sub" style={{ color: 'var(--danger)', marginTop: 8 }}>{this.state.err.message}</p>
          <div style={{ marginTop: 18, display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => location.reload()}>Reload</button>
            <button className="btn" onClick={() => { location.hash = '#/'; this.setState({ err: null }); }}>Home</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const ready = useBootResume(); // may replace the hash to resume the last workspace
  if (!ready) return null; // one tick; avoids a Home flash before a resume
  return (
    <ErrorBoundary>
      <Router />
    </ErrorBoundary>
  );
}
