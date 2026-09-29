import { expect, test } from '@playwright/test'

test('logistics home: title, canonical, JSON-LD and share image', async ({ page }) => {
  await page.goto('http://logistics.localhost:3000/')
  await expect(page).toHaveTitle('Genix Logistics | Reliable Freight. Real People. On Time, Every Time.')
  // Next 16.3.6's metadata resolver renders a root canonical as the bare origin (no
  // trailing slash) unless `trailingSlash: true` is set in next.config — see
  // node_modules/next/dist/lib/metadata/resolvers/resolve-url.js resolveAbsoluteUrlWithPathname.
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'http://logistics.localhost:3000')
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}')
  expect(ld['@type']).toBe('MovingCompany')
  expect(ld.areaServed).toEqual({ '@type': 'Country', name: 'United States' })
  const og = await page.locator('meta[property="og:image"]').first().getAttribute('content')
  expect(og).toBeTruthy()
  // Next 16.3.6 always resolves the file-convention `opengraph-image` route against a
  // dev-only localhost fallback (see resolve-opengraph.js's `isStaticMetadataRouteFile`
  // branch), ignoring our per-site `metadataBase`, so `og`'s host is the bare dev origin
  // rather than this site's own host. In production `metadataBase` is honored and the path
  // is requested on the site's own host, which is what our proxy expects (see
  // src/sites/routing.ts: a site segment only passes through on its own host). Re-host the
  // path onto the current page's origin to exercise that real, production-equivalent path.
  const imgUrl = og!.replace(/^https?:\/\/[^/]+/, new URL(page.url()).origin)
  const img = await page.goto(imgUrl)
  expect(img?.status()).toBe(200)
  expect(img?.headers()['content-type']).toContain('image/png')
})

test('each host serves its own sitemap and robots.txt', async ({ page }) => {
  const res = await page.goto('http://homeupgrades.localhost:3000/sitemap.xml')
  expect(res?.status()).toBe(200)
  expect(await res!.text()).toContain('<loc>http://homeupgrades.localhost:3000/</loc>')
  const robots = await page.goto('http://homeupgrades.localhost:3000/robots.txt')
  expect(await robots!.text()).toBe('User-agent: *\nDisallow: /\n') // ALLOW_INDEXING is off locally
})
