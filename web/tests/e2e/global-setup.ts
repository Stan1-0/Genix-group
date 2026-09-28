import { chromium } from '@playwright/test'

// Runs once, after webServer is up but before any test file. `next dev` (Turbopack) compiles
// each route lazily on its first request, which can 500 while the module graph is still being
// built. Visiting every host here — serially, in one browser — pays that first-compile cost
// up front so the actual test run only ever hits warm routes.
export default async function globalSetup() {
  const hosts = [
    'http://localhost:3000/',
    'http://localhost:3000/admin',
    'http://logistics.localhost:3000/',
    'http://homeupgrades.localhost:3000/',
    'http://multimedia.localhost:3000/',
  ]

  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    for (const url of hosts) {
      await page.goto(url, { waitUntil: 'load', timeout: 90_000 })
    }
  } finally {
    await browser.close()
  }
}
