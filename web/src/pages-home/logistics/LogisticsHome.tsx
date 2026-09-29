import { JsonLd } from '@/components/site/JsonLd'
import { MotionRoot } from '@/components/motion/MotionRoot'
import { siteJsonLd } from '@/sites/seo'
import type { SiteData } from '@/sites/data-shape'
import { Areas } from './sections/Areas'
import { Faq } from './sections/Faq'
import { FinalQuote } from './sections/FinalQuote'
import { Hero } from './sections/Hero'
import { Lanes } from './sections/Lanes'
import { Road } from './sections/Road'
import { Why } from './sections/Why'

export function LogisticsHome({ data }: { data: SiteData }) {
  return (
    <main id="main">
      <JsonLd data={siteJsonLd('logistics', data)} />
      <Hero data={data} />
      <Lanes />
      <Road />
      <Areas />
      <Why />
      <Faq />
      <FinalQuote data={data} />
      <MotionRoot />
    </main>
  )
}
