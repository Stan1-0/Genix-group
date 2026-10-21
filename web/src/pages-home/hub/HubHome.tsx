import { CaseVideos } from '@/components/motion/CaseVideos'
import { HubMotion } from '@/components/motion/HubMotion'
import { HubReel } from '@/components/motion/HubReel'
import { LogoDock } from '@/components/motion/LogoDock'
import { ProjectViewer } from '@/components/motion/ProjectViewer'
import { JsonLd } from '@/components/site/JsonLd'
import { siteJsonLd } from '@/sites/seo'
import type { SiteData } from '@/sites/data-shape'
import { Businesses } from './sections/Businesses'
import { Hero } from './sections/Hero'
import { Intro } from './sections/Intro'
import { Route } from './sections/Route'
import { ViewerDialog } from '../homeupgrades/work/ViewerDialog'

/* Hub home. Its own motion (HubMotion, not MotionRoot): dock, reel, case videos, Lenis, panels, reveals, and the
   Home Upgrades project viewer for the recent-work cards. */
export function HubHome({ data }: { data: SiteData }) {
  return (
    <main id="main">
      <span id="top" />
      <JsonLd data={siteJsonLd('hub', data)} />
      <LogoDock />
      <HubReel />
      <CaseVideos />
      <HubMotion />
      <Hero data={data} />
      <Intro />
      <Businesses />
      <Route data={data} />
      <ViewerDialog />
      <ProjectViewer selector=".case-open" />
    </main>
  )
}
