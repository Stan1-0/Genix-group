import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { HubAbout } from '@/pages-home/hub/About'
import { isSiteKey } from '@/sites/config'
import { getSiteData } from '@/sites/data'
import { pageMetadata } from '@/sites/seo'

type Props = { params: Promise<{ site: string }> }

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site } = await params
  if (site !== 'hub') return {}
  return pageMetadata('hub', '/about', {
    title: 'About',
    description: 'The Genix Group runs Genix Logistics, Genix Home Upgrades and Genix Multimedia from San Diego, serving customers across the USA.',
  })
}

// The group's About page lives on the hub; the other sites 404 until they have their own.
export default async function AboutPage({ params }: Props) {
  const { site } = await params
  if (!isSiteKey(site) || site !== 'hub') notFound()
  const data = await getSiteData('hub')
  return <HubAbout data={data} />
}
