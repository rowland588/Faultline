import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Faultline — local-first PWA. The service worker precaches the app shell so it
// launches with no network (data already lives in IndexedDB); autoUpdate keeps
// installed floor tablets current. The manifest makes it installable.
/* Stamped into the bundle at build time and shown on Home. A deployed PWA can
 * serve a cached shell long after a new build ships, and "is the fix actually
 * live?" is otherwise unanswerable from the outside — this makes it one glance.
 * FAULTLINE_BUILD_STAMP overrides it (deterministic builds / update tests). */
const BUILD_STAMP = process.env.FAULTLINE_BUILD_STAMP
  || new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

export default defineConfig({
  define: { __BUILD_STAMP__: JSON.stringify(BUILD_STAMP) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['mark.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Faultline — find the problems, make them visible',
        short_name: 'Faultline',
        description: 'Walk the line, log losses and pin faults on a video-walk still, and turn what you find into a Pareto, a cost, and a tracked snag list. Offline-first, synced across your devices.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f4f9fc',
        theme_color: '#e9f3fa',
        icons: [
          // PNG for reliable install on iOS (SVG icons are ignored there) and Android.
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'mark.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        // the guide's screenshots and the social share card are first-visit
        // assets, not floor tools — don't make every install download them
        globIgnores: ['**/guide/**', '**/og.png', '**/demo/**'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
