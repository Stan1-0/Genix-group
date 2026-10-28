export type InspirationPhoto = {
  id: string
  service: string
  style: string
  caption: string | null
  image: { src: string; alt: string; width: number; height: number }
  order: number
  /** Stock photos only: the photographer, credited (with Unsplash) under the carousel as the Unsplash API requires. */
  credit?: { name: string; url: string }
}
