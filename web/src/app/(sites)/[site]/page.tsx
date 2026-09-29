import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/site/JsonLd'
import { HomeUpgradesHome } from '@/pages-home/homeupgrades/HomeUpgradesHome'
import { HubHome } from '@/pages-home/hub/HubHome'
import { LogisticsHome } from '@/pages-home/logistics/LogisticsHome'
import { SITES, SITE_KEYS, isSiteKey } from '@/sites/config'
import { getSiteData } from '@/sites/data'
import { pageMetadata, siteJsonLd } from '@/sites/seo'

type Props = { params: Promise<{ site: string }> }

// Time-based safety net alongside the Sites afterChange tag revalidation, in
// case a revalidation event is ever missed.
export const revalidate = 3600

export function generateStaticParams() {
  return SITE_KEYS.map((site) => ({ site }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site } = await params
  if (!isSiteKey(site)) return {}
  const data = await getSiteData(site)
  return pageMetadata(site, '/', { description: data.seoDescription })
}

export default async function HomePage({ params }: Props) {
  const { site } = await params
  if (!isSiteKey(site)) notFound()
  const cfg = SITES[site]
  const data = await getSiteData(site)
  if (site === 'hub') return <HubHome data={data} />
  if (site === 'logistics') return <LogisticsHome data={data} />
  if (site === 'homeupgrades') return <HomeUpgradesHome data={data} />
  // Other sites: foundation placeholder until their pages are ported.
  return (
    <main id="main">
      <JsonLd data={siteJsonLd(site, data)} />
      <section data-quote-bar-after className="on-brand bg-brand px-[clamp(16px,4vw,56px)] py-[clamp(64px,10vw,128px)] text-white">
        <div className="mx-auto max-w-[1320px]">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-gold">{cfg.name}</p>
          <h1 className="mt-4 max-w-[18ch] font-display text-[clamp(40px,6vw,88px)] font-bold leading-[0.98]">{data.heroHeading}</h1>
          {data.heroSubheading && <p className="mt-6 max-w-[48ch] text-lg text-on-brand-muted">{data.heroSubheading}</p>}
          <Link href={cfg.cta.href} className="mt-8 inline-flex min-h-[52px] items-center rounded-site bg-gold px-6 font-semibold text-heading">
            {cfg.cta.label} <span aria-hidden="true" className="ml-3">→</span>
          </Link>
        </div>
      </section>
    </main>
  )
}
