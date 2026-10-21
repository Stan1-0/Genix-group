import Image from 'next/image'
import { InspirationCarousel } from '@/components/motion/InspirationCarousel'
import { ProjectViewer } from '@/components/motion/ProjectViewer'
import { ViewerDialog } from '@/pages-home/homeupgrades/work/ViewerDialog'
import type { InspirationPhoto } from '@/inspiration/types'

const chevron = (d: string) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

/* "Inspiration" on a Home Upgrades service page: a sideways carousel, one card per style, built from the Recent-work
   cards (.work-card, so the home's card styles and the project viewer apply). Swipe or scroll the track; the
   previous/next buttons (InspirationCarousel) step one card and hide when every card already fits. Editors manage the
   photos in the admin (Content → Inspiration); with none, the page passes the starter photos, or nothing and the
   section is left out. */
export function InspirationSection({ service, photos }: { service: string; photos: InspirationPhoto[] }) {
  if (!photos.length) return null
  return (
    <section className="svcd-inspo" id="inspiration" aria-labelledby="inspoTitle">
      <div className="wrap">
        <div className="svcd-inspo-head">
          <div>
            <p className="label">Inspiration</p>
            <h2 className="h-section" id="inspoTitle">
              Ideas to start from.
            </h2>
            <p className="body">
              A few looks for {service.charAt(0).toLowerCase() + service.slice(1)}. Swipe through, tap one to see it
              larger, then tell us which you like in your request.
            </p>
          </div>
          <div className="svcd-inspo-nav" hidden>
            <button type="button" className="svcd-inspo-prev" aria-label="Previous styles" aria-controls="inspoTrack">
              {chevron('M15 5l-7 7 7 7')}
            </button>
            <button type="button" className="svcd-inspo-next" aria-label="Next styles" aria-controls="inspoTrack">
              {chevron('M9 5l7 7-7 7')}
            </button>
          </div>
        </div>
        <div className="svcd-inspo-track" id="inspoTrack" role="region" aria-labelledby="inspoTitle">
          {photos.map((p) => (
            <button
              key={p.id}
              type="button"
              className="work-card"
              data-kind="img"
              data-src={p.image.src}
              data-title={p.style}
              data-desc={p.caption ?? ''}
              aria-label={`View larger: ${p.style}`}
            >
              <Image
                src={p.image.src}
                alt={p.image.alt}
                width={p.image.width}
                height={p.image.height}
                sizes="(max-width: 960px) 82vw, 400px"
                loading="lazy"
              />
              <span className="work-cap">
                <b>{p.style}</b>
              </span>
            </button>
          ))}
        </div>
      </div>
      <ViewerDialog />
      <ProjectViewer />
      <InspirationCarousel />
    </section>
  )
}
