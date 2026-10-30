import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const BASE = '/bayerwald-gipfel/';
const DAY = 24 * 60 * 60;

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      // Neue Versionen erst nach Bestätigung aktivieren (Hinweis „Neue Version verfügbar“).
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'Bayerwald-Gipfel',
        short_name: 'BW-Gipfel',
        description: 'Deine bestiegenen Gipfel über 1000 m im Bayerischen Wald',
        lang: 'de',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        theme_color: '#2f7d5b',
        background_color: '#f6f7f5',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App-Shell und Gipfeldaten (data/**/*.json) vorab cachen.
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,json}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Satellitenbilder: groß, daher eigener, kleinerer Cache.
            urlPattern: /^https:\/\/api\.maptiler\.com\/tiles\/satellite[^/]*\/\d+\/\d+\/\d+/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'maptiler-satellite',
              expiration: { maxEntries: 1500, maxAgeSeconds: 60 * DAY, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Übrige Kacheln (Vektor, Höhenlinien, Relief).
            urlPattern: /^https:\/\/api\.maptiler\.com\/tiles\/[^/]+\/\d+\/\d+\/\d+/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'maptiler-tiles',
              expiration: { maxEntries: 3000, maxAgeSeconds: 60 * DAY, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Stil, TileJSON, Schriften, Sprites: sofort aus dem Cache, im Hintergrund auffrischen.
            urlPattern: /^https:\/\/api\.maptiler\.com\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'maptiler-style',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * DAY, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
});
