import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { startSync } from './cloud/sync';
import './styles.css';

// Boot the cloud sync loop. No-ops unless Supabase is configured AND a session
// is restored — the app is fully usable offline with neither.
startSync();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
