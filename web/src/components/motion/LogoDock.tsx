'use client'
import { prefersReducedMotion } from './gsap'
import { useEnhance } from './useEnhance'

type Dock = { D: number; dx: number; s: number }

/** One logo at a time (design/hub-home.html): the hero lockup docks into the header as you
    scroll. It rides up with the page and shrinks toward the header logo's size and position;
    the moment it lands, the header logo takes over. Plain JS, no GSAP. Reduced motion: an
    instant swap. The lockup's images move whole; the mark is never reshaped or recoloured. */
export function LogoDock() {
  useEnhance((signal) => {
    const root = document.documentElement
    const lock = document.querySelector<HTMLElement>('.lockup')
    const headMark = document.querySelector<HTMLElement>('.site-header .logo-mark')
    if (!lock || !headMark) return
    const reduce = prefersReducedMotion()
    let g: Dock | null = null
    let raf = 0
    // HUB_EARLY_SCRIPT already added this before paint; adding again is harmless, and it stays.
    root.classList.add('logo-dock')

    const update = () => {
      raf = 0
      if (!g) return
      const p = Math.min(1, Math.max(0, scrollY / g.D))
      const docked = p >= 1
      if (!reduce) {
        lock.style.transform = `translate(${g.dx * p}px, 0) scale(${1 + (g.s - 1) * p})`
      }
      lock.style.visibility = docked ? 'hidden' : ''
      root.classList.toggle('logo-docked', reduce ? scrollY >= g.D : docked)
    }
    const measure = () => {
      const t = lock.style.transform
      lock.style.transform = 'none'
      const L = lock.getBoundingClientRect() // lockup height = its mark's height
      const H = headMark.getBoundingClientRect() // sticky: same spot at any scroll
      lock.style.transform = t
      g = {
        D: Math.max(1, L.top + scrollY - H.top), // scroll at which the lockup's top meets the header mark's top
        dx: H.left - L.left,
        s: H.height / L.height,
      }
      update()
    }
    addEventListener('scroll', () => raf || (raf = requestAnimationFrame(update)), { passive: true, signal })
    addEventListener('resize', measure, { signal })
    addEventListener('load', measure, { signal })
    measure()

    return () => {
      cancelAnimationFrame(raf)
      lock.style.transform = ''
      lock.style.visibility = ''
      root.classList.remove('logo-docked')
    }
  })
  return null
}
