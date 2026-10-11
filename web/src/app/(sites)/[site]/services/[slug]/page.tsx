import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ServiceDetailPage } from '@/components/site/division/ServiceDetailPage'
import { getSiteData } from '@/sites/data'
import { pageMetadata } from '@/sites/seo'
import { HU_SERVICE_SLUGS, huServiceBySlug } from '@/sites/services'

type Props = { params: Promise<{ site: string; slug: string }> }

export const revalidate = 3600

export function generateStaticParams() {
  return HU_SERVICE_SLUGS.map((slug) => ({ site: 'homeupgrades', slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site, slug } = await params
  const item = site === 'homeupgrades' ? huServiceBySlug(slug) : undefined
  if (!item?.detail) return {}
  return pageMetadata('homeupgrades', `/services/${slug}`, { title: item.title, description: item.detail.description })
}

// One page per Home Upgrades service; everything else is a 404.
export default async function ServiceDetail({ params }: Props) {
  const { site, slug } = await params
  const item = site === 'homeupgrades' ? huServiceBySlug(slug) : undefined
  if (!item?.detail) notFound()
  return <ServiceDetailPage item={item} data={await getSiteData('homeupgrades')} />
}
