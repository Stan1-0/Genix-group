export type InspirationPhoto = {
  id: string
  service: string
  style: string
  caption: string | null
  image: { src: string; alt: string; width: number; height: number }
  order: number
}
