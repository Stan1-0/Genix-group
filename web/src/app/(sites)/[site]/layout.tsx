import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import '../sites.css'
import '@/pages-home/logistics/logistics.generated.css'
import '@/pages-home/homeupgrades/homeupgrades.generated.css'
import '@/pages-home/hub/hub.generated.css'
import { EARLY_SCRIPT, HUB_EARLY_SCRIPT } from '@/pages-home/early-script'
import { SITES, SITE_KEYS, isSiteKey, siteOrigin } from '@/sites/config'
import { THEMES, themeVars } from '@/sites/themes'
import { fontClassNames } from '@/sites/fonts'
import { getSiteData } from '@/sites/data'
import { SiteHeader, SiteFooter, SiteQuoteBar } from '@/components/site/SiteChrome'

type Props = { children: React.ReactNode; params: Promise<{ site: string }> }

// Time-based safety net alongside the Sites afterChange tag revalidation, in
// case a revalidation event is ever missed.
export const revalidate = 3600

export function generateStaticParams() {
  return SITE_KEYS.map((site) => ({ site }))
}

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const { site } = await params
  if (!isSiteKey(site)) return {}
  const cfg = SITES[site]
  const data = await getSiteData(site)
  return {
    metadataBase: new URL(siteOrigin(site)),
    title: { default: `${cfg.name} | ${cfg.tagline}`, template: `%s | ${cfg.name}` },
    description: data.seoDescription ?? undefined,
    icons: {
      icon: [
        { url: `${cfg.icons}/favicon.svg`, type: 'image/svg+xml' },
        { url: `${cfg.icons}/favicon-32x32.png`, sizes: '32x32', type: 'image/png' },
      ],
      apple: `${cfg.icons}/apple-touch-icon.png`,
    },
  }
}

export default async function SiteLayout({ children, params }: Props) {
  const { site } = await params
  if (!isSiteKey(site)) notFound()
  const theme = THEMES[site]
  const data = await getSiteData(site)
  return (
    <html lang="en" data-site={site} className={fontClassNames(theme)} style={themeVars(theme)} suppressHydrationWarning>
      {site !== 'multimedia' && (
        <head>
          <script dangerouslySetInnerHTML={{ __html: site === 'hub' ? HUB_EARLY_SCRIPT : EARLY_SCRIPT }} />
        </head>
      )}
      {/* Browser extensions (e.g. Grammarly) add attributes to <body> before hydration.
          This ignores attribute mismatches on <body> only; its children are still checked. */}
      <body suppressHydrationWarning>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-paper focus:px-4 focus:py-2">
          Skip to content
        </a>
        <SiteHeader site={site} />
        {children}
        <SiteFooter site={site} data={data} />
        <SiteQuoteBar site={site} data={data} />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
