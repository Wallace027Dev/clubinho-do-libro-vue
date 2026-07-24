import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

const apiPort = process.env.API_PORT ?? '3001'

// Homologação com "banco" em memória no navegador:
// - VITE_MOCK_API explícito ('true'/'false') sempre vence;
// - sem ele, liga automaticamente em qualquer deploy de Preview da Vercel
//   (ex.: a branch `developer`), enquanto produção segue no backend real.
const useMockApi = process.env.VITE_MOCK_API
  ? process.env.VITE_MOCK_API === 'true'
  : process.env.VERCEL_ENV === 'preview'

export default defineConfig({
  define: {
    __USE_MOCK_API__: JSON.stringify(useMockApi)
  },
  server: {
    proxy: {
      '/api': {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true
      }
    }
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-icon.svg', 'push-sw.js'],
      // Handlers de Web Push (push/notificationclick) importados pelo SW gerado.
      workbox: {
        importScripts: ['push-sw.js']
      },
      manifest: {
        name: 'Clubinho do Libro',
        short_name: 'Libro',
        description: 'Sorteador mobile first para escolher o livro do mes.',
        theme_color: '#556034',
        background_color: '#f5ecd8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/pwa-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})
