'use client'
import Lenis from 'lenis'
import { gsap, prefersReducedMotion, ScrollTrigger, SplitText } from './gsap'
import { useEnhance } from './useEnhance'

declare global {
  interface Window { genixLenis?: Lenis }
}

/** Division-site motion from design/shared/genix.js: Lenis wheel smoothing, [data-split]
    headline lines, [data-reveal] quiet reveals. Reduced motion: nothing moves. */
export function MotionRoot() {
  useEnhance((signal) => {
    const root = document.documentElement
    if (prefersReducedMotion()) {
      root.classList.remove('h1-pending')
      return
    }
    root.classList.add('js-motion')
    const offset = -parseInt(getComputedStyle(root).getPropertyValue('--header')) || -76
    const lenis = new Lenis({ anchors: { offset } })
    window.genixLenis = lenis
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (t: number) => lenis.raf(t * 1000)
    gsap.ticker.add(tick)

    const splits: SplitText[] = []
    const ctx = gsap.context(() => {})
    document.fonts.ready.then(() => {
      if (signal.aborted) return
      ctx.add(() => {
        document.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
          splits.push(
            SplitText.create(el, {
              type: 'lines',
              mask: 'lines',
              autoSplit: true,
              onSplit(self) {
                root.classList.remove('h1-pending')
                const inHero = !!el.closest('[data-hero]')
                return gsap.from(self.lines, {
                  yPercent: 110, duration: 1.05, ease: 'power4.out', stagger: 0.12,
                  delay: inHero ? 0.25 : 0,
                  scrollTrigger: inHero ? undefined : { trigger: el, start: 'top 85%', once: true },
                })
              },
            }),
          )
        })
        root.classList.remove('h1-pending')
        gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
          gsap.fromTo(el, { opacity: 0, y: 24 }, {
            opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          })
        })
      })
      if (document.readyState === 'complete') ScrollTrigger.refresh()
      else addEventListener('load', () => ScrollTrigger.refresh(), { once: true, signal })
    })

    return () => {
      splits.forEach((s) => s.revert())
      ctx.revert()
      gsap.ticker.remove(tick)
      lenis.destroy()
      delete window.genixLenis
      root.classList.remove('js-motion')
    }
  })
  return null
}
