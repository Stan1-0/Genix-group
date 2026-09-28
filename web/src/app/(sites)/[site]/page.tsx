import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SITES, SITE_KEYS, isSiteKey } from '@/sites/config'
import { getSiteData } from '@/sites/data'

type Props = { params: Promise<{ site: string }> }

export function generateStaticParams() {
  return SITE_KEYS.map((site) => ({ site }))
}

export default async function HomePage({ params }: Props) {
  const { site } = await params
  if (!isSiteKey(site)) notFound()
  const cfg = SITES[site]
  const data = await getSiteData(site)
  return (
    <main id="main">
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
