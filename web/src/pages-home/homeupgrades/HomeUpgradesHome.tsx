import { JsonLd } from '@/components/site/JsonLd'
import { MotionRoot } from '@/components/motion/MotionRoot'
import { siteJsonLd } from '@/sites/seo'
import type { SiteData } from '@/sites/data-shape'
import { Build } from './sections/Build'
import { Hero } from './sections/Hero'
import { Process } from './sections/Process'
import { Promises } from './sections/Promises'
import { Quote } from './sections/Quote'
import { Services } from './sections/Services'
import { Work } from './sections/Work'

export function HomeUpgradesHome({ data }: { data: SiteData }) {
  return (
    <main id="main">
      <span id="top" />
      <JsonLd data={siteJsonLd('homeupgrades', data)} />
      <Hero data={data} />
      <Promises />
      <Services />
      <Work />
      <Build />
      <Process />
      <Quote data={data} />
      <MotionRoot />
    </main>
  )
}
