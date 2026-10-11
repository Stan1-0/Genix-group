import Image from 'next/image'
import type { Project } from '@/projects/types'

/* One Recent-work card (shared by the home section and /work). The viewer reads its data-* attributes. */
export function WorkCard({ project, reveal }: { project: Project; reveal: boolean }) {
  const { cover, photos, video, title, category, caption, description } = project
  const gallery =
    photos.length > 0 ? JSON.stringify([cover, ...photos].map(({ src, alt }) => ({ src, alt }))) : undefined
  return (
    <button
      className="work-card"
      data-reveal={reveal ? 'true' : undefined}
      data-kind={video ? 'video' : 'img'}
      data-src={video ? video.src : cover.src}
      data-poster={video ? cover.src : undefined}
      data-title={title}
      data-desc={description}
      data-gallery={gallery}
    >
      <Image
        src={cover.src}
        alt={cover.alt}
        width={cover.width}
        height={cover.height}
        sizes="(max-width: 900px) 90vw, 33vw"
        loading="lazy"
      />
      {video && (
        <span className="work-play" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      )}
      <span className="work-cap">
        <small>{`${category}${video ? ' · video' : ''}`}</small>
        <b>{title}</b>
        {caption && <span>{caption}</span>}
      </span>
    </button>
  )
}
