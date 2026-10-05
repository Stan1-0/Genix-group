import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { HomeUpgradesContact } from '@/pages-home/homeupgrades/Contact'
import { LogisticsContact } from '@/pages-home/logistics/Contact'
import { isSiteKey } from '@/sites/config'
import { getSiteData } from '@/sites/data'
import { pageMetadata } from '@/sites/seo'

type Props = { params: Promise<{ site: string }> }

const DESCRIPTIONS = {
  logistics: "Contact Genix Logistics in San Diego for a freight, courier or move quote. Send the route and what's moving, or call us.",
  homeupgrades: "Contact Genix Home Upgrades for accent walls, TV units, outdoor builds and handyman work in California. Send a few photos and we'll arrange a visit.",
} as const

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site } = await params
  if (site !== 'logistics' && site !== 'homeupgrades') return {}
  return pageMetadata(site, '/contact', { title: 'Contact', description: DESCRIPTIONS[site] })
}

// Contact exists on the two divisions that take quote requests; everything else is a 404.
export default async function ContactPage({ params }: Props) {
  const { site } = await params
  if (!isSiteKey(site) || (site !== 'logistics' && site !== 'homeupgrades')) notFound()
  const data = await getSiteData(site)
  return site === 'logistics' ? <LogisticsContact data={data} /> : <HomeUpgradesContact data={data} />
}
