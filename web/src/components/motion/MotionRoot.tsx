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
    // lerp 0.18, not the 0.1 default: smoothing the wheel costs latency on the one thing the
    // user drives directly, and the default reads as the page lagging the finger.
    const lenis = new Lenis({ lerp: 0.18, anchors: { offset } })
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
        // Cards the Home | Business toggle swaps in were display:none when their reveal was set up,
        // so it never fires for them. Fade whatever is visible in on every switch.
        document.querySelectorAll<HTMLInputElement>('.svc-toggle input').forEach((input) =>
          input.addEventListener(
            'change',
            () => {
              // The set going out may still carry the exit tween's opacity; it must not come back faded.
              gsap.set('.svc', { clearProps: 'opacity,transform' })
              const cards = gsap.utils.toArray<HTMLElement>('.svc').filter((c) => c.offsetParent !== null)
              gsap.fromTo(cards, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.08, overwrite: true })
            },
            { signal },
          ),
        )
        // The swap itself is CSS (:has + display: none), which drops the old cards mid-frame — one
        // set arrived out of nothing while the other simply stopped existing. Take the click before
        // the radio flips, see the leaving cards out, then let the swap run. Keyboard selection has
        // no click to intercept and keeps the entrance fade only.
        document.querySelector('.svc-toggle')?.addEventListener(
          'click',
          (e) => {
            const label = (e.target as HTMLElement).closest('label')
            if (!label) return
            const input = document.getElementById(label.htmlFor) as HTMLInputElement | null
            if (!input || input.checked) return
            e.preventDefault() // we flip it ourselves, once the old cards are out
            const leaving = gsap.utils.toArray<HTMLElement>('.svc').filter((c) => c.offsetParent !== null)
            gsap.to(leaving, {
              opacity: 0,
              y: -8,
              duration: 0.18,
              ease: 'power2.in',
              stagger: 0.03,
              overwrite: true,
              onComplete: () => {
                input.checked = true
                input.dispatchEvent(new Event('change', { bubbles: true }))
              },
            })
          },
          { capture: true, signal },
        )
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
