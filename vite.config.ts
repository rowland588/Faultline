import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Finder — local-first PWA. Kept deliberately minimal; offline/service-worker
// and any deploy config get added when we need them, not before.
export default defineConfig({
  plugins: [react()],
});
