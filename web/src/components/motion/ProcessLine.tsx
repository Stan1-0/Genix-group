'use client'
import { gsap, prefersReducedMotion } from './gsap'
import { useEnhance } from './useEnhance'

/** "How a project runs": the gold line fills as you read the steps (scrubbed, no pin). Reduced motion: does nothing
    (the CSS default is the finished line). */
export function ProcessLine() {
  useEnhance(() => {
    const steps = document.getElementById('steps')
    if (!steps || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        steps,
        { '--progress': 0 },
        {
          '--progress': 1,
          ease: 'none',
          scrollTrigger: { trigger: steps, start: 'top 70%', end: 'bottom 60%', scrub: 0.4 },
        },
      )
    }, steps)
    return () => ctx.revert()
  })
  return null
}
