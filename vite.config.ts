import { configDefaults, defineConfig } from 'vitest/config';
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
  /* tests run on this checkout only — never on the copies agents leave under .claude/worktrees (ignored by git, absent in CI), which read these files with their own, older rules */
  test: { exclude: [...configDefaults.exclude, '.claude/**'] },
  /* the dev server's first look for the libraries to pre-bundle starts at the
     app's one page, never at every .html below the checkout — a checkout that
     holds other copies of the app (.claude/worktrees) had it crawl all of them
     and never finish, so a fresh cache served nothing (19 October) */
  optimizeDeps: { entries: ['index.html'], include: ['pptxgenjs', 'pdfjs-dist', 'mammoth'] },   /* the deck's library and the brief's readers pre-bundled, so the first Slides or upload never reloads the page (docs/STORY.md S4, S6) */
  build: {
    rollupOptions: {
      output: {
        /* React and Supabase in chunks of their own, so a one-line change to
           the app no longer re-downloads a quarter of a megabyte of libraries
           on every deploy — autoUpdate fetches only what changed. */
        manualChunks: {
          react: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['mark.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'],
      manifest: {
        name: 'LUNA — Your intelligent colleague for manufacturing',
        short_name: 'Luna',
        description: 'The operational improvement system for production lines, by Opex Elevate: identify opportunities, diagnose problems, apply a method, organise the delivery and verify the result. Works offline on the floor.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        /* No `orientation`: it locked the installed Android app to portrait,
           and floor tablets are held landscape for the lever tree. */
        background_color: '#f4f6f9',
        theme_color: '#0b1a33',
        icons: [
          // PNG for reliable install on iOS (SVG icons are ignored there) and Android.
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // Maskable is its OWN drawing, not the same file relabelled. Android
          // crops a maskable icon to a circle 80% of its width; pointing this at
          // the full-bleed icon was slicing the flat ends off the trace on every
          // Android home screen. icon-maskable-512 holds the mark inside the crop.
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'mark.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        // the entry chunk passed 2 MiB with the calculators and the reliability family (25 Oct); it is precached whole so the app opens offline — splitting the tools' papers out is the real fix (docs/OPEN.md)
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,woff2,ttf}'],   // ttf: the PDFs' typeface, so a report prints in it offline too
        // the guide's screenshots and the social share card are first-visit
        // assets, not floor tools — don't make every install download them
        globIgnores: ['**/guide/**', '**/og.png', '**/demo/**'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        // the push handler: a reminder that arrives while the app is closed
        importScripts: ['push-sw.js'],
      },
    }),
  ],
});
