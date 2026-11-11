import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { startTrail } from './state/navHistory';
import { startSync } from './cloud/sync';
/* The type is bundled, not fetched: this app has to look like itself on a
   factory floor with no signal. Variable weight axis only — one file a family. */
/* LUNA (11 November): Geist — the face of the app; Instrument Serif — the few moments Luna speaks to you (a greeting, a page's name).
   Inter stays loaded for the papers' fallback and any page that names it. */
import '@fontsource-variable/geist/wght.css';
import '@fontsource/instrument-serif/400.css';
import '@fontsource-variable/inter/wght.css';
/* Outfit — the face of the NAME: the landing's wordmark, the install icon's, Home's and every PDF's. */
import '@fontsource-variable/outfit/wght.css';
import './styles.css';

/* LUNA — SPECTRUM (11 November): AI Mode wears Luna's own theme (styles.css, html[data-luna]); the rest of the app is as it was until
   the identity is agreed. Set from the address, so it follows every way into and out of #/ai (Luna's runtime persists across pages). */
/* Spectrum everywhere since 11 November (docs/LUNA-LOOK.md) — the landing page, signed out, keeps its own look */
const lunaTheme = () => { document.documentElement.dataset.luna = 'on'; };
window.addEventListener('hashchange', lunaTheme);
lunaTheme();

// Boot the cloud sync loop. No-ops unless Supabase is configured AND a session
// is restored — the app is fully usable offline with neither.
startSync();

// One record of a machine on its line (lib/machineMerge) — settled on this
// device when it starts, whether or not it syncs.
/* the way back (state/navHistory): the pages visited this session, for the top bar's Back */
startTrail();
void import('./db/machineMerge').then(m => m.oneRecordPerMachine()).catch(() => { /* tried again on the next start */ });

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

/* A NEW BUILD TAKES OVER WHILE AN OLD PAGE IS OPEN. The new service worker
   drops the old hashed chunks, and Vercel no longer serves them, so the old
   page's next "Download PDF" asked for a chunk that no longer exists and
   printed an error with no way out. Vite fires this exactly then; a reload
   lands on the new build and the button works on the next press. */
window.addEventListener('vite:preloadError', e => { e.preventDefault(); location.reload(); });

/* Ask the browser not to evict this origin's storage under pressure. The only
   copy of a walk filmed with no signal is in IndexedDB until it uploads. A
   request, not a promise — the answer is not shown anywhere. */
void navigator.storage?.persist?.().catch(() => {});

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
