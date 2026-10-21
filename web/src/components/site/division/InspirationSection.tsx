import Image from 'next/image'
import { ProjectViewer } from '@/components/motion/ProjectViewer'
import { ViewerDialog } from '@/pages-home/homeupgrades/work/ViewerDialog'
import type { InspirationPhoto } from '@/inspiration/types'

/* "Inspiration" on a Home Upgrades service page: one card per style, built from the Recent-work cards
   (.work-card, so the home's card styles and the project viewer apply). Editors manage the photos in the admin
   (Content → Inspiration); with none, the page passes the starter photos, or nothing and the section is left out. */
export function InspirationSection({ service, photos }: { service: string; photos: InspirationPhoto[] }) {
  if (!photos.length) return null
  return (
    <section className="svcd-inspo" id="inspiration" aria-labelledby="inspoTitle">
      <div className="wrap">
        <div className="svcd-inspo-head">
          <p className="label">Inspiration</p>
          <h2 className="h-section" id="inspoTitle">
            Ideas to start from.
          </h2>
          <p className="body">
            A few looks for {service.charAt(0).toLowerCase() + service.slice(1)}. Tap one to see it larger, then tell us which you like in your request.
          </p>
        </div>
        <div className="work-grid svcd-inspo-grid" data-count={Math.min(photos.length, 4)}>
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
                sizes="(max-width: 640px) 90vw, (max-width: 960px) 45vw, 25vw"
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
    </section>
  )
}
