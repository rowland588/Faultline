import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { startSync } from './cloud/sync';
import './styles.css';

// Boot the cloud sync loop. No-ops unless Supabase is configured AND a session
// is restored — the app is fully usable offline with neither.
startSync();

// Keep an installed (kept-open) app from getting stuck on a stale build: poll
// for a new service worker on focus and every minute, and reload once when a new
// version actually takes control. The `hadController` guard avoids reloading on
// the very first install (only on genuine updates).
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || refreshing) return;
    refreshing = true;
    window.location.reload();
  });
  navigator.serviceWorker.ready.then(reg => {
    const check = () => { void reg.update().catch(() => {}); };
    setInterval(check, 60_000);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  }).catch(() => { /* no SW (e.g. dev) — fine */ });
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
