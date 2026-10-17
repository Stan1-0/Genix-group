import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { JobPage } from '@/components/site/division/CareersPages'
import { JOBS, jobPath, openJobBySlug, payLabel } from '@/sites/jobs'
import { pageMetadata } from '@/sites/seo'

type Props = { params: Promise<{ site: string; slug: string }> }

export const revalidate = 3600

export function generateStaticParams() {
  return JOBS.filter((j) => j.open).map((j) => ({ site: j.site, slug: j.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site, slug } = await params
  const job = site === 'logistics' ? openJobBySlug('logistics', slug) : undefined
  if (!job) return {}
  return pageMetadata('logistics', jobPath(job), {
    title: `${job.title} Job in ${job.location.locality} (${payLabel(job)})`,
    description: job.summary,
  })
}

// One page per open Logistics job; a closed or unknown job is a 404 (Google then drops the listing).
export default async function JobDetail({ params }: Props) {
  const { site, slug } = await params
  const job = site === 'logistics' ? openJobBySlug('logistics', slug) : undefined
  if (!job) notFound()
  return <JobPage job={job} />
}
