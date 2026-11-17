import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { updateNow } from '../lib/appUpdate';

/** An update never reloads a person's current task without their press. */
export function UpdateBanner() {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let previous = navigator.serviceWorker.controller;
    let reg: ServiceWorkerRegistration | undefined;
    let worker: ServiceWorker | null = null;
    let disposed = false;
    const controllerChanged = () => {
      const next = navigator.serviceWorker.controller;
      if (previous && next && previous !== next) setReady(true);
      previous = next;
    };
    const stateChanged = () => { if (worker?.state === 'installed' && navigator.serviceWorker.controller) setReady(true); };
    const found = () => {
      worker?.removeEventListener('statechange', stateChanged);
      worker = reg?.installing ?? null; worker?.addEventListener('statechange', stateChanged);
    };
    navigator.serviceWorker.addEventListener('controllerchange', controllerChanged);
    void navigator.serviceWorker.getRegistration().then(r => {
      if (disposed || !r) return;
      reg = r;
      if (r.waiting && navigator.serviceWorker.controller) setReady(true);
      r.addEventListener('updatefound', found); found();
    }).catch(() => { /* browser without a registered app */ });
    return () => { disposed = true; navigator.serviceWorker.removeEventListener('controllerchange', controllerChanged); reg?.removeEventListener('updatefound', found); worker?.removeEventListener('statechange', stateChanged); };
  }, []);
  if (!ready) return null;
  const install = async () => {
    setBusy(true); setMessage('');
    try { await updateNow(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Please try updating again.'); }
    finally { setBusy(false); }
  };
  return <div className="upd" role="status">
    <span className="upd-txt">{message || 'A new version of Faultline is ready.'}</span>
    <button className="upd-btn" disabled={busy} onClick={() => void install()}>{busy ? 'Updating…' : 'Update now'}</button>
    <button className="upd-x" onClick={() => setReady(false)} aria-label="Dismiss"><Icon name="close" size="0.85em" /></button>
  </div>;
}
