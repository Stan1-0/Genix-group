'use client'
import { prefersReducedMotion } from './gsap'
import { useEnhance } from './useEnhance'

/** Inspiration carousel controls (components/site/division/InspirationSection). The track scrolls natively (swipe,
    trackpad; a card tabbed to scrolls into view). These show the previous/next buttons only when the cards overflow,
    step one card at a time, and disable at each end. Reduced motion: the step jumps instead of gliding. */
export function InspirationCarousel() {
  useEnhance((signal) => {
    const track = document.getElementById('inspoTrack')
    const nav = document.querySelector<HTMLElement>('.svcd-inspo-nav')
    const prev = document.querySelector<HTMLButtonElement>('.svcd-inspo-prev')
    const next = document.querySelector<HTMLButtonElement>('.svcd-inspo-next')
    if (!track || !nav || !prev || !next) return

    const update = () => {
      const max = track.scrollWidth - track.clientWidth
      nav.hidden = max <= 1
      prev.disabled = track.scrollLeft <= 1
      next.disabled = track.scrollLeft >= max - 1
    }
    const step = (dir: 1 | -1) => {
      const card = track.querySelector<HTMLElement>('.work-card')
      if (!card) return
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0
      track.scrollBy({ left: dir * (card.offsetWidth + gap), behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    }

    prev.addEventListener('click', () => step(-1), { signal })
    next.addEventListener('click', () => step(1), { signal })
    track.addEventListener('scroll', update, { signal, passive: true })
    // Keyboard: a card tabbed to while half off-screen scrolls fully into view.
    track.addEventListener(
      'focusin',
      (e) => (e.target as HTMLElement).scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' }),
      { signal },
    )
    const ro = new ResizeObserver(update)
    ro.observe(track)
    update()
    return () => {
      ro.disconnect()
      nav.hidden = true
    }
  })
  return null
}
