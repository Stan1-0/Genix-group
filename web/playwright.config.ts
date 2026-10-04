import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.e2e.spec.ts',
  fullyParallel: false,
  // One worker: the 4 spec files must not hit the single cold `next dev` server in parallel.
  workers: 1,
  // Visits every host once before any test runs, so the first Turbopack compile of each
  // route is already done (see ./tests/e2e/global-setup.ts).
  globalSetup: './tests/e2e/global-setup.ts',
  use: { baseURL: 'http://localhost:3000', navigationTimeout: 90_000 },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    { command: 'npm run dev', url: 'http://localhost:3000/admin', reuseExistingServer: true, timeout: 180_000 },
    { command: 'python -m http.server 4321 --directory ../design', url: 'http://localhost:4321/hub-home.html', reuseExistingServer: true, timeout: 30_000 },
  ],
})
