import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import '@/legal/policy.css'
import { PrivacyPolicy } from '@/legal/privacy'
import { isSiteKey, siteOrigin } from '@/sites/config'
import { getSiteData } from '@/sites/data'
import { pageMetadata } from '@/sites/seo'

type Props = { params: Promise<{ site: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { site } = await params
  if (site !== 'hub') return {}
  return pageMetadata('hub', '/privacy', {
    title: 'Privacy policy',
    description: 'What The Genix Group collects through its sites, what it does with it, and your choices.',
  })
}

// One policy for the whole group, on the hub host. Division hosts send visitors there.
export default async function PrivacyPage({ params }: Props) {
  const { site } = await params
  if (!isSiteKey(site)) notFound()
  if (site !== 'hub') permanentRedirect(`${siteOrigin('hub')}/privacy`)
  const data = await getSiteData('hub')
  return (
    <main id="main" className="policy">
      <div className="wrap">
        <PrivacyPolicy email={data.email ?? 'hello@thegenixgroup.com'} address={data.address} />
      </div>
    </main>
  )
}
