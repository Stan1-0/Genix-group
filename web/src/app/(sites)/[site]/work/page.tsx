import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { WorkPage } from '@/pages-home/homeupgrades/WorkPage'
import { getProjects } from '@/projects/data'
import { isSiteKey } from '@/sites/config'
import { pageMetadata } from '@/sites/seo'

type Props = { params: Promise<{ site: string }> }

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site } = await params
  if (site !== 'homeupgrades') return {}
  return pageMetadata('homeupgrades', '/work', { title: 'Our work', description: 'Recent Genix Home Upgrades projects: accent walls, TV units and wall mounting, finished by our crew.' })
}

// Our work exists for Home Upgrades only.
export default async function Work({ params }: Props) {
  const { site } = await params
  if (!isSiteKey(site) || site !== 'homeupgrades') notFound()
  return <WorkPage projects={await getProjects()} />
}
