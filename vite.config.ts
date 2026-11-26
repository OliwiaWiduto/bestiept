import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg,json,wasm}'], maximumFileSizeToCacheInBytes: 3 * 1024 * 1024 },
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'BestiePT',
        short_name: 'BestiePT',
        description: 'Save recipes, cook hands-free, plan your week and track your food.',
        theme_color: '#313616',
        background_color: '#FFF8F3',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
