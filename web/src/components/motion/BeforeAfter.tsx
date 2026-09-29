'use client'
import { Draggable } from 'gsap/Draggable'
import { InertiaPlugin } from 'gsap/InertiaPlugin'
import { gsap, prefersReducedMotion } from './gsap'
import { useEnhance } from './useEnhance'

gsap.registerPlugin(Draggable)

/** Before/after slider (design/homeupgrades-home.html). Plain pointer + keyboard input everywhere; Draggable + Inertia
    (fling the handle and it glides) and a one-time swing on arrival that shows it can be dragged. Reduced motion: no
    inertia, no swing. */
export function BeforeAfter() {
  useEnhance((signal) => {
    const reduce = prefersReducedMotion()
    const ba = document.getElementById('ba')
    const handle = document.getElementById('baHandle')
    if (!ba || !handle) return
    // Snapshot what the script mutates, so cleanup restores the server-rendered state.
    const baStyle = ba.getAttribute('style')
    const baClass = ba.getAttribute('class')
    const now = handle.getAttribute('aria-valuenow')
    const text = handle.getAttribute('aria-valuetext')

    let pos = 50
    let hint: gsap.core.Timeline | null = null // the arrival swing; any user input cancels it
    const takeOver = () => {
      if (hint) {
        hint.kill()
        hint = null
      }
    }
    ba.addEventListener('pointerdown', takeOver, { capture: true, signal })
    handle.addEventListener('keydown', takeOver, { capture: true, signal })
    const set = (p: number) => {
      pos = Math.max(0, Math.min(100, p))
      ba.style.setProperty('--pos', pos + '%')
      handle.setAttribute('aria-valuenow', String(Math.round(pos)))
      handle.setAttribute('aria-valuetext', `${Math.round(pos)}% mid-build`)
    }
    const fromClientX = (x: number) => {
      const r = ba.getBoundingClientRect()
      return ((x - r.left) / r.width) * 100
    }

    handle.addEventListener(
      'keydown',
      (e) => {
        const step = (
          { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, PageDown: -20, PageUp: 20 } as Record<string, number>
        )[e.key]
        if (step !== undefined) {
          set(pos + step)
          e.preventDefault()
        }
        if (e.key === 'Home') {
          set(0)
          e.preventDefault()
        }
        if (e.key === 'End') {
          set(100)
          e.preventDefault()
        }
      },
      { signal },
    )

    if (!reduce) gsap.registerPlugin(InertiaPlugin)
    let drag: Draggable | undefined
    const ctx = gsap.context(() => {
      // Drag a hidden proxy; its x maps to the split position.
      const proxy = document.createElement('div')
      const width = () => ba.getBoundingClientRect().width
      drag = Draggable.create(proxy, {
        type: 'x',
        trigger: ba,
        inertia: !reduce,
        bounds: { minX: 0, maxX: width() },
        onPress(this: Draggable, e: PointerEvent) {
          gsap.killTweensOf(proxy)
          ba.classList.add('dragging')
          if (!handle.contains(e.target as Node)) {
            gsap.set(proxy, { x: (fromClientX(this.pointerX) / 100) * width() })
            this.update()
            set((this.x / width()) * 100)
          }
        },
        onDrag(this: Draggable) {
          set((this.x / width()) * 100)
        },
        onThrowUpdate(this: Draggable) {
          set((this.x / width()) * 100)
        },
        onRelease() {
          ba.classList.remove('dragging')
        },
        onThrowComplete() {
          ba.classList.remove('dragging')
        },
      })[0]
      const sync = () => {
        drag!.applyBounds({ minX: 0, maxX: width() })
        gsap.set(proxy, { x: (pos / 100) * width() })
        drag!.update()
      }
      handle.addEventListener('keydown', () => requestAnimationFrame(sync), { signal })
      addEventListener('resize', sync, { signal })
      sync()

      // One swing on arrival, so people see it moves
      if (!reduce) {
        const s = { p: 50 }
        hint = gsap
          .timeline({
            scrollTrigger: { trigger: ba, start: 'top 80%', once: true },
            delay: 0.6,
            onComplete: () => {
              hint = null
            },
          })
          .to(s, { p: 34, duration: 0.7, ease: 'power2.inOut', onUpdate: () => set(s.p) })
          .to(s, { p: 64, duration: 0.9, ease: 'power2.inOut', onUpdate: () => set(s.p) })
          .to(s, { p: 50, duration: 0.6, ease: 'power2.out', onUpdate: () => set(s.p), onComplete: sync })
      }
    }, ba)
    return () => {
      hint = null
      drag?.kill()
      ctx.revert()
      if (baClass === null) ba.removeAttribute('class')
      else ba.setAttribute('class', baClass)
      if (baStyle === null) ba.removeAttribute('style')
      else ba.setAttribute('style', baStyle)
      if (now !== null) handle.setAttribute('aria-valuenow', now)
      if (text !== null) handle.setAttribute('aria-valuetext', text)
    }
  })
  return null
}
