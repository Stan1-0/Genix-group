import { JsonLd } from '@/components/site/JsonLd'
import { siteJsonLd } from '@/sites/seo'
import type { SiteData } from '@/sites/data-shape'
import { Businesses } from './sections/Businesses'
import { Hero } from './sections/Hero'
import { Intro } from './sections/Intro'
import { Route } from './sections/Route'

/* Hub home. No MotionRoot yet: the hub's own motion (reel, dock, reveals) is added in Task 11. */
export function HubHome({ data }: { data: SiteData }) {
  return (
    <main id="main">
      <JsonLd data={siteJsonLd('hub', data)} />
      <Hero data={data} />
      <Intro />
      <Businesses />
      <Route data={data} />
    </main>
  )
}
