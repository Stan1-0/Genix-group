import type { InspirationPhoto } from './types'

/* Starter inspiration, from the site's own photos, shown for a service until an editor publishes its own in the admin
   (Content → Inspiration). Only photos that really show the style: a service with none here shows no section. */
export const FALLBACK_INSPIRATION: readonly InspirationPhoto[] = [
  { id: 'aw-marble', service: 'accent-walls', style: 'Backlit marble & slatted wood', caption: 'A marble TV wall with warm backlighting, framed in slatted wood.', image: { src: '/brand/hu-project-marble-wall.jpg', alt: 'Backlit marble TV wall with slatted wood surround', width: 1402, height: 1122 }, order: 10 },
  { id: 'aw-natural-slats', service: 'accent-walls', style: 'Natural wood slats', caption: 'Light oak slats behind a wall-mounted TV and a floating console.', image: { src: '/brand/hu-tv-mount.jpg', alt: 'Slatted wood feature wall with a wall-mounted TV and floating console', width: 3710, height: 1944 }, order: 20 },
  { id: 'aw-geometric', service: 'accent-walls', style: 'Geometric panelling', caption: 'Black diagonal panelling with gold inlay strips.', image: { src: '/brand/hu-project-feature-wall.jpg', alt: 'Black accent wall with diagonal panelling and gold inlay strips', width: 1289, height: 1600 }, order: 30 },
  { id: 'aw-black-slats', service: 'accent-walls', style: 'Black slats & gold inlays', caption: 'Black slats and diagonal gold inlays framing a floating shelf.', image: { src: '/brand/hu-project-slat-wall.jpg', alt: 'Black feature wall with vertical slats, diagonal gold inlay strips and a floating shelf', width: 1200, height: 1600 }, order: 40 },
]
