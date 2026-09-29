import { CaseVideos } from '@/components/motion/CaseVideos'
import { HubMotion } from '@/components/motion/HubMotion'
import { HubReel } from '@/components/motion/HubReel'
import { LogoDock } from '@/components/motion/LogoDock'
import { JsonLd } from '@/components/site/JsonLd'
import { siteJsonLd } from '@/sites/seo'
import type { SiteData } from '@/sites/data-shape'
import { Businesses } from './sections/Businesses'
import { Hero } from './sections/Hero'
import { Intro } from './sections/Intro'
import { Route } from './sections/Route'

/* Hub home. Its own motion (HubMotion, not MotionRoot): dock, reel, case videos, Lenis, panels, reveals. */
export function HubHome({ data }: { data: SiteData }) {
  return (
    <main id="main">
      <JsonLd data={siteJsonLd('hub', data)} />
      <LogoDock />
      <HubReel />
      <CaseVideos />
      <HubMotion />
      <Hero data={data} />
      <Intro />
      <Businesses />
      <Route data={data} />
    </main>
  )
}
