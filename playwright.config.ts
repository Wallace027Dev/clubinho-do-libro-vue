import { defineConfig } from '@playwright/test'

// E2E: dirige o app real (build de homologação, com o "banco" em memória) num
// Chromium. Usa o navegador pré-instalado do ambiente (PLAYWRIGHT_BROWSERS_PATH),
// sem baixar nada.
const PORT = 5199

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 430, height: 900 },
    trace: 'on-first-retry'
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: `npm run dev:web -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    env: { VITE_MOCK_API: 'true' },
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  }
})
