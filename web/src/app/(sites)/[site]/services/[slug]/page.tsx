import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LogisticsServiceDetailPage } from '@/components/site/division/LogisticsServiceDetailPage'
import { ServiceDetailPage } from '@/components/site/division/ServiceDetailPage'
import { getSiteData } from '@/sites/data'
import { getInspiration } from '@/inspiration/data'
import { pageMetadata } from '@/sites/seo'
import { isServiceSite, serviceBySlug, serviceSlugs } from '@/sites/services'

type Props = { params: Promise<{ site: string; slug: string }> }

export const revalidate = 3600

export function generateStaticParams() {
  return (['logistics', 'homeupgrades'] as const).flatMap((site) =>
    serviceSlugs(site).map((slug) => ({ site, slug })),
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site, slug } = await params
  const item = isServiceSite(site) ? serviceBySlug(site, slug) : undefined
  if (!isServiceSite(site) || !item?.detail) return {}
  return pageMetadata(site, `/services/${slug}`, {
    title: item.seoTitle,
    description: item.detail.description,
  })
}

// One page per Logistics and Home Upgrades service; everything else is a 404.
export default async function ServiceDetail({ params }: Props) {
  const { site, slug } = await params
  const item = isServiceSite(site) ? serviceBySlug(site, slug) : undefined
  if (!isServiceSite(site) || !item?.detail) notFound()
  const data = await getSiteData(site)
  return site === 'logistics' ? (
    <LogisticsServiceDetailPage item={item} data={data} />
  ) : (
    <ServiceDetailPage item={item} data={data} inspiration={await getInspiration(item.id)} />
  )
}
