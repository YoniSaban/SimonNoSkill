import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/** Must match the repository name exactly (case-sensitive) – see CLAUDE.md. */
const BASE = '/SimonNoSkill/'
const THEME = '#0A1628'

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      // ADR-6: a new version installs in the background and waits; it never
      // reloads the page or interrupts a game. Registered manually in main.tsx.
      registerType: 'prompt',
      injectRegister: false,
      strategies: 'generateSW',
      // Manifest icons and the manifest itself are precached by the plugin; these are the rest.
      includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        // ADR-9: an explicit id, so an old install record keyed by start_url is ignored.
        id: `${BASE}app`,
        name: 'Simon',
        short_name: 'Simon',
        description: 'משחק הזיכרון סיימון',
        lang: 'he',
        dir: 'rtl',
        display: 'standalone',
        orientation: 'portrait',
        start_url: BASE,
        scope: BASE,
        background_color: THEME,
        theme_color: THEME,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything the two screens need offline, fonts included. Sounds are
        // synthesised with Web Audio, so there are no audio files.
        globPatterns: ['**/*.{js,css,html,woff2}'],
        navigateFallback: `${BASE}index.html`,
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: false,
      },
    }),
  ],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
