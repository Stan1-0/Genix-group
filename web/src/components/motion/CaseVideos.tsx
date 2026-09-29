'use client'
import { prefersReducedMotion } from './gsap'
import { useEnhance } from './useEnhance'

/** Case-study videos (design/hub-home.html): play only while on screen, which is also when they
    first download. Reduced motion: never autoplay; show play controls. */
export function CaseVideos() {
  useEnhance(() => {
    const vids = document.querySelectorAll<HTMLVideoElement>('.case video')
    if (prefersReducedMotion()) {
      vids.forEach((v) => (v.controls = true))
      return () => vids.forEach((v) => (v.controls = false))
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach(({ target, isIntersecting }) => {
          const v = target as HTMLVideoElement
          if (isIntersecting) v.play().catch(() => {})
          else v.pause()
        }),
      { threshold: 0.25 },
    )
    vids.forEach((v) => io.observe(v))
    return () => {
      io.disconnect()
      vids.forEach((v) => v.pause())
    }
  })
  return null
}
