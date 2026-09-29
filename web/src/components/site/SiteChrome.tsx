import type { SiteKey } from '@/sites/config'
import type { SiteData } from '@/sites/data-shape'
import { SITES } from '@/sites/config'
import { Header } from './Header'
import { Footer } from './Footer'
import { QuoteBar } from './QuoteBar'
import { DivisionHeader } from './division/DivisionHeader'
import { DivisionFooter } from './division/DivisionFooter'
import { DivisionQuoteBar } from './division/DivisionQuoteBar'
import { HubHeader } from './hub/HubHeader'
import { HubFooter } from './hub/HubFooter'

export function SiteHeader({ site }: { site: SiteKey }) {
  if (site === 'hub') return <HubHeader />
  if (site === 'multimedia') return <Header site={site} />
  return <DivisionHeader site={site} />
}

export function SiteFooter({ site, data }: { site: SiteKey; data: SiteData }) {
  if (site === 'hub') return <HubFooter data={data} />
  if (site === 'multimedia') return <Footer site={site} data={data} />
  return <DivisionFooter site={site} data={data} />
}

export function SiteQuoteBar({ site, data }: { site: SiteKey; data: SiteData }) {
  if (site === 'hub') return null // the hub prototype has no quote bar
  if (site === 'multimedia') return <QuoteBar href={SITES[site].cta.href} label={SITES[site].cta.label} phone={data.phone} />
  return <DivisionQuoteBar site={site} data={data} />
}
