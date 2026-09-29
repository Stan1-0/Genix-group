'use client'
import { prefersReducedMotion } from './gsap'
import { useEnhance } from './useEnhance'

/** Hero reel (design/hub-home.html): Logistics, Home Upgrades, Multimedia. Auto-advances only
    when motion is allowed and the reel is on screen; the dots always work. */
export function HubReel() {
  useEnhance((signal) => {
    const reduce = prefersReducedMotion()
    const slides = [...document.querySelectorAll<HTMLElement>('.reel .slide')]
    const dots = [...document.querySelectorAll<HTMLButtonElement>('.now-dots button')]
    const nowName = document.getElementById('nowName')
    const nowBar = document.getElementById('nowBar')
    const reel = document.querySelector('.reel')
    if (!slides.length || !nowName || !nowBar || !reel) return
    const first = slides.findIndex((sl) => sl.classList.contains('on'))
    const firstLabel = nowName.textContent
    nowBar.hidden = false
    let cur = first
    let timer: ReturnType<typeof setInterval> | undefined
    let labelTimer: ReturnType<typeof setTimeout> | undefined
    let visible = true

    const show = (i: number) => {
      slides.forEach((sl, n) => {
        const on = n === i
        sl.classList.toggle('on', on)
        dots[n].setAttribute('aria-pressed', String(on))
        const v = sl.querySelector('video')
        if (!v) return
        if (on && visible && !reduce)
          v.play()
            .then(() => {
              if (!signal.aborted) v.classList.add('playing')
            })
            .catch(() => {})
        else v.pause()
      })
      // Switch the label at the crossfade's midpoint, when the new
      // picture is the one people actually see
      clearTimeout(labelTimer)
      labelTimer = setTimeout(() => (nowName.textContent = slides[i].dataset.name ?? ''), i === cur || reduce ? 0 : 450)
      cur = i
    }
    const cycle = () => {
      clearInterval(timer)
      if (!reduce && visible) timer = setInterval(() => show((cur + 1) % slides.length), 4200)
    }
    dots.forEach((d, i) =>
      d.addEventListener('click', () => {
        show(i)
        cycle()
      }, { signal }),
    )
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      show(cur)
      cycle()
    })
    io.observe(reel)

    return () => {
      io.disconnect()
      clearInterval(timer)
      clearTimeout(labelTimer)
      slides.forEach((sl, n) => {
        sl.classList.toggle('on', n === first)
        dots[n].setAttribute('aria-pressed', String(n === first))
        const v = sl.querySelector('video')
        v?.pause()
        v?.classList.remove('playing')
      })
      nowName.textContent = firstLabel
      nowBar.hidden = true
    }
  })
  return null
}
