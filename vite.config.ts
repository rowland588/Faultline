import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Finder — local-first PWA. The service worker precaches the app shell so it
// launches with no network (data already lives in IndexedDB); autoUpdate keeps
// installed floor tablets current. The manifest makes it installable.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['mark.svg', 'icon-maskable.svg'],
      manifest: {
        name: 'Finder — line loss, seen & costed',
        short_name: 'Finder',
        description: 'Walk the line, log every stop and put a time to it, and watch the loss turn into a Pareto and a pound figure.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#14181f',
        theme_color: '#14181f',
        icons: [
          { src: 'mark.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: 'icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
