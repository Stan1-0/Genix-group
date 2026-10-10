import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ServicesPage } from '@/components/site/division/ServicesPage'
import { isSiteKey } from '@/sites/config'
import { getSiteData } from '@/sites/data'
import { pageMetadata } from '@/sites/seo'
import { SERVICES_INTRO } from '@/sites/services'

type Props = { params: Promise<{ site: string }> }

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site } = await params
  if (site !== 'logistics' && site !== 'homeupgrades') return {}
  return pageMetadata(site, '/services', { title: 'Services', description: SERVICES_INTRO[site].description })
}

// Services pages exist for the two divisions with services to list; everything else is a 404.
export default async function Services({ params }: Props) {
  const { site } = await params
  if (!isSiteKey(site) || (site !== 'logistics' && site !== 'homeupgrades')) notFound()
  return <ServicesPage site={site} data={await getSiteData(site)} />
}
