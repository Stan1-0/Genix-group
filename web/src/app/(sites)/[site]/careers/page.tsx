import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CareersPage } from '@/components/site/division/CareersPages'
import { openJobs } from '@/sites/jobs'
import { pageMetadata } from '@/sites/seo'

type Props = { params: Promise<{ site: string }> }

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site } = await params
  if (site !== 'logistics') return {}
  return pageMetadata('logistics', '/careers', {
    title: 'Driver Jobs in San Diego',
    description: 'Box truck driver jobs at Genix Logistics in San Diego: non-CDL, full-time or part-time, $22–$26 an hour plus overtime. Apply in two minutes.',
  })
}

// Careers live on the Logistics site only; everywhere else this is a 404.
export default async function Careers({ params }: Props) {
  const { site } = await params
  if (site !== 'logistics') notFound()
  return <CareersPage jobs={openJobs('logistics')} />
}
