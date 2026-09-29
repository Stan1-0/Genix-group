'use client'
import { gsap, prefersReducedMotion } from './gsap'
import { useEnhance } from './useEnhance'

/** "How a job runs" (design/js/route.js): the truck drives the road as the section scrolls past.
    Scrubbed ScrollTrigger with no pin, so the section keeps its natural height. Stops light up as
    the truck reaches them; a DELIVERED stamp lands once at the end. Reduced motion: does nothing
    (the CSS default, --p: 1, is the finished road). */
export function RoadSection() {
  useEnhance(() => {
    const how = document.getElementById('how')
    const road = how?.querySelector<HTMLElement>('[data-road]')
    if (!how || !road || prefersReducedMotion()) return
    const stops = [...road.querySelectorAll<HTMLElement>('[data-stop]')]
    const last = stops.length - 1
    const mark = (p: number) => {
      stops.forEach((s, i) => s.classList.toggle('is-passed', p >= i / last - 0.001))
      road.classList.toggle('is-done', p >= 0.999)
      if (p >= 0.999) road.classList.add('was-done') // sticky: the stamp lands once (spec §4), never removed
    }
    const ctx = gsap.context(() => {
      road.classList.add('is-live')
      gsap.fromTo(
        road,
        { '--p': 0 },
        {
          '--p': 1,
          ease: 'none',
          scrollTrigger: { trigger: road, start: 'top 75%', end: 'bottom 45%', scrub: 0.5 },
          onUpdate(this: gsap.core.Tween) {
            mark(this.progress())
          },
        },
      )
      mark(0)
    }, how)
    return () => {
      ctx.revert()
      // Back to the server-rendered (finished road) state, so a StrictMode re-run starts clean.
      road.classList.remove('is-live', 'is-done', 'was-done')
      stops.forEach((s) => s.classList.remove('is-passed'))
    }
  })
  return null
}
