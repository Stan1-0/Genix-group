export type ProjectImage = { src: string; alt: string; width: number; height: number }
export type Project = {
  id: string
  title: string
  category: string
  caption: string | null
  description: string
  cover: ProjectImage
  photos: ProjectImage[]
  video: { src: string } | null
  featured: boolean
  order: number
}
