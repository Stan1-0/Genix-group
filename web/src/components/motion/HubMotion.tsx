'use client'
import Lenis from 'lenis'
import { gsap, prefersReducedMotion, ScrollTrigger, SplitText } from './gsap'
import { useEnhance } from './useEnhance'

/** Hub motion from design/hub-home.html: Lenis wheel smoothing (its own, as on the division
    sites), headline line masks, the load sequence, division panels opening from a framed inset
    to full bleed, and quiet reveals. Reduced motion: nothing moves. */
export function HubMotion() {
  useEnhance((signal) => {
    const root = document.documentElement
    if (prefersReducedMotion()) {
      root.classList.remove('h1-pending')
      return
    }

    // Lenis: smooth mouse-wheel scrolling on desktop (touch stays native), driving ScrollTrigger
    const lenis = new Lenis({ anchors: { offset: -72 } })
    window.genixLenis = lenis
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (t: number) => lenis.raf(t * 1000)
    gsap.ticker.add(tick)
    // default lag smoothing kept: a heavy frame must not fast-forward tweens

    const splits: SplitText[] = []
    const ctx = gsap.context(() => {})
    document.fonts.ready.then(() => {
      if (signal.aborted) return // split with the real font, or line breaks come out wrong
      root.classList.add('js-motion')
      ctx.add(() => {
        // Headline: each line rises out of its own mask, one after another. autoSplit re-cuts
        // the lines if the width changes without replaying; SplitText keeps the full sentence
        // available to screen readers.
        splits.push(
          SplitText.create('.hero h1', {
            type: 'lines',
            mask: 'lines',
            linesClass: 'h1-line',
            autoSplit: true,
            onSplit(self) {
              root.classList.remove('h1-pending')
              return gsap.from(self.lines, { yPercent: 110, duration: 1.05, ease: 'power4.out', stagger: 0.12, delay: 0.3 })
            },
          }),
        )

        // Load: the logo fades in whole (never reshaped), copy follows, the reel unveils from the bottom
        gsap
          .timeline({ defaults: { ease: 'power3.out' } })
          // animate the logo's images, not .lockup itself: .lockup's transform belongs to the scroll dock
          .from('.lockup > img', { opacity: 0, y: 24, duration: 1, stagger: 0.06 })
          .from('.hero-copy > :not(.lockup, h1)', { opacity: 0, y: 24, duration: 0.9, stagger: 0.08 }, 0.2)
          .from('.reel-frame', { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.2, ease: 'power3.inOut' }, 0.15)
          .from('.reel .now', { opacity: 0, duration: 0.6 }, 0.9)

        // Division panels: the photo opens from a framed inset to full bleed
        document.querySelectorAll<HTMLElement>('.panel').forEach((panel) => {
          gsap.fromTo(
            panel.querySelector('.panel-media'),
            { clipPath: 'inset(12% 8% 12% 8%)' },
            {
              clipPath: 'inset(0% 0% 0% 0%)',
              ease: 'none',
              scrollTrigger: { trigger: panel, start: 'top 90%', end: 'top 20%', scrub: 0.5 },
            },
          )
          gsap.from(panel.querySelectorAll('.wrap > div > *'), {
            y: 32,
            opacity: 0,
            duration: 0.9,
            stagger: 0.05,
            ease: 'power3.out',
            scrollTrigger: { trigger: panel, start: 'top 35%', once: true },
          })
        })

        // Quiet reveals for everything else
        gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
          gsap.fromTo(
            el,
            { opacity: 0, y: 24 },
            {
              opacity: 1,
              y: 0,
              duration: 0.9,
              ease: 'power3.out',
              scrollTrigger: { trigger: el, start: 'top 88%', once: true },
            },
          )
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
