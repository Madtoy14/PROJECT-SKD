import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'og-image.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        // Cache-first strategy for static assets, network-first for API calls
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Hanya cache font static — jangan cache API Supabase (auth, data users)
            urlPattern: ({ url }) => url.hostname.includes('supabase'),
            handler: 'NetworkOnly',
          },
        ],
      },
      manifest: {
        name: 'SKDQuest - Latihan Soal CPNS SKD',
        short_name: 'SKDQuest',
        description: 'Platform latihan soal SKD CPNS terlengkap. TWK, TIU, TKP, Try Out BKN, mode survival, dan PvP. Gratis, tanpa iklan.',
        theme_color: '#F5A623',
        background_color: '#0F172A',
        display: 'standalone',
        orientation: 'portrait-primary',
        lang: 'id',
        start_url: '/',
        categories: ['education', 'games'],
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
        screenshots: [
          {
            src: '/og-image.png',
            sizes: '1200x630',
            type: 'image/png',
            form_factor: 'wide',
          },
        ],
      },
    }),
  ],
})