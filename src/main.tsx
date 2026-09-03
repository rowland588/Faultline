import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { startSync } from './cloud/sync';
import './lib/populateProjectData'; // Make __populateProjectData available in browser console
import './styles.css';

// Boot the cloud sync loop. No-ops unless Supabase is configured AND a session
// is restored — the app is fully usable offline with neither.
startSync();

// Fetch a newer build in the BACKGROUND so the next time the app is opened it's
// current. We deliberately do NOT force a reload mid-session — that yanks you off
// whatever screen you're on. The update simply applies on the next fresh open.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(reg => {
    const check = () => { void reg.update().catch(() => {}); };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  }).catch(() => { /* no SW (e.g. dev) — fine */ });
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
